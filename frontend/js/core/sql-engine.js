'use strict';

/* ══════════════════════════════════════════════════════════
   SQL ENGINE (Advanced In-Browser)
══════════════════════════════════════════════════════════ */
function runSQL(query, schema, outerRow){
  try {
    if(typeof query!=='string')return {error:'Query must be a string.'};
    const normalized=normalizeDialectSQL(query).trim().replace(/;$/,'');
    if(!/^SELECT\b/i.test(normalized))return {error:'Only SELECT statements are allowed.'};

    const unionParts=splitTopLevelUnion(normalized);
    if(unionParts.length===1){
      return executeSelect(unionParts[0].query,schema,outerRow);
    }

    const combinedRows=[];
    let columns=[];
    let hasDistinctUnion=false;
    for(const part of unionParts){
      const res=executeSelect(part.query,schema,outerRow);
      if(res.error)return res;
      if(!columns.length)columns=[...res.columns];
      const rows=res.rows||[];
      if(part.unionType==='UNION')hasDistinctUnion=true;
      rows.forEach(r=>combinedRows.push(r));
    }

    const finalRows=hasDistinctUnion
      ? dedupeRows(combinedRows)
      : combinedRows;

    return {
      columns,
      rows:finalRows,
      rowCount:finalRows.length,
    };
  } catch(err){
    return {error:`Runtime error: ${err.message}`};
  }
}

function executeSelect(query,schema,outerRow){
  try {
    query=String(query||'').trim();
    if(!/^SELECT\b/i.test(query))return {error:'Only SELECT statements are allowed.'};

    const norm=query.replace(/\s+/g,' ');
    const fromInfo=parseFromClause(norm);
    let rows=[];
    if(fromInfo){
      const baseTable=resolveTable(schema,fromInfo.tableName);
      if(!baseTable)return {error:`Table '${fromInfo.tableName}' not found. Available: ${Object.keys(schema).join(', ')}`};

      rows=baseTable.map(r=>projectAliasedRow(r,fromInfo.alias));

      const joinSpecs=parseJoinClauses(norm);
      for(const joinSpec of joinSpecs){
        const joinTable=resolveTable(schema,joinSpec.tableName);
        if(!joinTable)return {error:`Table '${joinSpec.tableName}' not found.`};

        const joined=[];
        for(const leftRow of rows){
          let matched=false;
          for(const rawJoinRow of joinTable){
            const rightRow=projectAliasedRow(rawJoinRow,joinSpec.alias);
            const merged={...leftRow,...rightRow};
            const ok=evaluatePredicate(joinSpec.onCondition,merged,schema,outerRow);
            if(ok){
              matched=true;
              joined.push(merged);
            }
          }
          if(!matched&&joinSpec.type==='LEFT')joined.push(leftRow);
        }
        rows=joined;
      }
    } else {
      // Allow ANSI-style scalar SELECTs without FROM (e.g., SELECT 1, UNION chains).
      rows=[{}];
    }

    const whereClause=extractClause(norm,'WHERE',['GROUP BY','HAVING','ORDER BY','LIMIT']);
    if(whereClause)rows=rows.filter(r=>evaluatePredicate(whereClause,r,schema,outerRow));

    const selectClause=extractClause(norm,'SELECT',['FROM']);
    const selectRaw=(selectClause||'*').trim();
    const distinctMode=/^DISTINCT\b/i.test(selectRaw);
    const selectExprRaw=distinctMode
      ? selectRaw.replace(/^DISTINCT\s+/i,'').trim()
      : selectRaw;
    const selectItems=parseSelectItems(selectExprRaw);
    const hasAgg=selectItems.some(item=>/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i.test(String(item.expr||'').trim()));

    const groupClause=extractClause(norm,'GROUP BY',['HAVING','ORDER BY','LIMIT']);
    let grouped=false;

    if(groupClause){
      grouped=true;
      const groupExprs=splitCommaAware(groupClause).map(s=>s.trim()).filter(Boolean);
      const groups=new Map();
      for(const row of rows){
        const key=groupExprs.map(expr=>String(resolveExprValue(row,expr,schema,outerRow)??'NULL')).join('|||');
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(row);
      }

      const groupedRows=[];
      for(const [,bucket] of groups){
        const out={};
        for(const item of selectItems){
          out[item.alias]=evaluateSelectExpr(item.expr,bucket[0],bucket,schema,outerRow);
        }
        groupedRows.push(out);
      }
      rows=groupedRows;
    }
    else if(hasAgg){
      const aggregateRow={};
      for(const item of selectItems){
        aggregateRow[item.alias]=evaluateSelectExpr(item.expr,rows[0]||{},rows,schema,outerRow);
      }
      rows=[aggregateRow];
    }

    const havingClause=extractClause(norm,'HAVING',['ORDER BY','LIMIT']);
    if(havingClause){
      rows=rows.filter(r=>evaluatePredicate(havingClause,r,schema,outerRow));
    }

    const orderClause=extractClause(norm,'ORDER BY',['LIMIT']);
    if(orderClause){
      const orderParts=splitCommaAware(orderClause).map(s=>s.trim()).filter(Boolean);
      rows=[...rows].sort((a,b)=>{
        for(const part of orderParts){
          const [expr,...rest]=part.split(/\s+/);
          const dir=(rest[0]||'ASC').toUpperCase()==='DESC'?-1:1;
          const av=resolveExprValue(a,expr,schema,outerRow);
          const bv=resolveExprValue(b,expr,schema,outerRow);
          const cmp=compareValues(av,bv);
          if(cmp!==0)return cmp*dir;
        }
        return 0;
      });
    }

    const limitClause=extractClause(norm,'LIMIT',[]);
    if(limitClause){
      const m=limitClause.match(/^(\d+)(?:\s+OFFSET\s+(\d+))?$/i);
      if(m){
        const count=Number(m[1]);
        const off=Number(m[2]||0);
        rows=rows.slice(off,off+count);
      }
    }

    if(selectExprRaw!=='*'&&(!hasAgg||grouped)){
      const hasOnlyStar=selectItems.length===1&&selectItems[0].expr==='*';
      if(!hasOnlyStar){
        rows=rows.map(row=>{
          const out={};
          for(const item of selectItems){
            if(item.expr==='*')Object.assign(out,row);
            else if(row[item.alias]!==undefined)out[item.alias]=row[item.alias];
            else out[item.alias]=resolveExprValue(row,item.expr,schema,outerRow);
          }
          return out;
        });
      }
    }

    if(distinctMode){
      rows=dedupeRows(rows);
    }

    if(!rows.length)return {columns:[],rows:[],rowCount:0};
    const columns=Object.keys(rows[0]).filter(k=>!k.includes('.'));
    return {
      columns,
      rows:rows.map(r=>columns.map(c=>r[c]??null)),
      rowCount:rows.length,
    };
  } catch(err){
    return {error:`Runtime error: ${err.message}`};
  }
}

function splitTopLevelUnion(query){
  const parts=[];
  let depth=0;
  let quote='';
  let start=0;
  let pendingType='ROOT';

  for(let i=0;i<query.length;i++){
    const ch=query[i];
    if(quote){
      if(ch===quote&&query[i-1]!=='\\')quote='';
      continue;
    }
    if(ch==='\''||ch==='"'){quote=ch;continue;}
    if(ch==='('){depth++;continue;}
    if(ch===')'){depth=Math.max(0,depth-1);continue;}
    if(depth!==0)continue;

    const tail=query.slice(i).toUpperCase();
    if(tail.startsWith('UNION ALL ' )||tail==='UNION ALL'){
      const segment=query.slice(start,i).trim();
      if(segment)parts.push({query:segment,unionType:pendingType});
      pendingType='UNION ALL';
      i+=8;
      start=i+1;
      continue;
    }
    if(tail.startsWith('UNION ')||tail==='UNION'){
      const segment=query.slice(start,i).trim();
      if(segment)parts.push({query:segment,unionType:pendingType});
      pendingType='UNION';
      i+=4;
      start=i+1;
      continue;
    }
  }

  const last=query.slice(start).trim();
  if(last)parts.push({query:last,unionType:pendingType});
  return parts.length?parts:[{query:query.trim(),unionType:'ROOT'}];
}

function dedupeRows(rows){
  const seen=new Set();
  const out=[];
  for(const row of rows||[]){
    const key=JSON.stringify(row);
    if(seen.has(key))continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function parseFromClause(query){
  const from=extractClause(query,'FROM',['JOIN','WHERE','GROUP BY','HAVING','ORDER BY','LIMIT']);
  if(!from)return null;
  const m=from.match(/^"?([A-Za-z_][A-Za-z0-9_]*)"?(?:\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*))?/i);
  if(!m)return null;
  return {tableName:m[1],alias:m[2]||m[1]};
}

function parseJoinClauses(query){
  const specs=[];
  const re=/(?:\s|^)((?:INNER|LEFT|RIGHT)?\s*JOIN)\s+"?([A-Za-z_][A-Za-z0-9_]*)"?(?:\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*))?\s+ON\s+/ig;
  let m;
  while((m=re.exec(query))!==null){
    const typeToken=String(m[1]||'JOIN').toUpperCase();
    const type=typeToken.includes('LEFT')?'LEFT':'INNER';
    const tableName=m[2];
    const alias=m[3]||tableName;
    const condStart=re.lastIndex;
    const condEnd=findNextJoinOrClauseIndex(query,condStart);
    const onCondition=query.slice(condStart,condEnd).trim();
    re.lastIndex=condEnd;
    specs.push({type,tableName,alias,onCondition});
  }
  return specs;
}

function findNextJoinOrClauseIndex(query,start){
  const tail=query.slice(start);
  const m=tail.match(/\s(?:INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|JOIN|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/i);
  return m?start+m.index:query.length;
}

function extractClause(query,keyword,stoppers){
  const key=String(keyword||'').toUpperCase();
  const start=indexOfTopLevelKeyword(query,key,0);
  if(start<0)return '';
  let i=start+key.length;
  while(i<query.length&&/\s/.test(query[i]))i++;

  let end=query.length;
  const candidates=[...stoppers];
  for(const stop of candidates){
    const stopIdx=indexOfTopLevelKeyword(query,String(stop||'').toUpperCase(),i);
    if(stopIdx>=0&&stopIdx<end)end=stopIdx;
  }

  return query.slice(i,end).trim();
}

function indexOfTopLevelKeyword(input,keyword,fromIdx){
  const source=String(input||'');
  const upper=source.toUpperCase();
  const key=String(keyword||'').trim().toUpperCase();
  if(!key)return -1;

  let depth=0;
  let quote='';
  const start=Math.max(0,Number(fromIdx)||0);
  for(let i=start;i<=upper.length-key.length;i++){
    const ch=source[i];
    if(quote){
      if(ch===quote&&source[i-1]!=='\\')quote='';
      continue;
    }
    if(ch==='\''||ch==='"'){quote=ch;continue;}
    if(ch==='('){depth++;continue;}
    if(ch===')'){depth=Math.max(0,depth-1);continue;}
    if(depth!==0)continue;
    if(!upper.startsWith(key,i))continue;

    const prev=i===0?' ':upper[i-1];
    const next=i+key.length>=upper.length?' ':upper[i+key.length];
    const prevOk=!/[A-Z0-9_]/.test(prev);
    const nextOk=!/[A-Z0-9_]/.test(next);
    if(prevOk&&nextOk)return i;
  }

  return -1;
}

function resolveTable(schema,name){
  if(!schema)return null;
  if(String(name).toLowerCase()==='dual')return [{}];
  return schema[name]||schema[String(name).toLowerCase()]||null;
}

function projectAliasedRow(raw,alias){
  const out={};
  Object.entries(raw||{}).forEach(([k,v])=>{
    out[k]=v;
    out[`${alias}.${k}`]=v;
    out[`${alias}_${k}`]=v;
  });
  return out;
}

function normalizeDialectSQL(q){
  return String(q||'')
    .replace(/\bFETCH\s+FIRST\s+(\d+)\s+ROWS\s+ONLY\b/ig,'LIMIT $1')
    .replace(/\bFETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY\b/ig,'LIMIT $1')
    .replace(/\bNVL\s*\(/ig,'COALESCE(')
    .replace(/\bIFNULL\s*\(/ig,'COALESCE(');
}

function parseSelectItems(sr){
  return splitCommaAware(String(sr||'')).map(part=>{
    const p=part.trim();
    const asMatch=p.match(/^(.*?)(?:\s+AS\s+)([A-Za-z_][A-Za-z0-9_]*)$/i);
    if(asMatch)return {expr:asMatch[1].trim(),alias:asMatch[2].trim()};

    const bare=p.match(/^(.*?)(?:\s+)([A-Za-z_][A-Za-z0-9_]*)$/);
    if(bare&&!/[()]/.test(bare[2]))return {expr:bare[1].trim(),alias:bare[2].trim()};

    const idExpr=p.match(/^(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)$/);
    if(idExpr)return {expr:p,alias:idExpr[1]};

    return {expr:p,alias:p};
  });
}

function splitCommaAware(input){
  const out=[];
  let cur='';
  let depth=0;
  let quote='';
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(quote){
      cur+=ch;
      if(ch===quote&&input[i-1]!=='\\')quote='';
      continue;
    }
    if(ch==="'"||ch==='"'){quote=ch;cur+=ch;continue;}
    if(ch==='('){depth++;cur+=ch;continue;}
    if(ch===')'){depth=Math.max(0,depth-1);cur+=ch;continue;}
    if(ch===','&&depth===0){out.push(cur.trim());cur='';continue;}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}

function compareValues(a,b){
  if(a==null&&b==null)return 0;
  if(a==null)return -1;
  if(b==null)return 1;
  const an=Number(a),bn=Number(b);
  if(Number.isFinite(an)&&Number.isFinite(bn))return an-bn;
  return String(a).localeCompare(String(b));
}

function rc(row,expr){
  if(!row||!expr)return undefined;
  const key=String(expr).trim().replace(/^"|"$/g,'');
  const isQualified=key.includes('.');
  if(row[key]!==undefined)return row[key];
  const keyLc=key.toLowerCase();
  for(const k of Object.keys(row)){
    const kl=k.toLowerCase();
    if(kl===keyLc)return row[k];
  }
  if(isQualified)return undefined;

  const short=key.split('.').pop();
  if(row[short]!==undefined)return row[short];
  const shortLc=short.toLowerCase();
  for(const k of Object.keys(row)){
    if(k.toLowerCase()===shortLc)return row[k];
  }
  return undefined;
}

function parseWhereLiteral(raw){
  const v=String(raw||'').trim();
  if(/^'.*'$/.test(v)||/^".*"$/.test(v))return v.slice(1,-1);
  if(/^null$/i.test(v))return null;
  if(/^true$/i.test(v))return true;
  if(/^false$/i.test(v))return false;
  const n=Number(v);
  return Number.isFinite(n)?n:v;
}

function resolveExprCore(row,expr,schema,outerRow){
  const e=String(expr||'').trim();
  if(!e)return undefined;

  const correlatedScope=row?{...(outerRow||{}),...row}:(outerRow||{});

  const scalarQueryCandidate=trimOuterParens(e);
  if(/^SELECT\b/i.test(scalarQueryCandidate)){
    const subRes=runSQL(scalarQueryCandidate,schema||{},correlatedScope);
    if(subRes&&Array.isArray(subRes.rows)&&subRes.rows.length&&Array.isArray(subRes.rows[0])){
      return subRes.rows[0][0];
    }
    return null;
  }

  const caseVal=evaluateCaseExpression(e,row,schema,outerRow);
  if(caseVal!==undefined)return caseVal;

  const fnVal=evaluateBuiltinFunction(e,row,schema,outerRow);
  if(fnVal!==undefined)return fnVal;

  const direct=rc(row,e);
  if(direct!==undefined)return direct;

  const outerDirect=rc(outerRow,e);
  if(outerDirect!==undefined)return outerDirect;

  if(/^'.*'$/.test(e)||/^".*"$/.test(e))return e.slice(1,-1);
  if(/^[-+]?\d+(?:\.\d+)?$/.test(e))return Number(e);

  return undefined;
}

function evaluateArithmeticExpression(expr,row,schema,outerRow){
  const source=trimOuterParens(String(expr||'').trim());
  if(!source)return undefined;
  if(!/[+\-*/]/.test(source))return undefined;

  function isUnaryAt(input,idx){
    let j=idx-1;
    while(j>=0&&/\s/.test(input[j]))j--;
    if(j<0)return true;
    return /[+\-*/(]/.test(input[j]);
  }

  function findTopLevelOp(input,ops){
    let depth=0;
    let quote='';
    let found=-1;
    for(let i=0;i<input.length;i++){
      const ch=input[i];
      if(quote){
        if(ch===quote&&input[i-1]!=='\\')quote='';
        continue;
      }
      if(ch==='\''||ch==='"'){quote=ch;continue;}
      if(ch==='('){depth++;continue;}
      if(ch===')'){depth=Math.max(0,depth-1);continue;}
      if(depth!==0)continue;
      if(!ops.includes(ch))continue;
      if((ch==='+'||ch==='-')&&isUnaryAt(input,i))continue;
      found=i;
    }
    return found;
  }

  function parseEval(input){
    const s=trimOuterParens(String(input||'').trim());
    if(!s)return undefined;

    let idx=findTopLevelOp(s,['+','-']);
    if(idx>=0){
      const left=parseEval(s.slice(0,idx));
      const right=parseEval(s.slice(idx+1));
      if(left===undefined||right===undefined)return undefined;
      if(s[idx]==='+')return left+right;
      return left-right;
    }

    idx=findTopLevelOp(s,['*','/']);
    if(idx>=0){
      const left=parseEval(s.slice(0,idx));
      const right=parseEval(s.slice(idx+1));
      if(left===undefined||right===undefined)return undefined;
      if(s[idx]==='*')return left*right;
      return right===0?null:left/right;
    }

    if((s[0]==='+'||s[0]==='-')&&/^[+\-]/.test(s)){
      const inner=parseEval(s.slice(1));
      if(inner===undefined||inner===null)return inner;
      return s[0]==='-'?-inner:inner;
    }

    const leaf=resolveExprCore(row,s,schema,outerRow);
    if(leaf===undefined||leaf===null)return leaf;
    const n=Number(leaf);
    return Number.isFinite(n)?n:undefined;
  }

  return parseEval(source);
}

function resolveExprValue(row,expr,schema,outerRow){
  const e=String(expr||'').trim();
  if(!e)return undefined;

  const core=resolveExprCore(row,e,schema,outerRow);
  if(core!==undefined)return core;

  const arithmetic=evaluateArithmeticExpression(e,row,schema,outerRow);
  if(arithmetic!==undefined)return arithmetic;

  return undefined;
}

function evaluateBuiltinFunction(expr,row,schema,outerRow){
  const m=expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/);
  if(!m)return undefined;
  const fn=m[1].toUpperCase();
  const args=splitCommaAware(m[2]).map(a=>resolveExprValue(row,a,schema,outerRow));

  if(fn==='LEAST')return args.length?args.reduce((a,b)=>compareValues(a,b)<=0?a:b):undefined;
  if(fn==='GREATEST')return args.length?args.reduce((a,b)=>compareValues(a,b)>=0?a:b):undefined;
  if(fn==='COALESCE')return args.find(v=>v!=null);
  if(fn==='LOWER')return args[0]==null?null:String(args[0]).toLowerCase();
  if(fn==='UPPER')return args[0]==null?null:String(args[0]).toUpperCase();
  if(fn==='ABS')return args[0]==null?null:Math.abs(Number(args[0]));
  if(fn==='ROUND'){
    const n=Number(args[0]);
    const d=args[1]==null?0:Number(args[1]);
    if(!Number.isFinite(n)||!Number.isFinite(d))return null;
    const p=Math.pow(10,d);
    return Math.round(n*p)/p;
  }
  if(fn==='LENGTH')return args[0]==null?null:String(args[0]).length;

  return undefined;
}

function evaluateCaseExpression(expr,row,schema,outerRow){
  const m=expr.match(/^CASE\s+(.+)\s+END$/i);
  if(!m)return undefined;
  const body=m[1];
  const whenParts=[];
  const whenRe=/WHEN\s+(.+?)\s+THEN\s+(.+?)(?=\s+WHEN\s+|\s+ELSE\s+|$)/ig;
  let wm;
  while((wm=whenRe.exec(body))!==null){
    whenParts.push({cond:wm[1].trim(),val:wm[2].trim()});
  }
  const elseM=body.match(/\sELSE\s+(.+)$/i);
  for(const w of whenParts){
    if(evaluatePredicate(w.cond,row,schema,outerRow))return resolveExprValue(row,w.val,schema,outerRow);
  }
  if(elseM)return resolveExprValue(row,elseM[1].trim(),schema,outerRow);
  return null;
}

function evaluateSelectExpr(expr,row,bucketRows,schema,outerRow){
  const em=expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);
  if(!em)return resolveExprValue(row,expr,schema,outerRow);

  const fn=em[1].toUpperCase();
  const col=em[2].trim();
  const vals=(bucketRows||[]).map(r=>col==='*'?1:Number(resolveExprValue(r,col,schema,outerRow))).filter(v=>Number.isFinite(v));

  if(fn==='COUNT')return col==='*'?(bucketRows||[]).length:vals.length;
  if(fn==='SUM')return vals.reduce((a,b)=>a+b,0);
  if(fn==='AVG')return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
  if(fn==='MIN')return vals.length?Math.min(...vals):null;
  if(fn==='MAX')return vals.length?Math.max(...vals):null;
  return null;
}

function evaluatePredicate(where,row,schema,outerRow){
  const text=trimOuterParens(String(where||'').trim());
  if(!text)return true;

  const orParts=splitLogicalTopLevel(text,'OR');
  if(orParts.length>1)return orParts.some(part=>evaluatePredicate(part,row,schema,outerRow));

  const andParts=splitLogicalTopLevel(text,'AND');
  if(andParts.length>1)return andParts.every(part=>evaluatePredicate(part,row,schema,outerRow));

  if(/^NOT\s+/i.test(text))return !evaluatePredicate(text.replace(/^NOT\s+/i,''),row,schema,outerRow);
  return evaluateAtom(text,row,schema,outerRow);
}

function trimOuterParens(input){
  let s=String(input||'').trim();
  while(s.startsWith('(')&&s.endsWith(')')){
    let depth=0;
    let quote='';
    let wraps=true;
    for(let i=0;i<s.length;i++){
      const ch=s[i];
      if(quote){if(ch===quote&&s[i-1]!=='\\')quote='';continue;}
      if(ch==='\''||ch==='"'){quote=ch;continue;}
      if(ch==='(')depth++;
      else if(ch===')')depth--;
      if(depth===0&&i<s.length-1){wraps=false;break;}
    }
    if(!wraps)break;
    s=s.slice(1,-1).trim();
  }
  return s;
}

function splitLogicalTopLevel(input,op){
  const out=[];
  const token=` ${String(op||'').toUpperCase()} `;
  let depth=0;
  let quote='';
  let start=0;
  const s=` ${String(input||'').trim()} `;

  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(quote){if(ch===quote&&s[i-1]!=='\\')quote='';continue;}
    if(ch==='\''||ch==='"'){quote=ch;continue;}
    if(ch==='('){depth++;continue;}
    if(ch===')'){depth=Math.max(0,depth-1);continue;}
    if(depth!==0)continue;
    if(s.slice(i,i+token.length).toUpperCase()===token){
      const part=s.slice(start,i).trim();
      if(part)out.push(part);
      start=i+token.length;
      i+=token.length-1;
    }
  }
  const last=s.slice(start).trim();
  if(last)out.push(last);
  return out;
}

function parseTopLevelComparison(input){
  const s=String(input||'').trim();
  const ops=['<=','>=','<>','!=','=','<','>'];
  let depth=0;
  let quote='';

  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(quote){
      if(ch===quote&&s[i-1]!=='\\')quote='';
      continue;
    }
    if(ch==='\''||ch==='"'){quote=ch;continue;}
    if(ch==='('){depth++;continue;}
    if(ch===')'){depth=Math.max(0,depth-1);continue;}
    if(depth!==0)continue;

    for(const op of ops){
      if(s.slice(i,i+op.length)===op){
        const left=s.slice(0,i).trim();
        const right=s.slice(i+op.length).trim();
        if(left&&right)return {left,op,right};
      }
    }
  }

  return null;
}

function getWhereValues(rhs,schema,correlatedScope){
  let vals=[];
  if(/^SELECT\b/i.test(String(rhs||'').trim())){
    const sub=runSQL(rhs,schema||{},correlatedScope);
    if(sub&&Array.isArray(sub.rows)&&sub.rows.length){
      vals=sub.rows.map(r=>Array.isArray(r)?r[0]:undefined);
    }
  } else {
    vals=splitCommaAware(String(rhs||'')).map(parseWhereLiteral);
  }
  return vals;
}

function evaluateAtom(atom,row,schema,outerRow){
  atom=trimOuterParens(String(atom||'').trim());
  const correlatedScope=row?{...(outerRow||{}),...row}:(outerRow||{});

  let m=atom.match(/^NOT\s+EXISTS\s*\((SELECT[\s\S]+)\)$/i);
  if(m){
    const sub=runSQL(m[1],schema||{},correlatedScope);
    return !sub.error&&Array.isArray(sub.rows)&&sub.rows.length===0;
  }

  m=atom.match(/^EXISTS\s*\((SELECT[\s\S]+)\)$/i);
  if(m){
    const sub=runSQL(m[1],schema||{},correlatedScope);
    return !sub.error&&Array.isArray(sub.rows)&&sub.rows.length>0;
  }

  m=atom.match(/^(.+?)\s+NOT\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
  if(m){
    const lv=resolveExprValue(row,m[1],schema,outerRow);
    const lo=resolveExprValue(row,m[2],schema,outerRow);
    const hi=resolveExprValue(row,m[3],schema,outerRow);
    return compareValues(lv,lo)<0||compareValues(lv,hi)>0;
  }

  m=atom.match(/^(.+?)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
  if(m){
    const lv=resolveExprValue(row,m[1],schema,outerRow);
    const lo=resolveExprValue(row,m[2],schema,outerRow);
    const hi=resolveExprValue(row,m[3],schema,outerRow);
    return compareValues(lv,lo)>=0&&compareValues(lv,hi)<=0;
  }

  m=atom.match(/^(.+?)\s+NOT\s+IN\s*\((.*)\)$/i);
  if(m){
    const lv=resolveExprValue(row,m[1],schema,outerRow);
    const rhs=String(m[2]||'').trim();
    const vals=getWhereValues(rhs,schema,correlatedScope);
    return !vals.some(v=>String(v)===String(lv));
  }

  m=atom.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i);
  if(m)return resolveExprValue(row,m[1],schema,outerRow)!=null;

  m=atom.match(/^(.+?)\s+IS\s+NULL$/i);
  if(m)return resolveExprValue(row,m[1],schema,outerRow)==null;

  m=atom.match(/^(.+?)\s+IN\s*\((.*)\)$/i);
  if(m){
    const lv=resolveExprValue(row,m[1],schema,outerRow);
    const rhs=String(m[2]||'').trim();
    const vals=getWhereValues(rhs,schema,correlatedScope);
    return vals.some(v=>String(v)===String(lv));
  }

  m=atom.match(/^(.+?)\s+LIKE\s+(.+)$/i);
  if(m){
    const lv=String(resolveExprValue(row,m[1],schema,outerRow)??'');
    const raw=parseWhereLiteral(m[2]);
    const pat=String(raw)
      .replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
      .replace(/%/g,'.*')
      .replace(/_/g,'.');
    return new RegExp(`^${pat}$`,'i').test(lv);
  }

  const cmp=parseTopLevelComparison(atom);
  if(cmp){
    const lvRaw=resolveExprValue(row,cmp.left,schema,outerRow);
    const rvResolved=resolveExprValue(row,cmp.right,schema,outerRow);
    const rv=rvResolved===undefined?parseWhereLiteral(cmp.right):rvResolved;

    const ln=Number(lvRaw);
    const rn=Number(rv);
    const useNum=Number.isFinite(ln)&&Number.isFinite(rn);
    const l=useNum?ln:String(lvRaw??'');
    const r=useNum?rn:String(rv??'');

    if(cmp.op==='=')return l==r;
    if(cmp.op==='!='||cmp.op==='<>')return l!=r;
    if(cmp.op==='<')return l<r;
    if(cmp.op==='>')return l>r;
    if(cmp.op==='<=')return l<=r;
    if(cmp.op==='>=')return l>=r;
  }

  return false;
}
