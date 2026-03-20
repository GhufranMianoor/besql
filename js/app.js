'use strict';
/* ══════════════════════════════════════════════════════════
   SQL ENGINE
══════════════════════════════════════════════════════════ */
function runSQL(q, schema) {
  try {
    q = normalizeDialectSQL(q);
    q = q.trim().replace(/\s+/g,' ').replace(/;$/,'');
    if (!/^SELECT/i.test(q)) return {error:'Only SELECT statements are allowed.'};
    const fromM = q.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/i);
    if (!fromM) return {error:'Missing FROM clause.'};
    const tname=fromM[1], talias=fromM[2]||fromM[1];
    const base=(tname.toLowerCase()==='dual')?[{}]:(schema[tname]||schema[tname.toLowerCase()]);
    if (!base) return {error:`Table '${tname}' not found. Available: ${Object.keys(schema).join(', ')}`};
    let rows=base.map(r=>{const o={};Object.entries(r).forEach(([k,v])=>{o[k]=v;o[`${talias}.${k}`]=v;});return o;});
    // JOINs
    const jre=/(?:(?:INNER|LEFT|RIGHT)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([^\s]+)\s*=\s*([^\s]+)/gi;
    let jm;
    while((jm=jre.exec(q))!==null){
      const jtn=jm[1],ja=jm[2]||jm[1],jt=schema[jtn]||schema[jtn.toLowerCase()];
      if(!jt) return {error:`Table '${jtn}' not found.`};
      const joined=[];
      for(const row of rows){let matched=false;for(const jr of jt){const jr2={};Object.entries(jr).forEach(([k,v])=>{jr2[`${ja}.${k}`]=v;jr2[`${ja}_${k}`]=v;});const lv=rc(row,jm[3]),rv=rc(jr2,jm[4])??jr[jm[4].split('.')[1]];if(lv==rv){joined.push({...row,...jr2});matched=true;}}if(!matched&&/LEFT/i.test(jm[0]))joined.push(row);}
      rows=joined;
    }
    // WHERE
    const wm=q.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if(wm) rows=rows.filter(r=>ew(wm[1].trim(),r));
    // SELECT
    const sr=(q.match(/SELECT\s+(.*?)\s+FROM/i)?.[1]||'*').trim();
    const ha=/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(sr);
    // GROUP BY
    const gm=q.match(/GROUP\s+BY\s+(.*?)(?:\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    let grouped=false;
    if(gm){grouped=true;const gc=gm[1].split(',').map(s=>s.trim());const groups=new Map();for(const r of rows){const k=gc.map(c=>rc(r,c)??'').join('|||');if(!groups.has(k))groups.set(k,{rows:[],first:r});groups.get(k).rows.push(r);}rows=[];for(const[,g]of groups){const ar={...g.first};for(const{expr,alias}of psp(sr)){const am=expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);if(am){const fn=am[1].toUpperCase(),col=am[2].trim(),vals=g.rows.map(r=>col==='*'?1:parseFloat(rc(r,col))).filter(v=>!isNaN(v));if(fn==='COUNT')ar[alias]=g.rows.length;else if(fn==='SUM')ar[alias]=r2(vals.reduce((a,b)=>a+b,0));else if(fn==='AVG')ar[alias]=vals.length?r2(vals.reduce((a,b)=>a+b,0)/vals.length):0;else if(fn==='MIN')ar[alias]=vals.length?Math.min(...vals):null;else if(fn==='MAX')ar[alias]=vals.length?Math.max(...vals):null;}}rows.push(ar);}}
    else if(ha){const ar={};for(const{expr,alias}of psp(sr)){const am=expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);if(am){const fn=am[1].toUpperCase(),col=am[2].trim(),vals=rows.map(r=>col==='*'?1:parseFloat(rc(r,col))).filter(v=>!isNaN(v));if(fn==='COUNT')ar[alias]=rows.length;else if(fn==='SUM')ar[alias]=r2(vals.reduce((a,b)=>a+b,0));else if(fn==='AVG')ar[alias]=vals.length?r2(vals.reduce((a,b)=>a+b,0)/vals.length):0;else if(fn==='MIN')ar[alias]=vals.length?Math.min(...vals):null;else if(fn==='MAX')ar[alias]=vals.length?Math.max(...vals):null;}else ar[alias]=rc(rows[0]||{},expr);}rows=[ar];}
    // HAVING
    const hm=q.match(/HAVING\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if(hm){
      // Build map of aggregate expressions to their aliases from SELECT
      const aggMap={};
      for(const{expr,alias}of psp(sr)){
        const normExpr=expr.replace(/\s+/g,'').toUpperCase();
        aggMap[normExpr]=alias;
      }
      const havingCond=hm[1].trim();
      rows=rows.filter(r=>{
        let cond=havingCond;
        // Replace aggregate function calls with their SELECT aliases so ew() can read from row values.
        const aggRegex=/(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)/gi;
        cond=cond.replace(aggRegex,(match,fn,col)=>{
          const normalized=match.replace(/\s+/g,'').toUpperCase();
          const alias=aggMap[normalized];
          if(alias && r[alias]!==undefined){
            return alias;
          }
          // Fallback: return match if not found
          return match;
        });
        return ew(cond,r);
      });
    }
    // ORDER BY
    const om=q.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/i);
    if(om){const pts=om[1].split(',').map(s=>s.trim());rows=[...rows].sort((a,b)=>{for(const p of pts){const[col,dir]=p.split(/\s+/);const av=rc(a,col),bv=rc(b,col);const cmp=av==null?-1:bv==null?1:typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv));if(cmp!==0)return(dir?.toUpperCase()==='DESC'?-1:1)*cmp;}return 0;});}
    // LIMIT
    const lm=q.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if(lm){const off=parseInt(lm[2]||0);rows=rows.slice(off,off+parseInt(lm[1]));}
    // Final SELECT columns
    if(sr!=='*'&&(!ha||grouped)){const pts=psp(sr);if(!(pts.length===1&&pts[0].expr==='*')){rows=rows.map(r=>{const o={};for(const{expr,alias}of pts){if(expr==='*')Object.assign(o,r);else o[alias]=r[alias]??rc(r,expr);}return o;});}}
    if(!rows.length) return {columns:[],rows:[],rowCount:0};
    const columns=Object.keys(rows[0]).filter(k=>!k.includes('.'));
    return {columns,rows:rows.map(r=>columns.map(c=>r[c]??null)),rowCount:rows.length};
  } catch(e){return {error:`Runtime error: ${e.message}`};}
}
function normalizeDialectSQL(q){
  if(typeof q!=='string') return '';
  return q
    // Oracle pagination syntax support.
    .replace(/\bFETCH\s+FIRST\s+(\d+)\s+ROWS\s+ONLY\b/ig,'LIMIT $1')
    .replace(/\bFETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY\b/ig,'LIMIT $1');
}
function rc(row,expr){
  if(!row||!expr)return undefined;
  expr=String(expr).trim().replace(/^"|"$/g,'');
  if(row[expr]!==undefined)return row[expr];
  const short=expr.split('.').pop();
  if(row[short]!==undefined)return row[short];
  const exprLC=expr.toLowerCase();
  const shortLC=short.toLowerCase();
  for(const k of Object.keys(row)){
    if(k.toLowerCase()===exprLC||k.toLowerCase()===shortLC)return row[k];
  }
  return undefined;
}
function r2(n){return Math.round(n*100)/100;}
function psp(raw){const parts=[];let depth=0,cur='';for(const ch of raw+','){if(ch==='('){depth++;cur+=ch;}else if(ch===')'){depth--;cur+=ch;}else if(ch===','&&depth===0){const s=cur.trim();cur='';const am=s.match(/^(.+?)\s+AS\s+(\w+)$/i);if(am)parts.push({expr:am[1].trim(),alias:am[2]});else{const bare=s.split('.').pop();parts.push({expr:s,alias:bare||s});}}else cur+=ch;}return parts;}
function ew(cond,row){const op=stl(cond,/\bOR\b/i);if(op.length>1)return op.some(p=>ew(p.trim(),row));const ap=stl(cond,/\bAND\b/i);if(ap.length>1)return ap.every(p=>ew(p.trim(),row));if(/^NOT\s+/i.test(cond))return !ew(cond.replace(/^NOT\s+/i,'').trim(),row);if(/IS\s+NOT\s+NULL/i.test(cond)){const c=cond.match(/^([^\s]+)/)[1];return rc(row,c)!=null;}if(/IS\s+NULL/i.test(cond)){const c=cond.match(/^([^\s]+)/)[1];return rc(row,c)==null;}const bt=cond.match(/^([^\s]+)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);if(bt){const v=parseFloat(rc(row,bt[1]));return v>=parseFloat(bt[2])&&v<=parseFloat(bt[3]);}const im=cond.match(/^([^\s]+)\s+(NOT\s+)?IN\s*\(([^)]+)\)/i);if(im){const vals=im[3].split(',').map(s=>s.trim().replace(/^['"`]|['"`]$/g,''));const v=String(rc(row,im[1])??'');const found=vals.some(x=>x===v||x.toLowerCase()===v.toLowerCase());return im[2]?!found:found;}const m=cond.match(/^([^\s<>=!]+)\s*(>=|<=|!=|<>|>|<|=|(?:NOT\s+)?LIKE)/i);if(!m)return true;const col=m[1],op2=m[2].toUpperCase().replace(/\s+/,' '),rv2=cond.slice(m[0].length).trim().replace(/^['"`]|['"`]$/g,'');const rv=rc(row,col),nrv=parseFloat(rv),nv=parseFloat(rv2);if(op2==='=')return String(rv).toLowerCase()===rv2.toLowerCase()||(!isNaN(nrv)&&!isNaN(nv)&&nrv===nv);if(op2==='!='||op2==='<>')return String(rv).toLowerCase()!==rv2.toLowerCase();if(op2==='>') return nrv>nv;if(op2==='<') return nrv<nv;if(op2==='>=')return nrv>=nv;if(op2==='<=')return nrv<=nv;if(op2==='LIKE')return new RegExp('^'+rv2.replace(/%/g,'.*').replace(/_/g,'.')+'$','i').test(String(rv??''));if(op2==='NOT LIKE')return !new RegExp('^'+rv2.replace(/%/g,'.*').replace(/_/g,'.')+'$','i').test(String(rv??''));return true;}
function stl(str,re){const parts=[];let cur='';const tokens=str.split(/(\s+(?:AND|OR)\s+)/i);for(const t of tokens){if(re.test(t.trim())){parts.push(cur.trim());cur='';}else cur+=t;}if(cur.trim())parts.push(cur.trim());return parts.length>1?parts:[str];}

/* ══════════════════════════════════════════════════════════
   DATABASE / SCHEMA
══════════════════════════════════════════════════════════ */
const DB = {
  employees:[
    {id:1,name:"Alice Chen",dept_id:1,salary:95000,hire_year:2019,age:32,level:"Senior"},
    {id:2,name:"Bob Martin",dept_id:2,salary:72000,hire_year:2020,age:28,level:"Junior"},
    {id:3,name:"Carol White",dept_id:1,salary:110000,hire_year:2017,age:41,level:"Staff"},
    {id:4,name:"David Lee",dept_id:3,salary:88000,hire_year:2021,age:35,level:"Mid"},
    {id:5,name:"Eva Ramos",dept_id:2,salary:67000,hire_year:2022,age:26,level:"Junior"},
    {id:6,name:"Frank Kim",dept_id:3,salary:105000,hire_year:2018,age:39,level:"Senior"},
    {id:7,name:"Grace Park",dept_id:1,salary:99000,hire_year:2020,age:33,level:"Senior"},
    {id:8,name:"Henry Zhao",dept_id:4,salary:115000,hire_year:2016,age:44,level:"Staff"},
    {id:9,name:"Iris Novak",dept_id:4,salary:78000,hire_year:2023,age:29,level:"Mid"},
    {id:10,name:"Jake Torres",dept_id:2,salary:82000,hire_year:2019,age:31,level:"Mid"},
  ],
  departments:[
    {id:1,name:"Engineering",budget:500000,location:"San Francisco",headcount:3},
    {id:2,name:"Marketing",budget:200000,location:"New York",headcount:3},
    {id:3,name:"Finance",budget:300000,location:"Chicago",headcount:2},
    {id:4,name:"Executive",budget:800000,location:"San Francisco",headcount:2},
  ],
  orders:[
    {id:1,customer:"TechCorp",product_id:1,amount:12500,status:"delivered",month:"Jan"},
    {id:2,customer:"MegaRetail",product_id:2,amount:8300,status:"pending",month:"Feb"},
    {id:3,customer:"TechCorp",product_id:1,amount:5700,status:"delivered",month:"Feb"},
    {id:4,customer:"StartupXYZ",product_id:3,amount:2100,status:"cancelled",month:"Feb"},
    {id:5,customer:"MegaRetail",product_id:2,amount:19800,status:"delivered",month:"Mar"},
    {id:6,customer:"GlobalCo",product_id:1,amount:31000,status:"delivered",month:"Mar"},
    {id:7,customer:"TechCorp",product_id:3,amount:4200,status:"pending",month:"Mar"},
    {id:8,customer:"StartupXYZ",product_id:2,amount:9900,status:"delivered",month:"Apr"},
    {id:9,customer:"GlobalCo",product_id:1,amount:15600,status:"delivered",month:"Apr"},
    {id:10,customer:"NewCo",product_id:3,amount:7200,status:"pending",month:"Apr"},
  ],
  products:[
    {id:1,name:"Enterprise Suite",category:"Software",price:15000,stock:999},
    {id:2,name:"Analytics Pro",category:"Software",price:8000,stock:999},
    {id:3,name:"Consulting Pack",category:"Services",price:5000,stock:50},
  ],
  students:[
    {id:1,name:"Ahmed Ali",grade:85,course_id:1,year:2022,gpa:3.5},
    {id:2,name:"Sara Khan",grade:92,course_id:2,year:2021,gpa:3.8},
    {id:3,name:"Omar Raza",grade:78,course_id:1,year:2023,gpa:3.2},
    {id:4,name:"Fatima Malik",grade:95,course_id:3,year:2022,gpa:3.9},
    {id:5,name:"Bilal Hassan",grade:68,course_id:2,year:2023,gpa:2.9},
    {id:6,name:"Zara Sheikh",grade:88,course_id:3,year:2021,gpa:3.6},
  ],
  courses:[
    {id:1,name:"Database Systems",credits:3,instructor:"Dr. Smith",dept:"CS"},
    {id:2,name:"Data Structures",credits:3,instructor:"Dr. Jones",dept:"CS"},
    {id:3,name:"Machine Learning",credits:4,instructor:"Dr. Ahmed",dept:"AI"},
  ],
  citizenmentalhealth:[
    {citizen_id:1,citizen_name:'Vex',sector:'Alpha',stability_rating:4.2,last_checkup:'2901-01-01'},
    {citizen_id:2,citizen_name:'Nova',sector:'Beta',stability_rating:1.5,last_checkup:'2901-01-01'},
    {citizen_id:3,citizen_name:'Echo',sector:'Gamma',stability_rating:2.0,last_checkup:'2901-01-02'},
    {citizen_id:4,citizen_name:'Ryn',sector:'Delta',stability_rating:0.8,last_checkup:'2901-01-02'},
    {citizen_id:5,citizen_name:'Zara',sector:'Alpha',stability_rating:3.7,last_checkup:'2901-01-03'},
    {citizen_id:6,citizen_name:'Marcus',sector:'Beta',stability_rating:1.9,last_checkup:'2901-01-03'},
  ],
  operativeprofiles:[
    {operative_id:1,operative_name:'Zara',clearance_level:'Alpha',organizations_count:3,recruitment_date:'2900-01-01'},
    {operative_id:2,operative_name:'Marcus',clearance_level:'Beta',organizations_count:2,recruitment_date:'2900-06-15'},
    {operative_id:3,operative_name:'Nova',clearance_level:'Alpha',organizations_count:1,recruitment_date:'2901-01-01'},
    {operative_id:4,operative_name:'Ryn',clearance_level:'Alpha',organizations_count:2,recruitment_date:'2900-03-20'},
    {operative_id:5,operative_name:'Echo',clearance_level:'Gamma',organizations_count:4,recruitment_date:'2899-11-10'},
    {operative_id:6,operative_name:'Vex',clearance_level:'Alpha',organizations_count:1,recruitment_date:'2901-02-01'},
  ],
  agentrecords:[
    {record_id:1,agent_name:'Zara',division_name:'Recon',entry_date:'2901-01-01'},
    {record_id:2,agent_name:'Zara',division_name:'Recon',entry_date:'2901-01-05'},
    {record_id:3,agent_name:'Marcus',division_name:'Intel',entry_date:'2901-01-02'},
    {record_id:4,agent_name:'Nova',division_name:'Field',entry_date:'2901-01-03'},
    {record_id:5,agent_name:'Zara',division_name:'Intel',entry_date:'2901-01-04'},
    {record_id:6,agent_name:'Nova',division_name:'Field',entry_date:'2901-01-06'},
    {record_id:7,agent_name:'Nova',division_name:'Field',entry_date:'2901-01-07'},
  ],
  creditledger:[
    {txn_id:1,account_id:101,credits:100,txn_date:'2901-01-01'},
    {txn_id:2,account_id:101,credits:200,txn_date:'2901-01-02'},
    {txn_id:3,account_id:102,credits:150,txn_date:'2901-01-01'},
    {txn_id:4,account_id:101,credits:400,txn_date:'2901-01-03'},
    {txn_id:5,account_id:102,credits:300,txn_date:'2901-01-04'},
    {txn_id:6,account_id:103,credits:500,txn_date:'2901-01-01'},
  ],
  agents:[
    {agent_id:1,agent_name:'Zara'},
    {agent_id:2,agent_name:'Marcus'},
    {agent_id:3,agent_name:'Nova'},
    {agent_id:4,agent_name:'Ryn'},
  ],
  exchanges:[
    {year:2899,giver_id:1,receiver_id:2},
    {year:2899,giver_id:3,receiver_id:4},
    {year:2900,giver_id:2,receiver_id:1},
    {year:2900,giver_id:4,receiver_id:3},
    {year:2901,giver_id:1,receiver_id:3},
  ],
  follows:[
    {citizen_id:1,followed_citizen_id:2},
    {citizen_id:1,followed_citizen_id:3},
    {citizen_id:2,followed_citizen_id:3},
    {citizen_id:4,followed_citizen_id:1},
    {citizen_id:5,followed_citizen_id:2},
  ],
  posts:[
    {post_id:1,citizen_id:2,content:'Hello World',post_date:'2901-01-01'},
    {post_id:2,citizen_id:3,content:'First post',post_date:'2901-01-02'},
    {post_id:3,citizen_id:2,content:'Another one',post_date:'2901-01-03'},
  ],
  divisions:[
    {division_id:1,division_name:'Recon',chief_id:101},
    {division_id:2,division_name:'Intel',chief_id:null},
    {division_id:3,division_name:'Field',chief_id:103},
    {division_id:4,division_name:'Tech',chief_id:999},
  ],
  divisionagents:[
    {agent_id:101,agent_name:'Zara'},
    {agent_id:103,agent_name:'Nova'},
  ],
  operativestatus:[
    {operative_id:1,operative_name:'Zara',division:'Recon',energy_level:75,last_mission_date:'2901-01-01'},
    {operative_id:2,operative_name:'Marcus',division:'Intel',energy_level:32,last_mission_date:'2901-01-01'},
    {operative_id:3,operative_name:'Nova',division:'Field',energy_level:48,last_mission_date:'2901-01-02'},
    {operative_id:4,operative_name:'Ryn',division:'Tech',energy_level:15,last_mission_date:'2901-01-02'},
    {operative_id:5,operative_name:'Echo',division:'Recon',energy_level:89,last_mission_date:'2901-01-03'},
  ],
  credittransactions:[
    {transaction_id:1,sender_name:'Vex',receiver_name:'Nova',base_value:100,multiplier:3},
    {transaction_id:2,sender_name:'Echo',receiver_name:'Ryn',base_value:200,multiplier:4},
    {transaction_id:3,sender_name:'Zara',receiver_name:'Marcus',base_value:50,multiplier:5},
    {transaction_id:4,sender_name:'Nova',receiver_name:'Echo',base_value:150,multiplier:2},
    {transaction_id:5,sender_name:'Ryn',receiver_name:'Zara',base_value:300,multiplier:3},
  ],
};

/* ══════════════════════════════════════════════════════════
   PROBLEM BANK — with test cases
══════════════════════════════════════════════════════════ */
const PROBLEMS_DEFAULT = [
  {
    id:'p1',code:'BSQ-001',title:'High Salary Filter',difficulty:'Easy',points:100,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'Find all employees with a salary greater than $85,000.\n\nReturn the columns: name, salary, level.\nOrder results by salary in descending order.',
    sampleOutput:{columns:['name','salary','level'],rows:[['Henry Zhao','115000','Staff'],['Carol White','110000','Staff'],['Frank Kim','105000','Senior']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT'],['hire_year','INT'],['age','INT'],['level','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Row Count',desc:'Must return exactly 6 rows',
       validate:r=>r.rowCount===6, hint:'WHERE salary > 85000'},
      {id:'tc2',name:'Salary Filter',desc:'All returned salaries must be > 85000',
       validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase()==='salary');return r.rows.every(row=>Number(row[i])>85000);},hint:'Check your WHERE condition'},
      {id:'tc3',name:'Ordered Descending',desc:'Must be ordered by salary DESC',
       validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase()==='salary');for(let x=1;x<r.rows.length;x++)if(Number(r.rows[x][i])>Number(r.rows[x-1][i]))return false;return true;},hint:'Add ORDER BY salary DESC'},
    ],
    solution:'SELECT name, salary, level FROM employees WHERE salary > 85000 ORDER BY salary DESC',
    dailyDate: getTodayStr(),
  },
  {
    id:'p2',code:'BSQ-002',title:'Department Employee Count',difficulty:'Easy',points:150,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','COUNT'],
    description:'Count the number of employees in each department.\n\nReturn the columns: dept_id, total_employees.\nOrder results by total_employees in descending order.',
    sampleOutput:{columns:['dept_id','total_employees'],rows:[['1','3'],['2','3'],['4','2'],['3','2']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT']]},
    testCases:[
      {id:'tc1',name:'Four departments',desc:'Must return 4 rows (one per dept)',
       validate:r=>r.rowCount===4,hint:'GROUP BY dept_id'},
      {id:'tc2',name:'Count column exists',desc:'Must have a column for the count',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('total')||c.toLowerCase().includes('count')||c.toLowerCase().includes('emp')),hint:'Use COUNT(*) AS total_employees'},
      {id:'tc3',name:'Descending order',desc:'Highest count first',
       validate:r=>{const ci=r.columns.findIndex(c=>c.toLowerCase().includes('total')||c.toLowerCase().includes('count'));if(ci<0)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ci])>Number(r.rows[i-1][ci]))return false;return true;},hint:'ORDER BY total_employees DESC'},
    ],
    solution:'SELECT dept_id, COUNT(*) AS total_employees FROM employees GROUP BY dept_id ORDER BY total_employees DESC',
    dailyDate: null,
  },
  {
    id:'p3',code:'BSQ-003',title:'Join Employees & Departments',difficulty:'Medium',points:200,timeLimit:null,
    category:'Joins',tags:['JOIN','WHERE'],
    description:'Join employees with departments.\nReturn: employee name, department name (as dept_name), salary, location.\nOnly San Francisco employees. Order by salary DESC.',
    sampleOutput:{columns:['name','dept_name','salary','location'],rows:[['Henry Zhao','Executive','115000','San Francisco'],['Carol White','Engineering','110000','San Francisco'],['Grace Park','Engineering','99000','San Francisco'],['Alice Chen','Engineering','95000','San Francisco'],['Iris Novak','Executive','78000','San Francisco']]},
    schemaHint:{table:'employees  ·  departments',columns:[['employees.id','INT'],['employees.name','VARCHAR'],['employees.dept_id','INT'],['employees.salary','INT'],['departments.id','INT'],['departments.name','VARCHAR'],['departments.location','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Five rows',desc:'San Francisco has 5 employees',
       validate:r=>r.rowCount===5,hint:'JOIN departments d ON dept_id = d.id, WHERE location = \'San Francisco\''},
      {id:'tc2',name:'dept_name column',desc:'Must have a column called dept_name',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('dept')),hint:'Use d.name AS dept_name'},
      {id:'tc3',name:'Location filter',desc:'All employees from SF',
       validate:r=>{const li=r.columns.findIndex(c=>c.toLowerCase().includes('loc'));if(li<0)return true;return r.rows.every(row=>String(row[li]).toLowerCase().includes('san francisco'));},hint:'WHERE d.location = \'San Francisco\''},
    ],
    solution:"SELECT e.name, d.name AS dept_name, e.salary, d.location FROM employees e JOIN departments d ON e.dept_id = d.id WHERE d.location = 'San Francisco' ORDER BY e.salary DESC",
    dailyDate: null,
  },
  {
    id:'p4',code:'BSQ-004',title:'Average Salary by Department',difficulty:'Medium',points:200,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','AVG','HAVING'],
    description:'Show dept_id and average salary (as avg_salary).\nOnly departments with avg salary > $80,000.\nOrder by avg_salary DESC.',
    sampleOutput:{columns:['dept_id','avg_salary'],rows:[['1','101333.33'],['3','96500'],['4','96500']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT'],['hire_year','INT'],['age','INT'],['level','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'HAVING filter',desc:'Only depts with avg > 80000',
       validate:r=>{const ai=r.columns.findIndex(c=>c.toLowerCase().includes('avg'));if(ai<0)return false;if(r.rowCount!==3)return false;return r.rows.every(row=>Number(row[ai])>80000);},hint:'HAVING AVG(salary) > 80000'},
      {id:'tc2',name:'Ordered DESC',desc:'Highest average first',
       validate:r=>{const ai=r.columns.findIndex(c=>c.toLowerCase().includes('avg'));if(ai<0)return false;if(r.rowCount<1)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ai])>Number(r.rows[i-1][ai]))return false;return true;},hint:'ORDER BY avg_salary DESC'},
    ],
    solution:'SELECT dept_id, AVG(salary) AS avg_salary FROM employees GROUP BY dept_id HAVING AVG(salary) > 80000 ORDER BY avg_salary DESC',
    dailyDate: null,
  },
  {
    id:'p5',code:'BSQ-005',title:'Top 3 Earners',difficulty:'Easy',points:100,timeLimit:null,
    category:'Filtering',tags:['ORDER BY','LIMIT'],
    description:'Find the top 3 highest paid employees.\nReturn: name, salary only.',
    sampleOutput:{columns:['name','salary'],rows:[['Henry Zhao','115000'],['Carol White','110000'],['Frank Kim','105000']]},
    schemaHint:{table:'employees',columns:[['id','INT'],['name','VARCHAR'],['dept_id','INT'],['salary','INT'],['hire_year','INT'],['age','INT'],['level','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Exactly 3 rows',desc:'Must return exactly 3 rows',
       validate:r=>r.rowCount===3,hint:'Use LIMIT 3'},
      {id:'tc2',name:'Descending salary',desc:'Highest salary first',
       validate:r=>{const si=r.columns.findIndex(c=>c.toLowerCase().includes('salary'));if(si<0)return false;return Number(r.rows[0][si])>=Number(r.rows[1][si])&&Number(r.rows[1][si])>=Number(r.rows[2][si]);},hint:'ORDER BY salary DESC'},
    ],
    solution:'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3',
    dailyDate: null,
  },
  {
    id:'p6',code:'BSQ-006',title:'Revenue by Customer',difficulty:'Medium',points:250,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','SUM','WHERE'],
    description:'Calculate the total revenue for each customer, counting only delivered orders.\n\nReturn: customer, total_revenue.\nOrder by total_revenue descending.',
    sampleOutput:{columns:['customer','total_revenue'],rows:[['GlobalCo','46600'],['MegaRetail','19800'],['TechCorp','18200'],['StartupXYZ','9900']]},
    schemaHint:{table:'orders',columns:[['id','INT'],['customer','VARCHAR'],['product_id','INT'],['amount','INT'],['status','VARCHAR'],['month','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Delivered only',desc:'Only count delivered orders',
       validate:r=>r.rowCount===4,hint:"WHERE status = 'delivered'"},
      {id:'tc2',name:'SUM column',desc:'Revenue column must exist',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('rev')||c.toLowerCase().includes('total')||c.toLowerCase().includes('amount')),hint:'SUM(amount) AS total_revenue'},
      {id:'tc3',name:'Descending order',desc:'Highest revenue first',
       validate:r=>{const ri=r.columns.findIndex(c=>c.toLowerCase().includes('rev')||c.toLowerCase().includes('total'));if(ri<0)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ri])>Number(r.rows[i-1][ri]))return false;return true;},hint:'ORDER BY total_revenue DESC'},
    ],
    solution:"SELECT customer, SUM(amount) AS total_revenue FROM orders WHERE status = 'delivered' GROUP BY customer ORDER BY total_revenue DESC",
    dailyDate: null,
  },
  {
    id:'p7',code:'BSQ-007',title:'Product Order Report',difficulty:'Hard',points:350,timeLimit:null,
    category:'Joins',tags:['JOIN','GROUP BY','SUM'],
    description:'Join the orders and products tables.\n\nFor each product, return its name (as product), the number of orders placed (as order_count), and the total revenue generated (as total_revenue).\nOrder by total_revenue descending.',
    sampleOutput:{columns:['product','order_count','total_revenue'],rows:[['Enterprise Suite','5','65800'],['Analytics Pro','3','38000'],['Consulting Pack','2','6300']]},
    schemaHint:{table:'orders  ·  products',columns:[['orders.id','INT'],['orders.customer','VARCHAR'],['orders.product_id','INT'],['orders.amount','INT'],['orders.status','VARCHAR'],['products.id','INT'],['products.name','VARCHAR'],['products.category','VARCHAR'],['products.price','INT']]},
    testCases:[
      {id:'tc1',name:'Three products',desc:'Must return 3 rows',
       validate:r=>r.rowCount===3,hint:'JOIN products ON product_id = products.id'},
      {id:'tc2',name:'order_count column',desc:'Must have order count',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('count')||c.toLowerCase().includes('order')),hint:'COUNT(*) AS order_count'},
      {id:'tc3',name:'Descending by revenue',desc:'Highest revenue first',
       validate:r=>{const ri=r.columns.findIndex(c=>c.toLowerCase().includes('rev')||c.toLowerCase().includes('total'));if(ri<0)return false;for(let i=1;i<r.rows.length;i++)if(Number(r.rows[i][ri])>Number(r.rows[i-1][ri]))return false;return true;},hint:'ORDER BY total_revenue DESC'},
    ],
    solution:'SELECT p.name AS product, COUNT(*) AS order_count, SUM(o.amount) AS total_revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY total_revenue DESC',
    dailyDate: null,
  },
  {
    id:'p8',code:'BSQ-008',title:'Student GPA Report',difficulty:'Hard',points:300,timeLimit:null,
    category:'Joins',tags:['JOIN','AVG','GROUP BY'],
    description:'Join the students and courses tables.\n\nFor each course, return the course name (as course_name), the number of enrolled students (as enrolled), and the average GPA (as avg_gpa).\nOrder by avg_gpa descending.',
    sampleOutput:{columns:['course_name','enrolled','avg_gpa'],rows:[['Machine Learning','2','3.75'],['Data Structures','2','3.35'],['Database Systems','2','3.35']]},
    schemaHint:{table:'students  ·  courses',columns:[['students.id','INT'],['students.name','VARCHAR'],['students.grade','INT'],['students.course_id','INT'],['students.year','INT'],['students.gpa','FLOAT'],['courses.id','INT'],['courses.name','VARCHAR'],['courses.credits','INT'],['courses.instructor','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'Three courses',desc:'Must return 3 rows',
       validate:r=>r.rowCount===3,hint:'JOIN courses ON course_id = courses.id'},
      {id:'tc2',name:'avg_gpa column',desc:'Must compute average GPA',
       validate:r=>r.columns.some(c=>c.toLowerCase().includes('gpa')||c.toLowerCase().includes('avg')),hint:'AVG(gpa) AS avg_gpa'},
    ],
    solution:'SELECT c.name AS course_name, COUNT(*) AS enrolled, AVG(s.gpa) AS avg_gpa FROM students s JOIN courses c ON s.course_id = c.id GROUP BY c.name ORDER BY avg_gpa DESC',
    dailyDate: null,
  },
  {
    id:'p9',code:'BSQ-009',title:'Danger Zone Citizens',difficulty:'Easy',points:180,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'Find citizens in danger zones with stability rating below 2.0.\n\nReturn: citizen_name, sector, stability_rating. Order by stability_rating ascending.',
    sampleOutput:{columns:['citizen_name','sector','stability_rating'],rows:[['Ryn','Delta','0.8'],['Nova','Beta','1.5'],['Marcus','Beta','1.9']]},
    schemaHint:{table:'citizenmentalhealth',columns:[['citizen_id','INT'],['citizen_name','VARCHAR'],['sector','VARCHAR'],['stability_rating','FLOAT'],['last_checkup','DATE']]},
    testCases:[
      {id:'tc1',name:'Low stability only',desc:'All rows must be below 2.0',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('stability'));return i>=0&&r.rows.every(row=>Number(row[i])<2);},hint:'WHERE stability_rating < 2.0'},
    ],
    solution:'SELECT citizen_name, sector, stability_rating FROM citizenmentalhealth WHERE stability_rating < 2.0 ORDER BY stability_rating ASC',
    dailyDate: null,
  },
  {
    id:'p10',code:'BSQ-010',title:'Double Agents',difficulty:'Medium',points:220,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'List Alpha clearance operatives tied to more than one organization.\n\nReturn: operative_name, organizations_count. Order by organizations_count descending.',
    sampleOutput:{columns:['operative_name','organizations_count'],rows:[['Zara','3'],['Ryn','2']]},
    schemaHint:{table:'operativeprofiles',columns:[['operative_id','INT'],['operative_name','VARCHAR'],['clearance_level','VARCHAR'],['organizations_count','INT'],['recruitment_date','DATE']]},
    testCases:[
      {id:'tc1',name:'Alpha multiorg only',desc:'Only Alpha with organizations_count > 1',validate:r=>r.rowCount===2,hint:'WHERE clearance_level = \'Alpha\' AND organizations_count > 1'},
    ],
    solution:"SELECT operative_name, organizations_count FROM operativeprofiles WHERE clearance_level = 'Alpha' AND organizations_count > 1 ORDER BY organizations_count DESC",
    dailyDate: null,
  },
  {
    id:'p11',code:'BSQ-011',title:'Duplicate Records',difficulty:'Medium',points:240,timeLimit:null,
    category:'Aggregation',tags:['GROUP BY','HAVING','COUNT'],
    description:'Find duplicate agent/division entries.\n\nReturn: agent_name, division_name, duplicate_count for groups appearing more than once.',
    sampleOutput:{columns:['agent_name','division_name','duplicate_count'],rows:[['Nova','Field','3'],['Zara','Recon','2']]},
    schemaHint:{table:'agentrecords',columns:[['record_id','INT'],['agent_name','VARCHAR'],['division_name','VARCHAR'],['entry_date','DATE']]},
    testCases:[
      {id:'tc1',name:'Duplicates only',desc:'Must return exactly duplicated groups',validate:r=>r.rowCount===2,hint:'GROUP BY agent_name, division_name HAVING COUNT(*) > 1'},
    ],
    solution:'SELECT agent_name, division_name, COUNT(*) AS duplicate_count FROM agentrecords GROUP BY agent_name, division_name HAVING COUNT(*) > 1 ORDER BY duplicate_count DESC, agent_name ASC',
    dailyDate: null,
  },
  {
    id:'p12',code:'BSQ-012',title:'Echo Transactions',difficulty:'Medium',points:250,timeLimit:null,
    category:'Aggregation',tags:['SUM','GROUP BY','HAVING'],
    description:'Show accounts whose total credits exceed 400.\n\nReturn: account_id, total_credits ordered by total_credits descending.',
    sampleOutput:{columns:['account_id','total_credits'],rows:[['101','700'],['102','450'],['103','500']]},
    schemaHint:{table:'creditledger',columns:[['txn_id','INT'],['account_id','INT'],['credits','INT'],['txn_date','DATE']]},
    testCases:[
      {id:'tc1',name:'High value accounts',desc:'Only accounts with SUM(credits) > 400',validate:r=>r.rowCount===3,hint:'HAVING SUM(credits) > 400'},
    ],
    solution:'SELECT account_id, SUM(credits) AS total_credits FROM creditledger GROUP BY account_id HAVING SUM(credits) > 400 ORDER BY total_credits DESC',
    dailyDate: null,
  },
  {
    id:'p13',code:'BSQ-013',title:'Exchange Paradox',difficulty:'Hard',points:320,timeLimit:null,
    category:'Joins',tags:['JOIN','IN'],
    description:'Find agents who have appeared as both giver and receiver in exchanges.\n\nReturn: agent_name ordered alphabetically.',
    sampleOutput:{columns:['agent_name'],rows:[['Marcus'],['Nova'],['Zara']]},
    schemaHint:{table:'agents  ·  exchanges',columns:[['agent_id','INT'],['agent_name','VARCHAR'],['giver_id','INT'],['receiver_id','INT'],['year','INT']]},
    testCases:[
      {id:'tc1',name:'Bidirectional participants',desc:'Must include agents appearing in both roles',validate:r=>r.rowCount===3,hint:'agent_id IN (SELECT giver_id ...) AND agent_id IN (SELECT receiver_id ...)'},
    ],
    solution:'SELECT a.agent_name FROM agents a WHERE a.agent_id IN (SELECT giver_id FROM exchanges) AND a.agent_id IN (SELECT receiver_id FROM exchanges) ORDER BY a.agent_name ASC',
    dailyDate: null,
  },
  {
    id:'p14',code:'BSQ-014',title:'Ghost Followers',difficulty:'Hard',points:330,timeLimit:null,
    category:'Joins',tags:['LEFT JOIN','NULL'],
    description:'Find citizens who follow someone but have never posted.\n\nReturn distinct citizen_id ordered ascending.',
    sampleOutput:{columns:['citizen_id'],rows:[['1'],['4'],['5']]},
    schemaHint:{table:'follows  ·  posts',columns:[['citizen_id','INT'],['followed_citizen_id','INT'],['post_id','INT'],['content','VARCHAR']]},
    testCases:[
      {id:'tc1',name:'No-post followers',desc:'Only followers with no posts',validate:r=>r.rowCount===3,hint:'LEFT JOIN posts ON follows.citizen_id = posts.citizen_id WHERE posts.citizen_id IS NULL'},
    ],
    solution:'SELECT DISTINCT f.citizen_id FROM follows f LEFT JOIN posts p ON f.citizen_id = p.citizen_id WHERE p.citizen_id IS NULL ORDER BY f.citizen_id ASC',
    dailyDate: null,
  },
  {
    id:'p15',code:'BSQ-015',title:'Leaderless Divisions',difficulty:'Medium',points:260,timeLimit:null,
    category:'Joins',tags:['LEFT JOIN','NULL','OR'],
    description:'Find divisions with missing or invalid chiefs.\n\nA division is leaderless if chief_id is NULL or chief_id does not exist in divisionagents.',
    sampleOutput:{columns:['division_name'],rows:[['Intel'],['Tech']]},
    schemaHint:{table:'divisions  ·  divisionagents',columns:[['division_id','INT'],['division_name','VARCHAR'],['chief_id','INT'],['agent_id','INT']]},
    testCases:[
      {id:'tc1',name:'Leaderless only',desc:'Must return Intel and Tech',validate:r=>r.rowCount===2,hint:'LEFT JOIN divisionagents ON chief_id = agent_id'},
    ],
    solution:'SELECT d.division_name FROM divisions d LEFT JOIN divisionagents a ON d.chief_id = a.agent_id WHERE d.chief_id IS NULL OR a.agent_id IS NULL ORDER BY d.division_name ASC',
    dailyDate: null,
  },
  {
    id:'p16',code:'BSQ-016',title:'Low-Energy Operatives',difficulty:'Easy',points:170,timeLimit:null,
    category:'Filtering',tags:['WHERE','ORDER BY'],
    description:'List operatives with energy level below 40.\n\nReturn: operative_name, division, energy_level ordered by energy_level ascending.',
    sampleOutput:{columns:['operative_name','division','energy_level'],rows:[['Ryn','Tech','15'],['Marcus','Intel','32']]},
    schemaHint:{table:'operativestatus',columns:[['operative_id','INT'],['operative_name','VARCHAR'],['division','VARCHAR'],['energy_level','INT'],['last_mission_date','DATE']]},
    testCases:[
      {id:'tc1',name:'Energy threshold',desc:'All rows must be < 40',validate:r=>{const i=r.columns.findIndex(c=>c.toLowerCase().includes('energy'));return i>=0&&r.rows.every(row=>Number(row[i])<40);},hint:'WHERE energy_level < 40'},
    ],
    solution:'SELECT operative_name, division, energy_level FROM operativestatus WHERE energy_level < 40 ORDER BY energy_level ASC',
    dailyDate: null,
  },
  {
    id:'p17',code:'BSQ-017',title:'Credit Multiplier',difficulty:'Easy',points:190,timeLimit:null,
    category:'Computed Columns',tags:['SELECT','ORDER BY'],
    description:'Compute multiplied credit value for each transaction.\n\nReturn: sender_name, receiver_name, effective_credits where effective_credits = base_value * multiplier, ordered descending.',
    sampleOutput:{columns:['sender_name','receiver_name','effective_credits'],rows:[['Ryn','Zara','900'],['Echo','Ryn','800'],['Vex','Nova','300']]},
    schemaHint:{table:'credittransactions',columns:[['transaction_id','INT'],['sender_name','VARCHAR'],['receiver_name','VARCHAR'],['base_value','INT'],['multiplier','INT']]},
    testCases:[
      {id:'tc1',name:'Computed field',desc:'Must compute base_value * multiplier',validate:r=>r.rowCount===5,hint:'SELECT base_value * multiplier AS effective_credits'},
    ],
    solution:'SELECT sender_name, receiver_name, base_value * multiplier AS effective_credits FROM credittransactions ORDER BY effective_credits DESC',
    dailyDate: null,
  },
];

/* ══════════════════════════════════════════════════════════
   CONTESTS DATA
══════════════════════════════════════════════════════════ */
const now = Date.now();
const CONTESTS_DEFAULT = [
  {
    id:'con1',title:'SQL Fundamentals Championship',type:'official',
    status:'live',
    startTime: now - 3600000,
    endTime:   now + 7200000,
    duration:180,
    description:'Test your fundamental SQL skills — filtering, aggregation, and joins.',
    problemIds:['p1','p2','p3'],
    createdBy:'admin',
    isPublic:true,
    maxParticipants:500,
    announcement:'Welcome! Remember: only SELECT statements. Good luck!',
  },
  {
    id:'con2',title:'Advanced Query Masters',type:'official',
    status:'upcoming',
    startTime: now + 86400000,
    endTime:   now + 86400000 + 14400000,
    duration:240,
    description:'Advanced SQL: multi-table joins, subqueries, window functions.',
    problemIds:['p4','p5','p6','p7'],
    createdBy:'admin',
    isPublic:true,
    maxParticipants:200,
    announcement:'',
  },
  {
    id:'con3',title:'Weekend Grind',type:'official',
    status:'ended',
    startTime: now - 604800000,
    endTime:   now - 604800000 + 7200000,
    duration:120,
    description:'A quick 2-hour warm-up contest.',
    problemIds:['p1','p5'],
    createdBy:'admin',
    isPublic:true,
    maxParticipants:100,
    announcement:'',
  },
];

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
const S = {
  user:null,
  problems:[],
  contests:[],
  submissions:[],
  customContests:[],
  currentView:'home',
  currentContest:null,
  currentProblem:null,
  judgeContext:null, // {contestId, problemId, backView}
  judgeTimer:null,
  judgeElapsed:0,
  onlineCount: Math.floor(Math.random()*120)+320,
  editingProblem:null,
  editingContest:null,
  editingCustomContest:null,
  pendingContestAccess:null,
  adminSubTab:'problems',
  practiceFilter:'All',
  practiceMode:'problems',
  practiceLab:{tables:{}},
  unlockedPrivateContests:{},
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const el=id=>document.getElementById(id);
const esc=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML;};
function show(id){const e=typeof id==='string'?el(id):id;if(e)e.classList.remove('hidden');}
function hide(id){const e=typeof id==='string'?el(id):id;if(e)e.classList.add('hidden');}
function tog(id,c){c?show(id):hide(id);}
function openModal(id){show(id);}
function closeModal(id){hide(id);}
function genId(){return Math.random().toString(36).slice(2,10);}
function fmtN(n){return Number(n).toLocaleString();}
function fmtT(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function fmtDate(ts){return new Date(ts).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function fmtCountdownDHMS(totalSeconds){
  const secs=Math.max(0,Math.floor(totalSeconds));
  const days=Math.floor(secs/86400);
  const hours=Math.floor((secs%86400)/3600);
  const mins=Math.floor((secs%3600)/60);
  const seconds=secs%60;
  return `${days}d ${String(hours).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
}
function fmtDur(ms){const m=Math.floor(ms/60000);const h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`;}
function getTodayStr(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
function diffCls(d){return d==='Easy'?'diff-easy':d==='Medium'?'diff-med':d==='Hard'?'diff-hard':'diff-expert';}
function roleBadge(role){return `<span class="role-badge rb-${role}">${role}</span>`;}
function canCreate(){return S.user&&(S.user.role==='admin'||S.user.role==='master');}
function isAdmin(){return S.user?.role==='admin';}
function isMaster(){return S.user?.role==='admin'||S.user?.role==='master';}
function getSolvedIds(){return new Set(S.submissions.filter(s=>s.verdict==='AC').map(s=>s.problemId));}
function hasContestStarted(contest){
  return Date.now()>=Number(contest?.startTime||0);
}
function getContestSelectableProblems(existingProblemIds=[]){
  if(isAdmin())return [...S.problems];
  const keep=new Set(Array.isArray(existingProblemIds)?existingProblemIds:[]);
  return S.problems.filter(p=>p.isCustom!==true||keep.has(p.id));
}
function isSolvedInContest(problemId,contestId){
  if(!problemId||!contestId)return false;
  return S.submissions.some(s=>s.problemId===problemId&&s.contestId===contestId&&s.verdict==='AC');
}
function getSolvedIdsInContest(contestId){
  if(!contestId)return new Set();
  return new Set(
    S.submissions
      .filter(s=>s.contestId===contestId&&s.verdict==='AC')
      .map(s=>s.problemId)
  );
}
function isSolvedForJudgeContext(problemId,ctx){
  if(ctx?.contestId)return isSolvedInContest(problemId,ctx.contestId);
  return getSolvedIds().has(problemId);
}
function isContestReattemptBlocked(problemId,contestId){
  return Boolean(contestId)&&isSolvedInContest(problemId,contestId);
}
function getEffectiveSubmissionContestId(ctx){
  const contestId=ctx?.contestId||null;
  if(!contestId)return null;
  const contest=getContestById(contestId);
  if(!contest)return null;
  normalizeContestLifecycle(contest);
  if(contest.status==='ended')return null;
  return contest.id;
}
function normalizeBsqCode(raw){
  const code=String(raw||'').trim().toUpperCase();
  return /^BSQ-\d+$/.test(code)?code:'';
}
function getNextBsqCode(){
  const used=S.problems
    .map(p=>normalizeBsqCode(p.code||p.id))
    .filter(Boolean)
    .map(c=>parseInt(c.split('-')[1],10))
    .filter(n=>Number.isFinite(n));
  const next=(used.length?Math.max(...used):0)+1;
  return `BSQ-${String(next).padStart(3,'0')}`;
}

function validateUsername(u){
  if(!u||u.length<3)return 'Username must be at least 3 characters.';
  if(u.length>24)return 'Username must be at most 24 characters.';
  if(!/^[A-Za-z0-9_]+$/.test(u))return 'Username can contain only letters, numbers, and underscore.';
  return '';
}

function validateEmail(email){
  if(!email)return 'Email is required.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return 'Enter a valid email address.';
  return '';
}

function validatePassword(p){
  if(!p||p.length<8)return 'Password must be at least 8 characters.';
  if(!/[A-Z]/.test(p))return 'Password must include at least 1 uppercase letter.';
  if(!/[a-z]/.test(p))return 'Password must include at least 1 lowercase letter.';
  if(!/[0-9]/.test(p))return 'Password must include at least 1 number.';
  if(!/[^A-Za-z0-9]/.test(p))return 'Password must include at least 1 special character.';
  return '';
}

async function hashPassword(raw){
  const bytes=new TextEncoder().encode(String(raw||''));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function getRoleId(role){
  if(role==='admin')return 1;
  if(role==='master')return 3;
  return 2;
}

async function getRelationalUserId(username){
  if(!SB||STORAGE_MODE!=='supabase'||!username)return null;
  const {data,error}=await SB.from('users').select('id').eq('username',username).maybeSingle();
  if(error)return null;
  return data?.id??null;
}

async function getRoleFromRelationalUserId(userId){
  if(!SB||STORAGE_MODE!=='supabase'||!userId)return 'contestant';
  const {data,error}=await SB.from('user_roles').select('role_id').eq('user_id',userId);
  if(error||!data?.length)return 'contestant';
  const roleIds=data.map(r=>Number(r.role_id));
  if(roleIds.includes(1))return 'admin';
  if(roleIds.includes(3))return 'master';
  return 'contestant';
}

async function fetchRelationalAuthUser(username){
  if(!SB||STORAGE_MODE!=='supabase'||!username)return null;
  const {data,error}=await SB
    .from('users')
    .select('id,username,email,password_hash,is_active,created_at')
    .eq('username',username)
    .maybeSingle();
  if(error||!data||data.is_active===false)return null;
  const role=await getRoleFromRelationalUserId(data.id);
  return {
    userId:`db-${data.id}`,
    username:data.username,
    email:data.email||`${data.username}@besql.local`,
    passwordHash:data.password_hash||'',
    role,
    score:0,
    solved:0,
    streak:0,
    joinedAt:data.created_at?new Date(data.created_at).getTime():Date.now(),
  };
}

async function syncUserToRelational(user){
  if(!SB||STORAGE_MODE!=='supabase'||!user?.username||!user?.email){
    return Promise.resolve({success:false,reason:'Supabase not available or user data incomplete'});
  }
  try{
    const payload={
      username:user.username,
      email:user.email,
      password_hash:user.passwordHash||'',
      full_name:user.username,
      is_active:true,
      updated_at:new Date().toISOString(),
    };
    const {data,error}=await SB.from('users').upsert(payload,{onConflict:'username'}).select('id').maybeSingle();
    if(error){
      console.warn('Supabase users sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    const userId=data?.id??await getRelationalUserId(user.username);
    if(!userId){
      console.warn('Failed to get user ID after sync');
      return {success:false,reason:'Failed to get user ID'};
    }
    const role_id=getRoleId(user.role);
    const {error:roleErr}=await SB.from('user_roles').upsert({user_id:userId,role_id},{onConflict:'user_id,role_id'});
    if(roleErr){
      console.warn('Supabase user_roles sync failed:',roleErr.message||roleErr);
      return {success:false,error:roleErr.message||roleErr};
    }
    return {success:true,userId};
  }catch(err){
    console.warn('Supabase relational user sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function syncSubmissionToRelational(sub,result,problem){
  if(!SB||STORAGE_MODE!=='supabase'||!S.user?.username||!sub){
    return Promise.resolve({success:false,reason:'Supabase not available or submission data incomplete'});
  }
  try{
    const uid=await getRelationalUserId(S.user.username);
    if(!uid){
      console.warn('Failed to get user ID for submission sync');
      return {success:false,reason:'User ID not found'};
    }
    const verdictMap={AC:'accepted',WA:'wrong_answer',TLE:'time_limit',CE:'error'};
    const verdict=verdictMap[sub.verdict]||String(sub.verdict||'pending').toLowerCase();
    const contestIdNum=Number(sub.contestId);
    const payload={
      user_id:uid,
      problem_id:problem?.code||sub.problemId,
      contest_id:Number.isFinite(contestIdNum)?contestIdNum:null,
      submitted_code:sub.code||'',
      verdict,
      error_message:result?.error||(sub.verdict==='WA'?'Wrong Answer':null),
      runtime_ms:Math.max(0,Number(sub.timeTaken||0))*1000,
      memory_mb:null,
      tests_passed:Number(sub.tcPassed||0),
      total_tests:Number(sub.tcTotal||0),
      score:sub.verdict==='AC'?(Number(problem?.points||0)):0,
      judged_at:new Date().toISOString(),
    };
    const {error}=await SB.from('submissions').insert(payload);
    if(error){
      console.warn('Supabase submissions sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true};
  }catch(err){
    console.warn('Supabase relational submission sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

function serializeProblemTestCases(testCases){
  return (testCases||[]).map(tc=>{
    const {validate,...rest}=tc;
    return rest;
  });
}

function hydrateProblemFromRelationalRow(row){
  const solution=row.solution||'SELECT 1';
  const rawCases=Array.isArray(row.test_cases)?row.test_cases:[];
  const testCases=rawCases.map((tc,idx)=>({
    id:tc.id||`${row.id}-tc-${idx+1}`,
    name:tc.name||`Test ${idx+1}`,
    desc:tc.desc||'',
    hint:tc.hint||'',
    hidden:tc.hidden===true,
    validate:buildValidator(tc,{solution,description:row.description||''}),
  }));

  return {
    id:row.id,
    code:row.code||String(row.id||'').toUpperCase(),
    title:row.title||'Untitled Problem',
    difficulty:row.difficulty||'Easy',
    points:Number(row.points||100),
    timeLimit:null,
    category:row.category||'General',
    tags:Array.isArray(row.tags)?row.tags:[],
    description:row.description||'',
    solution,
    sampleOutput:row.sample_output||null,
    schemaHint:row.schema_hint||null,
    testCases,
    dailyDate:row.daily_date||null,
  };
}

async function loadProblemsFromRelational(){
  if(!SB||STORAGE_MODE!=='supabase'){
    return Promise.resolve({success:false,problems:null,reason:'Supabase not configured'});
  }
  try{
    const {data,error}=await SB
      .from('problems')
      .select('*')
      .eq('is_active',true)
      .order('created_at',{ascending:true});
    if(error){
      console.warn('Supabase problems load failed:',error.message||error);
      return {success:false,problems:null,error:error.message||error};
    }
    const problems=(data||[]).map(hydrateProblemFromRelationalRow);
    return {success:true,problems,count:problems.length};
  }catch(err){
    console.warn('Supabase problems load exception:',err?.message||err);
    return {success:false,problems:null,error:err?.message||err};
  }
}

async function syncProblemToRelational(problem){
  if(!SB||STORAGE_MODE!=='supabase'||!problem?.id){
    return Promise.resolve({success:false,reason:'Supabase not available or problem data incomplete'});
  }
  try{
    const payload={
      id:problem.id,
      code:problem.code||String(problem.id).toUpperCase(),
      title:problem.title||'Untitled Problem',
      difficulty:problem.difficulty||'Easy',
      points:Number(problem.points||100),
      time_limit:null,
      category:problem.category||'General',
      tags:Array.isArray(problem.tags)?problem.tags:[],
      description:problem.description||'',
      solution:problem.solution||'SELECT 1',
      sample_output:problem.sampleOutput||null,
      schema_hint:problem.schemaHint||null,
      test_cases:serializeProblemTestCases(problem.testCases),
      daily_date:problem.dailyDate||null,
      is_active:true,
      created_by:S.user?.username||'system',
      updated_at:new Date().toISOString(),
    };
    const {error}=await SB.from('problems').upsert(payload,{onConflict:'id'});
    if(error){
      console.warn('Supabase problem sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,problemId:problem.id};
  }catch(err){
    console.warn('Supabase problem sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function deactivateProblemInRelational(problemId){
  if(!SB||STORAGE_MODE!=='supabase'||!problemId){
    return Promise.resolve({success:false,reason:'Supabase not available or problem ID missing'});
  }
  try{
    const {error}=await SB
      .from('problems')
      .update({is_active:false,updated_at:new Date().toISOString()})
      .eq('id',problemId);
    if(error){
      console.warn('Supabase problem deactivate failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,problemId};
  }catch(err){
    console.warn('Supabase problem deactivate exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function seedProblemsToRelational(problems){
  if(!SB||STORAGE_MODE!=='supabase'||!Array.isArray(problems)||!problems.length)return;
  for(const p of problems){
    await syncProblemToRelational(p);
  }
}

function serializeContestForRelational(contest){
  return {
    id:String(contest.id),
    title:contest.title||'Untitled Contest',
    description:contest.description||'',
    type:contest.type||'official',
    status:contest.status||'upcoming',
    start_time:new Date(Number(contest.startTime||Date.now())).toISOString(),
    end_time:new Date(Number(contest.endTime||Date.now())).toISOString(),
    duration_minutes:Number(contest.duration||120),
    problem_ids:Array.isArray(contest.problemIds)?contest.problemIds:[],
    is_public:contest.isPublic!==false,
    max_participants:Number(contest.maxParticipants||500),
    announcement:contest.announcement||'',
    created_by:String(contest.createdBy||S.user?.username||S.user?.userId||'system'),
    invitees:Array.isArray(contest.invitees)?contest.invitees:[],
    participants:Array.isArray(contest.participants)?contest.participants:[],
    password:contest.password||'',
    updated_at:new Date().toISOString(),
  };
}

function hydrateContestFromRelationalRow(row){
  const startTs=row.start_time?new Date(row.start_time).getTime():Date.now();
  const endTs=row.end_time?new Date(row.end_time).getTime():(startTs+Number(row.duration_minutes||120)*60000);
  return {
    id:String(row.id),
    title:row.title||'Untitled Contest',
    description:row.description||'',
    type:row.type||'official',
    status:row.status||'upcoming',
    startTime:startTs,
    endTime:endTs,
    duration:Number(row.duration_minutes||120),
    problemIds:Array.isArray(row.problem_ids)?row.problem_ids:[],
    isPublic:row.is_public!==false,
    maxParticipants:Number(row.max_participants||500),
    announcement:row.announcement||'',
    createdBy:row.created_by||'system',
    invitees:Array.isArray(row.invitees)?row.invitees:[],
    participants:Array.isArray(row.participants)?row.participants:[],
    password:row.password||'',
  };
}

async function loadContestsFromRelational(){
  if(!SB||STORAGE_MODE!=='supabase'){
    return Promise.resolve({success:false,contests:null,reason:'Supabase not configured'});
  }
  try{
    const {data,error}=await SB.from('contests').select('*').order('start_time',{ascending:false});
    if(error){
      console.warn('Supabase contests load failed:',error.message||error);
      return {success:false,contests:null,error:error.message||error};
    }
    const contests=(data||[]).map(hydrateContestFromRelationalRow);
    return {success:true,contests,count:contests.length};
  }catch(err){
    console.warn('Supabase contests load exception:',err?.message||err);
    return {success:false,contests:null,error:err?.message||err};
  }
}

async function syncContestToRelational(contest){
  if(!SB||STORAGE_MODE!=='supabase'||!contest?.id){
    return Promise.resolve({success:false,reason:'Supabase not available or contest data incomplete'});
  }
  try{
    const payload=serializeContestForRelational(contest);
    const {error}=await SB.from('contests').upsert(payload,{onConflict:'id'});
    if(error){
      console.warn('Supabase contest sync failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,contestId:contest.id};
  }catch(err){
    console.warn('Supabase contest sync exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

async function seedContestsToRelational(contests){
  if(!SB||STORAGE_MODE!=='supabase'||!Array.isArray(contests)||!contests.length)return;
  for(const c of contests){
    await syncContestToRelational(c);
  }
}

async function deleteContestFromRelational(contestId){
  if(!SB||STORAGE_MODE!=='supabase'||!contestId){
    return Promise.resolve({success:false,reason:'Supabase not available or contest ID missing'});
  }
  try{
    const {error}=await SB.from('contests').delete().eq('id',String(contestId));
    if(error){
      console.warn('Supabase contest delete failed:',error.message||error);
      return {success:false,error:error.message||error};
    }
    return {success:true,contestId};
  }catch(err){
    console.warn('Supabase contest delete exception:',err?.message||err);
    return {success:false,error:err?.message||err};
  }
}

function toast(msg,type='info'){
  const t=document.createElement('div');
  t.className=`toast t-${type==='success'?'ok':type==='error'?'err':type==='warn'?'warn':'inf'}`;
  t.innerHTML=`<span>${type==='success'?'✓':type==='error'?'✗':type==='warn'?'[!]':'ℹ'}</span><span>${esc(msg)}</span>`;
  el('toasts').appendChild(t);
  setTimeout(()=>t.remove(),4000);
}
function persistProblems(){LS.set('problems',S.problems.map(p=>{const{testCases,...r}=p;return{...r,testCases:testCases.map(tc=>{const{validate,...t}=tc;return t;})};}))}
function rebuildValidators(problems){return problems.map(p=>({...p,testCases:p.testCases.map(tc=>({...tc,validate:buildValidator(tc,p)}))}))}
function normalizeResultCell(v){
  if(v==null)return null;
  const n=Number(v);
  if(Number.isFinite(n)&&String(v).trim()!=='')return n;
  return String(v).trim().toLowerCase();
}
function normalizeResultColumns(cols){
  return (cols||[]).map(c=>String(c).trim().toLowerCase());
}
function resultsExactlyMatch(actual,expected){
  if(!actual||!expected)return false;
  const actualCols=normalizeResultColumns(actual.columns);
  const expectedCols=normalizeResultColumns(expected.columns);
  if(actualCols.length!==expectedCols.length)return false;
  for(let i=0;i<expectedCols.length;i++){
    if(actualCols[i]!==expectedCols[i])return false;
  }

  const actualRows=actual.rows||[];
  const expectedRows=expected.rows||[];
  if(actualRows.length!==expectedRows.length)return false;
  for(let r=0;r<expectedRows.length;r++){
    const a=actualRows[r]||[];
    const b=expectedRows[r]||[];
    if(a.length!==b.length)return false;
    for(let c=0;c<b.length;c++){
      if(normalizeResultCell(a[c])!==normalizeResultCell(b[c]))return false;
    }
  }
  return true;
}
function matchesSampleOutput(result,sample){
  if(!sample||!Array.isArray(sample.columns)||!Array.isArray(sample.rows))return true;
  return resultsExactlyMatch(result,sample);
}
function buildValidator(tc,prob){
  const meta=`${tc?.name||''} ${tc?.desc||''} ${tc?.hint||''} ${prob?.description||''}`.toLowerCase();
  const expectedRowsMatch=meta.match(/(?:exactly|must return|return)\s+(\d+)\s+rows?/i);
  const expectedRows=expectedRowsMatch?Number(expectedRowsMatch[1]):null;

  const requiredCols=[];
  const returnColsMatch=meta.match(/return(?: the columns?)?\s*:?\s*([a-z0-9_,\s]+)/i);
  if(returnColsMatch){
    returnColsMatch[1].split(',').map(s=>s.trim()).filter(Boolean).forEach(c=>requiredCols.push(c));
  }
  const mustReturnTwo=meta.match(/must return\s+([a-z_][a-z0-9_]*)\s+(?:and|&)\s+([a-z_][a-z0-9_]*)/i);
  if(mustReturnTwo){
    requiredCols.push(mustReturnTwo[1],mustReturnTwo[2]);
  }

  const orderDir=/\b(desc|descending|highest\s+first)\b/i.test(meta)
    ?'desc'
    :/\b(asc|ascending|lowest\s+first)\b/i.test(meta)
      ?'asc'
      :null;

  const thresholdMatch=meta.match(/(>=|<=|>|<)\s*\$?\s*(\d+(?:\.\d+)?)/);
  const threshold=thresholdMatch?{op:thresholdMatch[1],value:Number(thresholdMatch[2])}:null;

  const valueColHint=/\bavg\b/i.test(meta)
    ?'avg'
    :/\bsalary\b/i.test(meta)
      ?'salary'
      :/\b(total|count|credits|score|revenue)\b/i.test(meta)
        ?'total'
        :null;

  const opPass=(v,op,t)=>{
    if(!Number.isFinite(v)||!Number.isFinite(t))return false;
    if(op==='>')return v>t;
    if(op==='<')return v<t;
    if(op==='>=')return v>=t;
    if(op==='<=')return v<=t;
    return false;
  };

  const expectedFromSolution=(prob?.solution&&typeof runSQL==='function')
    ? runSQL(prob.solution,DB)
    : null;
  const hasReferenceResult=Boolean(expectedFromSolution&&!expectedFromSolution.error&&Array.isArray(expectedFromSolution.rows));

  return (r)=>{
    if(r.error||!r.rows)return false;

    let checks=0;
    const cols=(r.columns||[]).map(c=>String(c).toLowerCase());

    // Canonical check: user output must match official solution output.
    if(hasReferenceResult){
      checks++;
      if(!resultsExactlyMatch(r,expectedFromSolution))return false;
    }

    if(prob?.sampleOutput){
      checks++;
      if(!matchesSampleOutput(r,prob.sampleOutput))return false;
    }

    if(requiredCols.length){
      checks++;
      const ok=requiredCols.every(req=>cols.some(c=>c===req||c.includes(req)));
      if(!ok)return false;
    }

    if(expectedRows!=null&&Number.isFinite(expectedRows)){
      checks++;
      if(r.rowCount!==expectedRows)return false;
    }

    if(orderDir&&r.rowCount>1){
      const idx=valueColHint
        ? cols.findIndex(c=>c.includes(valueColHint))
        : 0;
      if(idx>=0){
        checks++;
        for(let i=1;i<r.rows.length;i++){
          const a=Number(r.rows[i-1][idx]);
          const b=Number(r.rows[i][idx]);
          if(Number.isFinite(a)&&Number.isFinite(b)){
            if(orderDir==='desc'&&b>a)return false;
            if(orderDir==='asc'&&b<a)return false;
          }else{
            const cmp=String(r.rows[i-1][idx]??'').localeCompare(String(r.rows[i][idx]??''));
            if(orderDir==='desc'&&cmp<0)return false;
            if(orderDir==='asc'&&cmp>0)return false;
          }
        }
      }
    }

    if(threshold){
      const idx=valueColHint
        ? cols.findIndex(c=>c.includes(valueColHint))
        : -1;
      if(idx>=0){
        checks++;
        if(!r.rows.every(row=>opPass(Number(row[idx]),threshold.op,threshold.value)))return false;
      }
    }

    if(checks===0)return false;
    return true;
  };
}

function injectHiddenStrongTestCases(problems){
  return problems.map(p=>{
    const testCases=(p.testCases||[]).map(tc=>({
      ...tc,
      hidden:tc.hidden===true,
      validate:tc.validate||buildValidator(tc,p),
    }));

    const guardId=`${p.id}__hidden_wa_guard`;
    const hasGuard=testCases.some(tc=>tc&&tc.id===guardId);
    if(!hasGuard){
      testCases.push({
        id:guardId,
        name:'Hidden WA Guard',
        desc:'System check: output must exactly match expected result',
        hint:'',
        hidden:true,
        system:true,
        validate:(r)=>{
          if(r.error||!Array.isArray(r.rows))return false;
          const ref=runSQL(p.solution||'SELECT 1',DB);
          if(ref.error||!Array.isArray(ref.rows))return false;
          return resultsExactlyMatch(r,ref);
        },
      });
    }

    return {...p,testCases};
  });
}

const PRACTICE_LAB_TASKS = [
  {
    id:'ddl-1',
    title:'Create a table',
    question:'Create a table named classes with columns: id INT, title TEXT, seats INT.',
    hint:'Use CREATE TABLE classes (...).',
    answer:'CREATE TABLE classes (id INT, title TEXT, seats INT);',
  },
  {
    id:'dml-1',
    title:'Insert rows',
    question:'Insert 2 rows into learners table with your own names and marks.',
    hint:'Use INSERT INTO learners (id, name, marks) VALUES (...).',
    answer:"INSERT INTO learners (id, name, marks) VALUES (10, 'Mina', 84);\nINSERT INTO learners (id, name, marks) VALUES (11, 'Rafi', 90);",
  },
  {
    id:'dml-2',
    title:'Update with WHERE',
    question:'Increase marks by setting a learner\'s marks to 95 for id = 2.',
    hint:'Use UPDATE learners SET marks = 95 WHERE id = 2.',
    answer:'UPDATE learners SET marks = 95 WHERE id = 2;',
  },
  {
    id:'dml-3',
    title:'Delete data',
    question:'Delete absent learners from attendance table.',
    hint:"Use DELETE FROM attendance WHERE status = 'absent'.",
    answer:"DELETE FROM attendance WHERE status = 'absent';",
  },
  {
    id:'mixed-1',
    title:'Verify using SELECT',
    question:'Show learners ordered by marks descending.',
    hint:'Use SELECT * FROM learners ORDER BY marks DESC.',
    answer:'SELECT * FROM learners ORDER BY marks DESC;',
  },
];

function createDefaultPracticeLab(){
  return {
    tables:{
      learners:{
        columns:[{name:'id',type:'INT'},{name:'name',type:'TEXT'},{name:'marks',type:'INT'}],
        rows:[{id:1,name:'Aisha',marks:89},{id:2,name:'Bilal',marks:76},{id:3,name:'Chris',marks:91}],
      },
      attendance:{
        columns:[{name:'id',type:'INT'},{name:'learner_id',type:'INT'},{name:'status',type:'TEXT'}],
        rows:[{id:1,learner_id:1,status:'present'},{id:2,learner_id:2,status:'absent'},{id:3,learner_id:3,status:'present'}],
      }
    }
  };
}

function persistPracticeLab(){
  LS.set('practiceLab',S.practiceLab);
}

function splitSQLStatements(sql){
  const out=[];
  let cur='';
  let quote='';
  for(const ch of sql){
    if((ch==='\''||ch==='"')&&(!quote||quote===ch))quote=quote?'' : ch;
    if(ch===';'&&!quote){if(cur.trim())out.push(cur.trim());cur='';continue;}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}

function splitCsvSafe(raw){
  const out=[];
  let cur='';
  let quote='';
  for(const ch of raw){
    if((ch==='\''||ch==='"')&&(!quote||quote===ch))quote=quote?'' : ch;
    if(ch===','&&!quote){out.push(cur.trim());cur='';continue;}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}

function parseSQLLiteral(v){
  const x=v.trim();
  if(/^null$/i.test(x))return null;
  if((x.startsWith('\'')&&x.endsWith('\''))||(x.startsWith('"')&&x.endsWith('"')))return x.slice(1,-1);
  const n=Number(x);
  return Number.isNaN(n)?x:n;
}

function castByType(value,type){
  if(value==null)return null;
  const t=String(type||'TEXT').toUpperCase();
  if(t.includes('INT')||t.includes('NUM')||t.includes('DEC')||t.includes('FLOAT')){
    const n=Number(value);
    return Number.isNaN(n)?value:n;
  }
  return String(value);
}

function labSchemaToData(){
  const out={};
  Object.entries(S.practiceLab.tables).forEach(([name,t])=>{out[name]=t.rows.map(r=>({...r}));});
  return out;
}

function runPracticeLab(){
  const ta=el('practice-lab-editor');
  if(!ta)return;
  const sql=(ta.value||'').trim();
  if(!sql){toast('Write some DDL/DML first','warn');return;}

  const statements=splitSQLStatements(sql);
  const outputs=[];

  try{
    for(const stmtRaw of statements){
      const stmt=stmtRaw.replace(/;$/,'').trim();

      const createM=stmt.match(/^CREATE\s+TABLE\s+(\w+)\s*\((.+)\)$/i);
      if(createM){
        const tname=createM[1].toLowerCase();
        if(S.practiceLab.tables[tname])throw new Error(`Table '${tname}' already exists.`);
        const cols=splitCsvSafe(createM[2]).map(c=>{
          const [name,type='TEXT']=c.trim().split(/\s+/);
          if(!name)throw new Error('Invalid column definition in CREATE TABLE.');
          return {name:name.toLowerCase(),type:type.toUpperCase()};
        });
        S.practiceLab.tables[tname]={columns:cols,rows:[]};
        outputs.push({type:'msg',text:`Created table '${tname}'.`});
        continue;
      }

      const dropM=stmt.match(/^DROP\s+TABLE\s+(\w+)$/i);
      if(dropM){
        const tname=dropM[1].toLowerCase();
        if(!S.practiceLab.tables[tname])throw new Error(`Table '${tname}' does not exist.`);
        delete S.practiceLab.tables[tname];
        outputs.push({type:'msg',text:`Dropped table '${tname}'.`});
        continue;
      }

      const insertM=stmt.match(/^INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
      if(insertM){
        const tname=insertM[1].toLowerCase();
        const t=S.practiceLab.tables[tname];
        if(!t)throw new Error(`Table '${tname}' does not exist.`);
        const cols=splitCsvSafe(insertM[2]).map(c=>c.toLowerCase());
        const vals=splitCsvSafe(insertM[3]).map(parseSQLLiteral);
        if(cols.length!==vals.length)throw new Error('INSERT columns and values count do not match.');
        const row={};
        t.columns.forEach(c=>{row[c.name]=null;});
        cols.forEach((c,i)=>{
          const def=t.columns.find(x=>x.name===c);
          if(!def)throw new Error(`Unknown column '${c}' in table '${tname}'.`);
          row[c]=castByType(vals[i],def.type);
        });
        t.rows.push(row);
        outputs.push({type:'msg',text:`Inserted 1 row into '${tname}'.`});
        continue;
      }

      const updateM=stmt.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if(updateM){
        const tname=updateM[1].toLowerCase();
        const t=S.practiceLab.tables[tname];
        if(!t)throw new Error(`Table '${tname}' does not exist.`);
        const setParts=splitCsvSafe(updateM[2]);
        const assigns=setParts.map(p=>{
          const m=p.match(/^(\w+)\s*=\s*(.+)$/);
          if(!m)throw new Error('Invalid SET clause in UPDATE.');
          return {col:m[1].toLowerCase(),val:parseSQLLiteral(m[2])};
        });
        let count=0;
        t.rows.forEach(r=>{
          const ok=updateM[3]?ew(updateM[3],r):true;
          if(ok){
            assigns.forEach(a=>{
              const def=t.columns.find(x=>x.name===a.col);
              if(!def)throw new Error(`Unknown column '${a.col}' in table '${tname}'.`);
              r[a.col]=castByType(a.val,def.type);
            });
            count++;
          }
        });
        outputs.push({type:'msg',text:`Updated ${count} row(s) in '${tname}'.`});
        continue;
      }

      const deleteM=stmt.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
      if(deleteM){
        const tname=deleteM[1].toLowerCase();
        const t=S.practiceLab.tables[tname];
        if(!t)throw new Error(`Table '${tname}' does not exist.`);
        const before=t.rows.length;
        t.rows=t.rows.filter(r=>deleteM[2]?!ew(deleteM[2],r):false);
        const removed=before-t.rows.length;
        outputs.push({type:'msg',text:`Deleted ${removed} row(s) from '${tname}'.`});
        continue;
      }

      if(/^SELECT\b/i.test(stmt)){
        const res=runSQL(stmt,labSchemaToData());
        if(res.error)throw new Error(res.error);
        outputs.push({type:'table',result:res});
        continue;
      }

      throw new Error(`Unsupported statement: ${stmt.split(/\s+/)[0]}`);
    }

    persistPracticeLab();
    renderPracticeLabOutput(outputs);
    renderPracticeLabTables();
    toast('Practice SQL executed','success');
  }catch(err){
    renderPracticeLabOutput([{type:'err',text:err.message||String(err)}]);
    toast('Practice SQL failed','error');
  }
}

function renderPracticeLabOutput(outputs){
  const wrap=el('practice-lab-output');
  if(!wrap)return;
  wrap.innerHTML=outputs.map(o=>{
    if(o.type==='err')return `<div class="res-panel"><div class="res-hdr"><span style="color:var(--rose);font-weight:700">LAB ERROR</span></div><div style="padding:10px 12px;color:var(--rose);font-family:var(--mono);font-size:12px">${esc(o.text)}</div></div>`;
    if(o.type==='msg')return `<div class="res-panel" style="margin-bottom:8px"><div class="res-hdr"><span style="color:var(--grn);font-weight:700">OK</span></div><div style="padding:8px 12px;color:var(--t1);font-size:12px">${esc(o.text)}</div></div>`;
    const r=o.result;
    return `<div class="res-panel" style="margin-bottom:8px"><div class="res-hdr"><span style="color:var(--ind);font-weight:700">SELECT RESULT</span><span style="color:var(--t2)">${r.rowCount} rows</span></div><div class="res-body"><div class="tw"><table class="tbl"><thead><tr>${r.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row=>`<tr>${row.map(v=>`<td>${v==null?'<span class="tbl-null">NULL</span>':esc(String(v))}</td>`).join('')}</tr>`).join('')||'<tr><td style="color:var(--t3)">No rows</td></tr>'}</tbody></table></div></div></div>`;
  }).join('');
}

function renderPracticeLabTables(){
  const wrap=el('practice-lab-tables');
  if(!wrap)return;
  const tables=Object.entries(S.practiceLab.tables);
  if(!tables.length){wrap.innerHTML='<div class="empty" style="padding:18px"><div class="empty-lbl">No tables in sandbox</div></div>';return;}
  wrap.innerHTML=tables.map(([name,t])=>`
    <div class="card" style="margin-bottom:8px">
      <div class="card-hdr"><div class="card-title" style="color:var(--grn)">${name}</div><span style="font-size:11px;color:var(--t3)">${t.rows.length} rows</span></div>
      <div class="card-body" style="padding:8px 10px">
        <div style="font-size:10.5px;color:var(--t2);font-family:var(--mono);margin-bottom:6px">${t.columns.map(c=>`${c.name} ${c.type}`).join(' , ')}</div>
        <div class="tw"><table class="tbl"><thead><tr>${t.columns.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${t.rows.slice(0,6).map(r=>`<tr>${t.columns.map(c=>`<td>${r[c.name]==null?'<span class="tbl-null">NULL</span>':esc(String(r[c.name]))}</td>`).join('')}</tr>`).join('')||'<tr><td style="color:var(--t3)">No rows</td></tr>'}</tbody></table></div>
      </div>
    </div>`).join('');
}

function markPracticeTaskDone(taskId){
  S.practiceLabTaskDone=S.practiceLabTaskDone||{};
  S.practiceLabTaskDone[taskId]=!S.practiceLabTaskDone[taskId];
  LS.set('practiceLabTaskDone',S.practiceLabTaskDone);
  renderPracticeLabTasks();
}

function togglePracticeTaskAnswer(taskId){
  const box=el(`practice-task-answer-${taskId}`);
  if(!box)return;
  box.classList.toggle('hidden');
}

function renderPracticeLabTasks(){
  const wrap=el('practice-lab-tasks');
  if(!wrap)return;
  const done=S.practiceLabTaskDone||{};
  const isDDL=(taskId)=>taskId.startsWith('ddl-');
  wrap.innerHTML=PRACTICE_LAB_TASKS.map((t,i)=>`
    <div class="card" style="margin-bottom:8px">
      <div class="card-body" style="padding:10px 12px">
        <div class="fx ic sb mb2">
          <div style="font-size:12px;color:var(--t0);font-weight:700">Q${i+1}. ${esc(t.title)}</div>
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);cursor:pointer"><input type="checkbox" ${done[t.id]?'checked':''} onchange="markPracticeTaskDone('${t.id}')">Done</label>
        </div>
        <div style="font-size:12px;color:var(--t1);line-height:1.6;margin-bottom:6px">${esc(t.question)}</div>
        ${isDDL(t.id)?'':'<div style="font-size:11px;color:var(--t3);margin-bottom:8px">Hint: '+esc(t.hint)+'</div>'}
        ${isDDL(t.id)?'':`<button class="btn btn-ghost btn-xs" onclick="togglePracticeTaskAnswer('${t.id}')">Show Sample Answer</button>
        <div class="hidden mt2" id="practice-task-answer-${t.id}" style="background:var(--bg2);border:1px solid var(--line2);border-radius:5px;padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--t1);white-space:pre-wrap">${esc(t.answer)}</div>`}
      </div>
    </div>`).join('');
}

function loadPracticeLabExample(){
  const ta=el('practice-lab-editor');
  if(!ta)return;
  ta.value=`CREATE TABLE practice_orders (id INT, customer TEXT, amount INT);\nINSERT INTO practice_orders (id, customer, amount) VALUES (1, 'Nora', 1500);\nINSERT INTO practice_orders (id, customer, amount) VALUES (2, 'Omar', 2200);\nUPDATE practice_orders SET amount = 2400 WHERE id = 2;\nSELECT * FROM practice_orders ORDER BY amount DESC;`;
}

function resetPracticeLab(){
  S.practiceLab=createDefaultPracticeLab();
  persistPracticeLab();
  renderPracticeLabOutput([{type:'msg',text:'Sandbox reset to default tables.'}]);
  renderPracticeLabTables();
}

/* ══════════════════════════════════════════════════════════
   MOBILE SIDEBAR
══════════════════════════════════════════════════════════ */
function toggleSidebar(){
  const sb=el('sidebar'),bd=el('sb-backdrop'),hb=el('ham-btn');
  const open=sb.classList.toggle('open');
  bd.classList.toggle('show',open);
  hb.classList.toggle('open',open);
}

/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
function nav(view, extra){
  if(view!=='contests')stopContestListCountdown();
  // Close mobile sidebar
  const _sb=el('sidebar'),_bd=el('sb-backdrop'),_hb=el('ham-btn');
  if(_sb)_sb.classList.remove('open');
  if(_bd)_bd.classList.remove('show');
  if(_hb)_hb.classList.remove('open');
  // Sync bottom nav
  document.querySelectorAll('#bottom-nav .bnav').forEach(b=>b.classList.toggle('on',b.dataset.bnav===view));
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.querySelectorAll('.tnav,.slink').forEach(b=>{b.classList.remove('on');});
  const v=el(`view-${view}`);
  if(v)v.classList.remove('hidden');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(b=>b.classList.add('on'));
  S.currentView=view;
  if(view==='home')renderHome();
  if(view==='contests')renderContests();
  if(view==='practice')renderPractice();
  if(view==='submissions')renderSubmissions();
  if(view==='profile')renderProfile();
  if(view==='admin'){if(!isMaster()){nav('home');toast('Access denied','error');return;}renderAdmin();}
  if(view==='custom')renderCustom();
  if(view==='contest-detail'){
    const contestId=typeof extra==='string'?extra:extra?.contestId;
    const contest=getContestById(contestId);
    if(!contest){toast('Contest not found','error');return;}
    S.pendingContestAccess={contestId:contest.id,action:{type:'contest-detail',extra}};
    if(!ensureContestAccess(contest))return;
    S.pendingContestAccess=null;
    renderContestDetail(extra);
  }
  if(view==='judge'){
    if(extra?.contestId){
      const contest=getContestById(extra.contestId);
      if(!contest){toast('Contest not found','error');return;}
      normalizeContestLifecycle(contest);
      if(contest.status==='ended'){
        const endedCtx={...extra,contestId:null,backView:'practice'};
        toast('Contest ended. This will be submitted as practice.','info');
        renderJudge(endedCtx);
        saveRouteState('judge',S.judgeContext);
        return;
      }
      S.pendingContestAccess={contestId:contest.id,action:{type:'judge',extra}};
      if(!ensureContestAccess(contest))return;
      S.pendingContestAccess=null;
      if(!canRevealContestProblems(contest)){
        toast(getContestProblemLockReason(contest)||'Problems are currently locked','warn');
        nav('contest-detail',contest.id);
        return;
      }
    }
    renderJudge(extra);
  }
  if(view==='contest-detail')saveRouteState('contest-detail',{contestId:S.currentContest});
  else if(view==='judge')saveRouteState('judge',S.judgeContext);
  else saveRouteState(view,extra);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
function openAuth(mode='login'){
  el('auth-title').textContent=mode==='login'?'Sign In':'Create Account';
  el('auth-body').innerHTML = mode==='login' ? `
    <div class="fg"><label class="lbl">Username</label><input class="inp" id="au" placeholder="your_username" autocomplete="off"></div>
    <div class="fg"><label class="lbl">Password</label><input class="inp" type="password" id="ap" placeholder="••••••••" autocomplete="current-password"></div>
    <div id="a-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="fx ic sb" style="margin-top:14px">
      <span style="font-size:12px;color:var(--t2)">No account?</span>
      <button class="btn btn-ghost btn-sm" onclick="openAuth('register')">Register →</button>
    </div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="closeModal('modal-auth')">Cancel</button>
      <button class="btn btn-blue btn-md" onclick="doLogin()">Sign In</button>
    </div>` : `
    <div class="fg"><label class="lbl">Username</label><input class="inp" id="ru" placeholder="choose_username" autocomplete="off"></div>
    <div class="fg"><label class="lbl">Email</label><input class="inp" id="re" placeholder="you@example.com" autocomplete="email"></div>
    <div class="fg"><label class="lbl">Password</label><input class="inp" type="password" id="rp" placeholder="At least 8 chars, uppercase, lowercase, number, symbol" autocomplete="new-password"></div>
    <div class="fg"><label class="lbl">Confirm Password</label><input class="inp" type="password" id="rpc" placeholder="Repeat password" autocomplete="new-password"></div>
    <div id="r-err" class="hidden" style="color:var(--rose);font-size:11px;margin-bottom:10px"></div>
    <div class="mfooter" style="padding:14px 0 0;border-top:1px solid var(--line);margin-top:14px;justify-content:flex-end;display:flex;gap:9px">
      <button class="btn btn-ghost btn-md" onclick="openAuth('login')">← Back to Login</button>
      <button class="btn btn-blue btn-md" onclick="doRegister()">Create Account</button>
    </div>`;
  openModal('modal-auth');
  setTimeout(()=>{const f=el('au')||el('ru');if(f)f.focus();},100);
}
async function doLogin(){
  const u=(el('au')||{}).value?.trim(), p=(el('ap')||{}).value;
  if(!u||!p){showAErr('Enter username and password.');return;}
  const userErr=validateUsername(u);
  if(userErr){showAErr(userErr);return;}
  const hp=await hashPassword(p);
  let stored=LS.get(`user:${u}`);

  if(!stored){
    const dbUser=await fetchRelationalAuthUser(u);
    if(!dbUser||!dbUser.passwordHash||dbUser.passwordHash!==hp){
      showAErr('Invalid credentials.');
      return;
    }
    LS.set(`user:${u}`,dbUser);
    finishLogin(dbUser);
    return;
  }

  const ok=stored.passwordHash?stored.passwordHash===hp:stored.password===p;
  if(!ok){
    const dbUser=await fetchRelationalAuthUser(u);
    if(!dbUser||!dbUser.passwordHash||dbUser.passwordHash!==hp){
      showAErr('Invalid credentials.');
      return;
    }
    const merged={...stored,...dbUser,passwordHash:dbUser.passwordHash};
    LS.set(`user:${u}`,merged);
    finishLogin(merged);
    return;
  }

  if(!stored.passwordHash){
    stored.passwordHash=hp;
    delete stored.password;
    LS.set(`user:${u}`,stored);
  }
  finishLogin(stored);
}
async function doRegister(){
  const u=(el('ru')||{}).value?.trim(), p=(el('rp')||{}).value;
  const e=(el('re')||{}).value?.trim();
  const pc=(el('rpc')||{}).value;

  const userErr=validateUsername(u);
  if(userErr){showRErr(userErr);return;}
  const emailErr=validateEmail(e);
  if(emailErr){showRErr(emailErr);return;}
  const passErr=validatePassword(p);
  if(passErr){showRErr(passErr);return;}
  if(p!==pc){showRErr('Passwords do not match.');return;}
  if(LS.get(`user:${u}`)){showRErr('Username already taken.');return;}

  const nu={
    userId:genId(),
    username:u,
    email:e,
    passwordHash:await hashPassword(p),
    role:'contestant',
    score:0,
    solved:0,
    streak:0,
    joinedAt:Date.now(),
  };
  LS.set(`user:${u}`,nu);
  await syncUserToRelational(nu);
  finishLogin(nu);
  closeModal('modal-auth');
  toast(`Welcome, ${u}!`,'success');
}
async function quickLogin(uname,role){
  let u=LS.get(`user:${uname}`);
  if(!u){
    u={
      userId:genId(),
      username:uname,
      email:`${uname}@besql.local`,
      passwordHash:await hashPassword('demo'),
      role,
      score:0,
      solved:0,
      streak:0,
      joinedAt:Date.now(),
    };
    LS.set(`user:${uname}`,u);
    await syncUserToRelational(u);
  }
  finishLogin(u); closeModal('modal-auth');
}
function showAErr(m){const e=el('a-err');if(e){e.textContent=m;show(e);}}
function showRErr(m){const e=el('r-err');if(e){e.textContent=m;show(e);}}
function buildSessionRecord(user){
  if(!user?.username)return null;
  return {
    username:user.username,
    userId:user.userId||null,
    passwordHash:user.passwordHash||null,
    createdAt:Date.now(),
  };
}
function restoreSessionUser(){
  const sess=LS.get('session');
  if(!sess)return null;

  // Backward compatibility for legacy string session format.
  if(typeof sess==='string'){
    const u=LS.get(`user:${sess}`);
    if(u)LS.set('session',buildSessionRecord(u));
    return u||null;
  }

  if(typeof sess!=='object')return null;
  const username=String(sess.username||'').trim();
  if(!username)return null;
  const u=LS.get(`user:${username}`);
  if(!u)return null;
  if(sess.userId&&u.userId&&String(sess.userId)!==String(u.userId))return null;
  if(sess.passwordHash&&u.passwordHash&&String(sess.passwordHash)!==String(u.passwordHash))return null;
  return u;
}
function saveRouteState(view,extra){
  const state={view:String(view||'home')};
  if(state.view==='contest-detail'){
    const contestId=typeof extra==='string'?extra:extra?.contestId||S.currentContest;
    if(contestId)state.contestId=contestId;
  }
  if(state.view==='judge'){
    const ctx=(extra&&typeof extra==='object')?extra:S.judgeContext;
    if(ctx?.problemId){
      state.judgeContext={
        problemId:ctx.problemId,
        contestId:ctx.contestId||null,
        backView:ctx.backView||'practice',
      };
    }
  }
  LS.set('routeState',state);
}
function restoreRouteState(){
  const state=LS.get('routeState');
  if(!state||typeof state!=='object')return false;
  const view=String(state.view||'').trim();
  if(!view)return false;
  if(view==='contest-detail'&&state.contestId){
    nav('contest-detail',state.contestId);
    return true;
  }
  if(view==='judge'&&state.judgeContext?.problemId){
    nav('judge',state.judgeContext);
    return true;
  }
  if(['home','contests','practice','submissions','profile','admin','custom'].includes(view)){
    nav(view);
    return true;
  }
  return false;
}
function finishLogin(user){
  S.user=user;
  // Sync user to Supabase in background - don't wait
  syncUserToRelational(user).catch(err=>console.warn('Background user sync failed:',err));
  LS.set('session',buildSessionRecord(user));
  S.submissions=LS.get(`subs:${user.userId}`)||[];
  closeModal('modal-auth');
  renderTopRight(); renderSidebar();
  nav('home'); toast(`Signed in as ${user.username}`,'success');
}
function doLogout(){S.user=null;LS.del('session');S.submissions=[];LS.del('routeState');renderTopRight();renderSidebar();nav('home');toast('Logged out.','info');}

/* ══════════════════════════════════════════════════════════
   RENDER TOPRIGHT
══════════════════════════════════════════════════════════ */
function renderTopRight(){
  const area=el('topright');
  if(S.user){
    area.innerHTML=`
      <div class="fx ic gap3">
        ${roleBadge(S.user.role)}
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:30px;height:30px;border-radius:6px;background:var(--bg3);border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:var(--grn)">${esc(S.user.username[0].toUpperCase())}</div>
          <div>
            <div class="tr-username" style="font-size:12px;color:var(--t0)">${esc(S.user.username)}</div>
            <div style="font-size:11px;color:var(--gold);font-weight:700">${fmtN(S.user.score||0)} pts</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Logout</button>
      </div>`;
    const showAdmin=isMaster();
    ['nav-admin','sb-admin'].forEach(id=>{const e=el(id);if(e)e.style.display=showAdmin?'':'none';});
    tog('btn-create-contest', showAdmin);
  } else {
    area.innerHTML=`<button class="btn btn-primary btn-sm" onclick="openAuth('login')">Sign In</button>`;
    ['nav-admin','sb-admin'].forEach(id=>{const e=el(id);if(e)e.style.display='none';});
    hide('btn-create-contest');
  }
}

function renderSidebar(){
  el('sb-online').textContent=S.onlineCount;
  const live=getVisibleContestsForList().filter(c=>c.status==='live').length;
  el('sb-live-count').textContent=live;
}

function isOwnedByCurrentUser(ownerRef){
  if(!S.user||ownerRef==null)return false;
  const owner=String(ownerRef).trim().toLowerCase();
  const refs=[S.user.userId,S.user.username,S.user.email]
    .filter(Boolean)
    .map(v=>String(v).trim().toLowerCase());
  return refs.includes(owner);
}

function isContestVisibleToCurrentUser(contest){
  return !!contest;
}

function getVisibleContestsForList(){
  return [...S.contests,...S.customContests].filter(isContestVisibleToCurrentUser);
}

function getContestById(contestId){
  return getVisibleContestsForList().find(c=>c.id===contestId)
    || S.contests.find(c=>c.id===contestId)
    || S.customContests.find(c=>c.id===contestId)
    || null;
}

function getEmbargoedProblemIds(){
  const embargoed=new Set();
  [...S.contests,...S.customContests].forEach(c=>{
    // Only explicitly flagged contests should hide practice problems.
    // User-created contests should never remove problems from daily/practice counts.
    if(!c||c.status!=='upcoming'||c.hideInPractice!==true)return;
    (c.problemIds||[]).forEach(pid=>embargoed.add(pid));
  });
  return embargoed;
}

function getPublicPracticeProblems(){
  const embargoed=getEmbargoedProblemIds();
  return S.problems.filter(p=>!embargoed.has(p.id));
}

function ensureContestAccess(contest){
  if(!contest)return false;
  if(contest.isPublic)return true;
  if(isMaster())return true;
  if(isOwnedByCurrentUser(contest.createdBy))return true;
  if(isContestParticipant(contest))return true;
  if(S.unlockedPrivateContests[contest.id])return true;
  if(!S.user){
    toast('Sign in to access private contest','warn');
    openAuth('login');
    return false;
  }
  openContestPasswordModal(contest);
  return false;
}

function openContestPasswordModal(contest){
  if(!contest)return;
  S.pendingContestAccess={contestId:contest.id,action:S.pendingContestAccess?.action||null};
  const msg=el('contest-pass-msg');
  if(msg)msg.textContent=`${contest.title} is private. Enter the contest password to continue.`;
  const inp=el('contest-pass-input');
  if(inp)inp.value='';
  openModal('modal-contest-password');
  if(inp)setTimeout(()=>inp.focus(),20);
}

function closeContestPasswordModal(){
  closeModal('modal-contest-password');
  S.pendingContestAccess=null;
}

function submitContestPassword(){
  const pending=S.pendingContestAccess;
  if(!pending?.contestId){
    closeContestPasswordModal();
    return;
  }
  const contest=getContestById(pending.contestId);
  if(!contest){
    closeContestPasswordModal();
    return;
  }
  const entered=((el('contest-pass-input')||{}).value||'').trim();
  if(!entered){toast('Enter contest password','warn');return;}
  if(String(entered)!==String(contest.password||'')){
    toast('Incorrect contest password','error');
    return;
  }
  S.unlockedPrivateContests[contest.id]=true;
  closeModal('modal-contest-password');
  const action=pending.action;
  S.pendingContestAccess=null;
  if(action?.type==='contest-detail')return nav('contest-detail',action.extra);
  if(action?.type==='judge')return nav('judge',action.extra);
  if(action?.type==='join')return joinContest(action.contestId);
}

function isContestParticipant(contest){
  if(!contest||!S.user)return false;
  if(isMaster())return true;
  if(isOwnedByCurrentUser(contest.createdBy))return true;
  const uid=S.user.userId;
  const participants=Array.isArray(contest.participants)?contest.participants:[];
  if(uid&&participants.includes(uid))return true;
  return S.submissions.some(s=>s.contestId===contest.id);
}

function getContestProblemLockReason(contest){
  if(!contest)return 'Contest not found.';
  if(!hasContestStarted(contest))return `This contest is scheduled for ${fmtDate(contest.startTime)}. Problems will unlock when the contest starts.`;
  if(contest.status!=='ended'&&!isContestParticipant(contest))return 'Only participants can view problems while the contest is live.';
  return '';
}

function normalizeContestLifecycle(contest){
  if(!contest)return contest;
  const nowTs=Date.now();
  if(contest.status==='upcoming'&&nowTs>contest.startTime)contest.status='live';
  if(contest.status==='live'&&nowTs>contest.endTime)contest.status='ended';
  if(contest.status==='ended'){
    contest.isPublic=true;
    contest.password='';
  }
  return contest;
}

function canRevealContestProblems(contest){
  if(!contest)return false;
  if(isAdmin())return true;
  if(!hasContestStarted(contest))return false;
  if(contest.status==='ended')return true;
  if(isOwnedByCurrentUser(contest.createdBy))return true;
  return isContestParticipant(contest);
}

function persistContestEntity(updatedContest){
  if(!updatedContest)return;
  const updateIn=(arr)=>{
    const i=arr.findIndex(c=>c.id===updatedContest.id);
    if(i>=0){arr[i]=updatedContest;return true;}
    return false;
  };
  if(!updateIn(S.contests))updateIn(S.customContests);
  LS.set('contests',S.contests.map(({announce,...r})=>r));
  LS.set('customContests',S.customContests);
  if(S.user?.userId){
    const mine=S.customContests.filter(c=>isOwnedByCurrentUser(c.createdBy));
    LS.set(`custom:${S.user.userId}`,mine);
  }
  syncContestToRelational(updatedContest).catch(err=>console.warn('Background contest sync failed:',err));
}

function joinContest(contestId){
  if(!S.user){toast('Please sign in to participate','warn');openAuth('login');return;}
  const contest=getContestById(contestId);
  if(!contest)return;
  S.pendingContestAccess={contestId:contest.id,action:{type:'join',contestId:contest.id}};
  if(!ensureContestAccess(contest))return;
  S.pendingContestAccess=null;
  const uid=S.user.userId;
  const participants=new Set(Array.isArray(contest.participants)?contest.participants:[]);
  participants.add(uid);
  const updated={...contest,participants:[...participants]};
  persistContestEntity(updated);
  toast('Joined contest as participant','success');
  renderContestDetail(contest.id);
}

/* ══════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════ */
function renderHome(){
  const solved=getSolvedIds();
  const publicProblems=getPublicPracticeProblems();
  const total=publicProblems.length;

  el('home-greeting').textContent=S.user?`Welcome back, ${S.user.username}`:'Welcome to BeSQL';
  el('home-sub').textContent=S.user?`${S.user.role.toUpperCase()} · ${fmtN(S.user.score||0)} points`:'Sign in to compete';

  // Stats
  el('home-stats').innerHTML=[
    {l:'Problems',v:total,c:'var(--ind)'},
    {l:'Your Solved',v:solved.size,c:'var(--grn)'},
    {l:'Live Contests',v:getVisibleContestsForList().filter(c=>c.status==='live').length,c:'var(--rose)'},
    {l:'Your Rank',v:getUserRank(),c:'var(--gold)'},
  ].map(s=>`<div class="stat"><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:7px">${s.l}</div><div class="stat-v" style="color:${s.c}">${s.v}</div></div>`).join('');

  // Streak display
  el('home-streak').innerHTML=S.user?`<div class="fx ic gap2"><span style="font-size:20px"></span><div><div style="font-size:22px;font-weight:800;color:var(--gold)">${S.user.streak||0}</div><div style="font-size:10px;color:var(--t3);letter-spacing:1px">DAY STREAK</div></div></div>`:'';

  // Active contests
  const active=getVisibleContestsForList().filter(c=>c.status==='live'||c.status==='upcoming').slice(0,4);
  el('home-contests').innerHTML=active.length?active.map(c=>`
    <div style="display:flex;align-items:center;gap:12px;padding:11px 15px;border-bottom:1px solid var(--line);cursor:pointer;transition:background .1s" onmouseenter="this.style.background='var(--bg2)'" onmouseleave="this.style.background=''" onclick="nav('contest-detail','${c.id}')">
      ${c.status==='live'?'<div class="live-dot"></div>':'<span style="font-size:14px"></span>'}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--t0);font-weight:500" class="trunc">${esc(c.title)}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px">${c.status==='live'?'In progress':fmtDate(c.startTime)} · ${c.problemIds.length} problems</div>
      </div>
      ${c.status==='live'?'<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>':''}
    </div>`).join(''):'<div class="empty"><div class="empty-ico"></div><div style="font-size:12px;color:var(--t3)">No active contests</div></div>';

  // Daily problem
  const daily=publicProblems.find(p=>p.dailyDate===getTodayStr())||publicProblems[0];
  el('daily-badge').className=daily?diffCls(daily.difficulty):'diff-easy';
  el('home-daily').innerHTML=daily?`
    <div style="font-size:17px;font-weight:800;margin-bottom:6px">${esc(daily.title)}</div>
    <div style="font-size:12px;color:var(--t1);line-height:1.7;margin-bottom:12px">${esc(daily.description.slice(0,140))}${daily.description.length>140?'...':''}</div>
    <div class="fx ic gap3">
      <div class="fx gap2 flex-wrap">${daily.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      <button class="btn btn-blue btn-md" onclick="nav('judge',{problemId:'${daily.id}',backView:'home'})">Solve →</button>
    </div>`:'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>';

  // Mini scoreboard
  const lb=buildLeaderboard().slice(0,8);
  el('home-scoreboard').innerHTML=lb.map((p,i)=>`
    <div class="fx ic gap2 ${i===0?'sb-rank-gold':i===1?'sb-rank-silver':i===2?'sb-rank-bronze':''} ${S.user&&p.userId===S.user.userId?'sb-me':''}" style="padding:9px 14px;border-bottom:1px solid var(--line)">
      <div class="rm ${i===0?'rm1':i===1?'rm2':i===2?'rm3':'rmn'}">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:${S.user&&p.userId===S.user.userId?'var(--ind)':'var(--t0)'}" class="trunc">${esc(p.username)}</div>
        <div style="font-size:10px;color:var(--t3)">${p.solved} solved</div>
      </div>
      <div style="font-size:14px;font-weight:800;color:var(--gold)">${fmtN(p.score)}</div>
    </div>`).join('')||'<div class="empty"><div class="empty-ico"></div></div>';

  // Progress card
  const pct=total?Math.round(solved.size/total*100):0;
  el('home-progress').innerHTML=`
    <div style="margin-bottom:14px">
      <div class="fx ic sb mb1" style="font-size:11px;color:var(--t2)"><span>OVERALL PROGRESS</span><span>${solved.size}/${total}</span></div>
      <div class="pbar"><div class="pfill" style="width:${pct}%;background:var(--ind)"></div></div>
    </div>
    ${['Easy','Medium','Hard','Expert'].map(d=>{
      const dp=publicProblems.filter(p=>p.difficulty===d);
      const ds=dp.filter(p=>solved.has(p.id)).length;
      const dp2=Math.round(dp.length?ds/dp.length*100:0);
      const color=d==='Easy'?'var(--grn)':d==='Medium'?'var(--gold)':d==='Hard'?'var(--rose)':'var(--violet)';
      return `<div style="margin-bottom:10px"><div class="fx ic sb mb1"><span class="${diffCls(d)}">${d}</span><span style="font-size:11px;color:var(--t2)">${ds}/${dp.length}</span></div><div class="pbar"><div class="pfill" style="width:${dp2}%;background:${color}"></div></div></div>`;
    }).join('')}`;
}

function getUserRank(){
  if(!S.user) return '—';
  const lb=buildLeaderboard();
  const i=lb.findIndex(e=>e.userId===S.user.userId);
  return i>=0?`#${i+1}`:'—';
}

function buildLeaderboard(){
  const userKeys=LS.keys('user:');
  const users=userKeys.map(k=>LS.get(k)).filter(u=>u&&u.userId);
  return users.map(u=>({userId:u.userId,username:u.username,score:u.score||0,solved:u.solved||0,role:u.role})).sort((a,b)=>b.score-a.score);
}

/* ══════════════════════════════════════════════════════════
   CONTESTS
══════════════════════════════════════════════════════════ */
function filterContests(){
  renderContests();
}
function stopContestListCountdown(){
  if(window._contestListInterval){
    clearInterval(window._contestListInterval);
    window._contestListInterval=null;
  }
}
function startContestListCountdown(){
  if(window._contestListInterval)return;
  window._contestListInterval=setInterval(()=>{
    if(S.currentView!=='contests'){
      stopContestListCountdown();
      return;
    }
    renderContests();
  },1000);
}
function renderContests(){
  const filter=(el('contest-filter')||{}).value||'all';
  const allContests=getVisibleContestsForList();
  const list=filter==='all'?allContests:allContests.filter(c=>c.status===filter);
  el('contest-list').innerHTML=list.length?list.map(c=>contestCardHTML(c)).join(''):'<div class="empty"><div class="empty-ico"></div><div style="font-size:12px;color:var(--t3)">No contests found</div></div>';
  if(S.currentView==='contests')startContestListCountdown();
}
function contestCardHTML(c){
  const probs=S.problems.filter(p=>c.problemIds.includes(p.id));
  const revealProblems=canRevealContestProblems(c);
  const lockReason=getContestProblemLockReason(c);
  const nowTs=Date.now();
  const msToStart=Math.max(0,c.startTime-nowTs);
  const msToEnd=Math.max(0,c.endTime-nowTs);
  const timeText=c.status==='live'
    ? `Ends in ${fmtCountdownDHMS(msToEnd/1000)}`
    : c.status==='upcoming'
      ? `Starts in ${fmtCountdownDHMS(msToStart/1000)}`
      : `Ended ${fmtDate(c.endTime)}`;
  return `
    <div class="contest-card ${c.status} mb3" onclick="nav('contest-detail','${c.id}')">
      <div class="fx ic sb mb2">
        <div class="fx ic gap3">
          ${c.status==='live'?'<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>':
            c.status==='upcoming'?'<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--idim);color:var(--ind);border:1px solid rgba(77,158,255,.3)">UPCOMING</span>':
            '<span style="font-size:10px;color:var(--t3);padding:2px 8px;border-radius:10px;border:1px solid var(--line)">ENDED</span>'}
          <span style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">${c.type==='custom'?'Custom':'Official'}</span>
        </div>
        <span style="font-size:11px;color:var(--t2)">${revealProblems?`${probs.length} problems`:'Problems hidden'} · ${fmtDur(c.duration*60000)}</span>
      </div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.3">${esc(c.title)}</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:12px;line-height:1.6">${esc(c.description)}</div>
      <div class="fx ic gap3 flex-wrap">
        ${revealProblems?probs.map(p=>`<span class="tag">${esc(p.title)}</span>`).join(''):`<span class="tag">${esc(lockReason||'Problems are currently locked')}</span>`}
        <div style="margin-left:auto;font-size:11px;color:var(--t2)">
          ${timeText}
        </div>
      </div>
    </div>`;
}

function renderContestDetail(contestId){
  const cid=contestId||S.currentContest;
  S.currentContest=cid;
  const c=getContestById(cid);
  if(!c){nav('contests');return;}
  el('cd-title').textContent=c.title;
  const probs=S.problems.filter(p=>c.problemIds.includes(p.id));
  const revealProblems=canRevealContestProblems(c);
  const participant=isContestParticipant(c);
  el('cd-meta').innerHTML=`
    ${c.status==='live'?'<span class="live-pill"><div class="live-dot" style="width:6px;height:6px"></div>LIVE</span>':''}
    <span style="font-size:11px;color:var(--t2)">${revealProblems?`${probs.length} problems`:'Problems hidden'}</span>
    <span style="font-size:11px;color:var(--t2)">${fmtDur(c.duration*60000)}</span>
    ${participant?'<span class="tag">Participant</span>':'<span class="tag">Spectator</span>'}
    ${c.isPublic?'<span class="tag">Public</span>':'<span class="tag">Private</span>'}`;
  // Timer
  const timerWrap=el('cd-timer-wrap');
  stopContestCountdown();
  if(c.status==='live'){
    const left=Math.max(0,Math.floor((c.endTime-Date.now())/1000));
    timerWrap.innerHTML=`<div style="text-align:right"><div style="font-size:10px;color:var(--t3);letter-spacing:1px">TIME LEFT</div><div class="countdown" id="cd-countdown">${fmtCountdownDHMS(left)}</div></div>`;
    startContestCountdown(c.endTime,()=>{
      normalizeContestLifecycle(c);
      renderContestDetail(c.id);
      renderContests();
      renderSidebar();
    });
  } else if(c.status==='upcoming'&&hasContestStarted(c)===false){
    const untilStart=Math.max(0,Math.floor((c.startTime-Date.now())/1000));
    timerWrap.innerHTML=`<div style="text-align:right"><div style="font-size:10px;color:var(--t3);letter-spacing:1px">STARTS IN</div><div class="countdown" id="cd-countdown">${fmtCountdownDHMS(untilStart)}</div></div>`;
    startContestCountdown(c.startTime,()=>{
      normalizeContestLifecycle(c);
      renderContestDetail(c.id);
      renderContests();
      renderSidebar();
    });
  } else {
    timerWrap.innerHTML='';
  }
  renderCDProblems(c,probs);
  renderCDScoreboard(c);
  renderCDSubs(c);
  renderCDAnnounce(c);
}

function stopContestCountdown(){
  if(window._cdInterval){
    clearInterval(window._cdInterval);
    window._cdInterval=null;
  }
}

function startContestCountdown(targetTime,onComplete){
  if(window._cdInterval) clearInterval(window._cdInterval);
  window._cdInterval=setInterval(()=>{
    const left=Math.max(0,Math.floor((targetTime-Date.now())/1000));
    const el2=el('cd-countdown');
    if(el2){el2.textContent=fmtCountdownDHMS(left);if(left<300)el2.classList.add('urgent');}
    if(left<=0){
      stopContestCountdown();
      if(typeof onComplete==='function')onComplete();
    }
  },1000);
}

function renderCDProblems(c,probs){
  if(!canRevealContestProblems(c)){
    const participant=isContestParticipant(c);
    const canJoin=c.status!=='ended'&&!participant&&!isOwnedByCurrentUser(c.createdBy)&&!isMaster();
    const reason=getContestProblemLockReason(c)||'Problems are currently locked.';
    el('cd-problems').innerHTML=`<div class="card"><div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">🔒</div><div style="font-size:12px;color:var(--t2)">${esc(reason)}</div>${canJoin?`<button class="btn btn-blue btn-sm" style="margin-top:10px" onclick="joinContest('${c.id}')">Join As Participant</button>`:''}</div></div>`;
    return;
  }
  const solved=getSolvedIdsInContest(c.id);
  el('cd-problems').innerHTML=`<div class="card">${probs.length?probs.map((p,i)=>`
    <div class="prob-row ${solved.has(p.id)?'solved':''}" onclick="${solved.has(p.id)?"toast('Already solved in this contest. Reattempt is disabled.','info')":`openContestProblem('${c.id}','${p.id}')`}">
      <div class="prob-num">${String.fromCharCode(65+i)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--t0)">${esc(p.title)}</div>
        <div class="fx ic gap2 mt1">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <div class="fx ic gap3">
        <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
        <span style="font-size:12px;color:var(--gold);font-weight:700">${p.points}pt</span>
        ${solved.has(p.id)?'<span style="color:var(--grn);font-weight:700;font-size:12px;margin-left:2px">AC</span>':''}
        ${c.status!=='ended'?(
          solved.has(p.id)
            ? '<button class="btn btn-ghost btn-xs" disabled>Solved</button>'
            : `<button class="btn btn-blue btn-xs" onclick="event.stopPropagation();openContestProblem('${c.id}','${p.id}')">Solve</button>`
        ):`<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openContestProblem('${c.id}','${p.id}')">Practice</button>`}
      </div>
    </div>`).join(''):'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}</div>`;
}

function openContestProblem(contestId,problemId){
  const contest=getContestById(contestId);
  if(!contest){toast('Contest not found','error');return;}
  normalizeContestLifecycle(contest);
  if(contest.status==='ended'){
    toast('Contest ended. Opening as practice problem.','info');
    nav('judge',{problemId,contestId:null,backView:'practice'});
    return;
  }
  nav('judge',{problemId,contestId:contest.id,backView:'contest-detail'});
}

function buildContestLeaderboard(contest){
  const userById=new Map();
  LS.keys('user:').forEach(k=>{
    const u=LS.get(k);
    if(u&&u.userId)userById.set(u.userId,u);
  });

  const allSubs=LS.keys('subs:')
    .map(k=>LS.get(k))
    .filter(Array.isArray)
    .flat()
    .filter(s=>s&&s.contestId===contest.id)
    .filter(s=>{
      const at=Number(s.at||0);
      if(!Number.isFinite(at)||at<=0)return false;
      return at>=Number(contest.startTime||0)&&at<=Number(contest.endTime||0);
    });

  const problemById=new Map(
    (contest.problemIds||[])
      .map(pid=>S.problems.find(p=>p.id===pid))
      .filter(Boolean)
      .map(p=>[p.id,p])
  );

  const byUser=new Map();
  const sortedSubs=[...allSubs].sort((a,b)=>Number(a.at||0)-Number(b.at||0));

  sortedSubs.forEach(sub=>{
    const uid=sub.userId;
    if(!uid)return;
    if(!byUser.has(uid)){
      const u=userById.get(uid);
      byUser.set(uid,{
        userId:uid,
        username:u?.username||'User',
        score:0,
        solved:0,
        totalTime:0,
        lastAt:0,
        solvedProblems:new Set(),
      });
    }
    const row=byUser.get(uid);
    row.lastAt=Math.max(row.lastAt,Number(sub.at||0));
    if(sub.verdict!=='AC')return;
    if(row.solvedProblems.has(sub.problemId))return;
    const prob=problemById.get(sub.problemId);
    row.solvedProblems.add(sub.problemId);
    row.solved+=1;
    row.score+=Number(prob?.points||0);
    row.totalTime+=Math.max(0,Number(sub.timeTaken||0));
  });

  return [...byUser.values()].sort((a,b)=>{
    if(b.score!==a.score)return b.score-a.score;
    if(b.solved!==a.solved)return b.solved-a.solved;
    if(a.totalTime!==b.totalTime)return a.totalTime-b.totalTime;
    if(a.lastAt!==b.lastAt)return a.lastAt-b.lastAt;
    return String(a.username).localeCompare(String(b.username));
  });
}

function renderCDScoreboard(c){
  const lb=buildContestLeaderboard(c);
  el('cd-scoreboard').innerHTML=`<div class="card"><div class="tw"><table class="tbl">
    <thead><tr><th>Rank</th><th>User</th><th>Score</th><th>Solved</th><th>Time</th></tr></thead>
    <tbody>${lb.length?lb.slice(0,20).map((p,i)=>`
      <tr class="${i===0?'sb-rank-gold':i===1?'sb-rank-silver':i===2?'sb-rank-bronze':''} ${S.user&&p.userId===S.user.userId?'sb-me':''}">
        <td><div class="rm ${i<3?`rm${i+1}`:'rmn'}">${i+1}</div></td>
        <td style="font-weight:${S.user&&p.userId===S.user.userId?700:400};color:${S.user&&p.userId===S.user.userId?'var(--ind)':'var(--t0)'}">${esc(p.username)}</td>
        <td style="color:var(--gold);font-weight:700">${fmtN(p.score)}</td>
        <td style="color:var(--grn)">${p.solved}</td>
        <td style="color:var(--t2)">${fmtT(p.totalTime)}</td>
      </tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:16px">No contest submissions yet</td></tr>'}
    </tbody></table></div></div>`;
}

function renderCDSubs(c){
  const subs=S.submissions.filter(s=>s.contestId===c.id);
  el('cd-my-subs').innerHTML=`<div class="card">${subs.length?subs.reverse().map(s=>{
    const p=S.problems.find(x=>x.id===s.problemId);
    return `<div class="sub-row">
      <span class="sub-time" style="font-size:10px;color:var(--t3);width:120px;flex-shrink:0">${new Date(s.at).toLocaleTimeString()}</span>
      <span style="flex:1" class="trunc">${esc(p?.title||s.problemId)}</span>
      <span class="v-${s.verdict.toLowerCase()}">${s.verdict}</span>
      ${s.verdict==='AC'?`<span style="font-size:11px;color:var(--t2)">${s.timeTaken}s</span>`:''}
    </div>`;}).join(''):'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px">No submissions yet</div></div>'}</div>`;
}

function renderCDAnnounce(c){
  el('cd-announces').innerHTML=c.announcement?`
    <div class="card"><div class="card-body">
      <div style="font-size:11px;color:var(--t3);letter-spacing:1px;margin-bottom:6px">FROM ADMIN</div>
      <div style="font-size:13px;color:var(--t1);line-height:1.8">${esc(c.announcement)}</div>
    </div></div>`:
    '<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No announcements</div></div>';
}

function cdTab(tab,btn){
  document.querySelectorAll('#view-contest-detail .tab-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#view-contest-detail .tab-content').forEach(c=>c.classList.add('hidden'));
  btn.classList.add('on');
  el(`cd-tab-${tab}`).classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   JUDGE (Problem Solver)
══════════════════════════════════════════════════════════ */
function renderJudge(ctx){
  if(!ctx){nav('home');return;}
  S.judgeContext=ctx;
  const p=S.problems.find(x=>x.id===ctx.problemId);
  if(!p){toast('Problem not found','error');nav(ctx.backView||'home');return;}

  el('judge-back-btn').onclick=()=>nav(ctx.backView||'home',ctx.contestId);
  el('judge-diff').textContent=p.difficulty;
  el('judge-diff').className=diffCls(p.difficulty);
  el('judge-pts').textContent=`+${p.points}`;
  el('judge-title').textContent=p.title;
  const codeEl=el('judge-code');
  if(codeEl)codeEl.textContent=p.code||p.id.toUpperCase();

  // Build rich problem description with sample output + schema
  let descHTML=`<div style="font-size:13px;color:var(--t1);line-height:1.8;white-space:pre-line">${esc(p.description)}</div>`;

  // Sample output table
  if(p.sampleOutput&&p.sampleOutput.columns){
    const so=p.sampleOutput;
    descHTML+=`<div class="prob-section">
      <div class="prob-section-title">Sample Output</div>
      <div style="overflow-x:auto"><table class="sample-table">
        <thead><tr>${so.columns.map(col=>`<th>${esc(col)}</th>`).join('')}</tr></thead>
        <tbody>${so.rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div style="font-size:11px;color:var(--t3);margin-top:5px">Sample rows only — your query must return all matching rows.</div>
    </div>`;
  }

  // Schema reference
  if(p.schemaHint){
    const sh=p.schemaHint;
    descHTML+=`<div class="prob-section">
      <div class="prob-section-title">Schema: <span style="color:var(--grn);font-family:var(--mono);font-size:11px">${esc(sh.table)}</span></div>
      <div style="overflow-x:auto"><table class="schema-table">
        <thead><tr><th>Column</th><th>Type</th></tr></thead>
        <tbody>${sh.columns.map(([col,type])=>`<tr><td class="col-name">${esc(col)}</td><td class="col-type">${esc(type)}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  // Always show available tables summary so users know what's in the DB
  descHTML+=`<div class="prob-section">
    <div class="prob-section-title">Available Tables</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
      ${[
        {name:'employees',cols:'id, name, dept_id, salary, hire_year, age, level'},
        {name:'departments',cols:'id, name, budget, location, headcount'},
        {name:'orders',cols:'id, customer, product_id, amount, status, month'},
        {name:'products',cols:'id, name, category, price, stock'},
        {name:'students',cols:'id, name, grade, course_id, year, gpa'},
        {name:'courses',cols:'id, name, credits, instructor, dept'},
      ].map(t=>`<div style="background:var(--bg2);border:1px solid var(--line2);border-radius:5px;padding:7px 10px;min-width:0">
        <div style="font-size:11px;font-weight:700;color:var(--grn);font-family:var(--mono);margin-bottom:3px">${t.name}</div>
        <div style="font-size:10.5px;color:var(--t3);font-family:var(--mono);line-height:1.6">${t.cols}</div>
      </div>`).join('')}
    </div>
  </div>`;

  el('judge-desc').innerHTML=descHTML;
  el('judge-tags').innerHTML=p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('');

  // Test cases — hidden-only to prevent hardcoding against visible checks
  const publicCases=p.testCases.filter(tc=>!tc.hidden);
  const hiddenCount=p.testCases.length-publicCases.length;
  el('tc-list').innerHTML=publicCases.length?publicCases.map((tc,i)=>`
    <div class="tc-row tc-pending mb2" id="tc-row-${tc.id}">
      <span style="font-size:10px;font-weight:700;color:var(--t3);font-family:var(--mono);width:22px;flex-shrink:0;text-align:center">${i+1}</span>
      <span style="flex:1;font-size:12px;color:var(--t1)">Test Case ${i+1}</span>
      <span style="font-size:14px;font-weight:700;font-family:var(--mono);color:var(--t3);width:20px;text-align:center" id="tc-status-${tc.id}">–</span>
    </div>`).join(''):`<div class="tc-row" style="border-left-color:var(--ind);background:var(--idim)">
      <span style="font-size:11px;color:var(--ind);font-weight:600">Hidden evaluator active: ${hiddenCount} private test cases</span>
    </div>`;
  el('tc-summary').textContent=`${publicCases.length} public · ${hiddenCount} hidden`;

  // Previous submission (editor value set in bind editor section below)
  const prevSub=S.submissions
    .filter(s=>s.problemId===p.id&&(ctx?.contestId?s.contestId===ctx.contestId:true))
    .sort((a,b)=>b.at-a.at)[0];
  clearJudgeState();

  // Timer
  if(S.judgeTimer) clearInterval(S.judgeTimer);
  S.judgeElapsed=0;
  S.judgeTimer=setInterval(()=>{
    S.judgeElapsed++;
    const te=el('judge-timer-small');
    if(te){
      te.innerHTML=`<span style="font-size:11px;font-weight:600;font-family:var(--mono);color:var(--t2)">${fmtT(S.judgeElapsed)}</span>`;
    }
  },1000);

  // Bind editor — replace node to clear any stacked listeners from previous problem
  const edOld=el('judge-editor');
  const edNew=edOld.cloneNode(true);
  edOld.parentNode.replaceChild(edNew,edOld);
  const ed=edNew;
  ed.value=prevSub?.code||'';
  el('judge-chars').textContent=`${(prevSub?.code||'').length}`;
  ed.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();judgeRun();}
    if(e.key==='Tab'){e.preventDefault();const s=e.target.selectionStart;ed.value=ed.value.slice(0,s)+'  '+ed.value.slice(e.target.selectionEnd);ed.selectionStart=ed.selectionEnd=s+2;}
  });
  ed.addEventListener('input',()=>{el('judge-chars').textContent=ed.value.length;});

  // Solved state
  const isSolved=isSolvedForJudgeContext(p.id,S.judgeContext);
  el('btn-judge-submit').disabled=isSolved;
  el('btn-judge-submit').textContent=isSolved?'Solved':'Submit';
  updateJudgeNextButton();
}

function judgeEditorClear(){
  el('judge-editor').value='';el('judge-chars').textContent='0';
  clearJudgeState();
  const p=S.problems.find(x=>x.id===S.judgeContext?.problemId);
  if(p)p.testCases.forEach(tc=>resetTC(tc.id));
}

function resetTC(tcId){
  const row=el(`tc-row-${tcId}`);
  const ico=el(`tc-status-${tcId}`);
  if(row)row.className='tc-row tc-pending mb2';
  if(ico){ico.textContent='–';ico.style.color='var(--t3)';}
}
function clearJudgeState(){
  // Fully reset ALL judge panel state when loading a new problem
  const verdict=el('judge-verdict');
  const feedback=el('judge-feedback');
  const result=el('judge-result');
  const rowCount=el('judge-row-count');
  const tcSummary=el('tc-summary');
  const timerSmall=el('judge-timer-small');
  if(verdict)verdict.innerHTML='';
  if(feedback){feedback.innerHTML='';feedback.classList.add('hidden');}
  if(result){result.innerHTML='';result.classList.add('hidden');}
  if(rowCount)rowCount.textContent='';
  if(tcSummary)tcSummary.textContent='— test cases';
  if(timerSmall)timerSmall.innerHTML='';
}

function getJudgeProblemSequence(ctx){
  if(!ctx)return [];
  if(ctx.contestId){
    const contest=getContestById(ctx.contestId);
    if(!contest||!Array.isArray(contest.problemIds))return [];
    return contest.problemIds.map(pid=>S.problems.find(p=>p.id===pid)).filter(Boolean);
  }
  if(ctx.backView==='practice'){
    const publicProblems=getPublicPracticeProblems();
    if(S.practiceFilter&&S.practiceFilter!=='All'){
      return publicProblems.filter(p=>p.difficulty===S.practiceFilter);
    }
    return [...publicProblems];
  }
  if(ctx.backView==='home'){
    const today=getTodayStr();
    const publicProblems=getPublicPracticeProblems();
    const daily=publicProblems.filter(p=>p.dailyDate===today);
    return daily.length?daily:[...publicProblems];
  }
  return [...S.problems];
}

function getNextJudgeProblem(ctx){
  if(!ctx)return null;
  const seq=getJudgeProblemSequence(ctx);
  if(!seq.length)return null;
  const idx=seq.findIndex(p=>p.id===ctx.problemId);
  if(idx<0||idx>=seq.length-1)return null;
  return seq[idx+1];
}

function moveToNextJudgeProblem(){
  const ctx=S.judgeContext;
  if(!ctx)return;
  const next=getNextJudgeProblem(ctx);
  if(!next){toast('No next problem in this track','info');return;}
  nav('judge',{
    problemId:next.id,
    contestId:ctx.contestId||null,
    backView:ctx.backView||'practice',
  });
}

function updateJudgeNextButton(){
  const btn=el('btn-judge-next');
  if(!btn)return;
  const next=getNextJudgeProblem(S.judgeContext||{});
  btn.style.display=next?'inline-flex':'none';
  btn.onclick=next?moveToNextJudgeProblem:null;
}

function resetJudgeExecutionState(problem){
  const verdict=el('judge-verdict');
  const feedback=el('judge-feedback');
  if(verdict)verdict.innerHTML='';
  if(feedback){
    feedback.innerHTML='';
    feedback.classList.add('hidden');
  }
  if(problem?.testCases){
    problem.testCases.forEach(tc=>resetTC(tc.id));
    const publicTotal=problem.testCases.filter(tc=>!tc.hidden).length;
    const hiddenCount=problem.testCases.length-publicTotal;
    const summary=el('tc-summary');
    if(summary)summary.textContent=`${publicTotal} public · ${hiddenCount} hidden`;
  }
}

function judgeRun(){
  const p=S.problems.find(x=>x.id===S.judgeContext?.problemId);
  if(!p)return;
  const sql=el('judge-editor').value;
  if(!sql.trim()){toast('Write a query first','warn');return;}
  resetJudgeExecutionState(p);
  el('btn-judge-run').textContent='Running...'; el('btn-judge-run').disabled=true;

  setTimeout(()=>{
    const result=runSQL(sql,DB);
    showJudgeResult(result);
    runTestCases(p,result,false);
    el('btn-judge-run').textContent='Run & Test'; el('btn-judge-run').disabled=false;
  },120);
}

function runTestCases(p,result,isSubmit){
  let passed=0;
  let publicPassed=0;
  const publicTotal=p.testCases.filter(tc=>!tc.hidden).length;
  p.testCases.forEach(tc=>{
    const row=el(`tc-row-${tc.id}`);
    const ico=el(`tc-status-${tc.id}`);
    if(result.error){
      if(row){
        row.className='tc-row tc-fail mb2';
        if(ico){ico.textContent='✗';ico.style.color='var(--rose)';}
      }
      return;
    }
    const ok=tc.validate(result);
    if(ok)passed++;
    if(!tc.hidden&&ok)publicPassed++;
    if(row){
      row.className=`tc-row ${ok?'tc-pass':'tc-fail'} mb2`;
      if(ico){ico.textContent=ok?'✓':'✗';ico.style.color=ok?'var(--grn)':'var(--rose)';}
    }
  });
  let sampleOk=true;
  if(!result.error&&p?.sampleOutput){
    sampleOk=matchesSampleOutput(result,p.sampleOutput);
  }
  const baseSummary=publicTotal
    ? `${publicPassed}/${publicTotal} public · ${passed}/${p.testCases.length} total`
    : `Hidden tests: ${passed}/${p.testCases.length} passed`;
  el('tc-summary').textContent=p?.sampleOutput
    ? `${baseSummary} · sample ${sampleOk?'✓':'✗'}`
    : baseSummary;
  return passed===p.testCases.length&&sampleOk;
}

function showJudgeResult(result){
  const panel=el('judge-result');
  el('judge-row-count').textContent=result.error?'':(`${result.rowCount} rows`);
  if(result.error){
    panel.innerHTML=`<div class="res-panel"><div class="res-hdr"><span style="color:var(--rose);font-weight:600">SQL ERROR</span></div><div style="padding:10px 12px;font-family:var(--mono);font-size:12px;color:var(--rose)">${esc(result.error)}</div></div>`;
  } else if(!result.columns.length){
    panel.innerHTML=`<div class="res-panel"><div class="res-hdr"><span style="color:var(--t2)">NO ROWS</span></div></div>`;
  } else {
    panel.innerHTML=`<div class="res-panel"><div class="res-hdr"><span style="color:var(--grn);font-weight:600">QUERY RESULT</span><span style="color:var(--t2)">${result.rowCount} rows · ${result.columns.length} cols</span></div><div class="res-body"><div class="tw"><table class="tbl"><thead><tr>${result.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.rows.slice(0,50).map((row,i)=>`<tr style="animation:rowIn .12s ease ${i*.015}s both">${row.map(cell=>`<td>${cell===null?'<span class="tbl-null">NULL</span>':esc(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${result.rowCount>50?`<div style="padding:7px 12px;font-size:11px;color:var(--t3)">Showing 50/${result.rowCount}</div>`:''}</div></div>`;
  }
  show(panel);
}

function judgeSubmit(){
  if(!S.user){toast('Please sign in to submit','error');return;}
  const p=S.problems.find(x=>x.id===S.judgeContext?.problemId);
  if(!p)return;
  const effectiveContestId=getEffectiveSubmissionContestId(S.judgeContext);
  if(isContestReattemptBlocked(p.id,effectiveContestId)){
    el('btn-judge-submit').disabled=true;
    el('btn-judge-submit').textContent='Solved';
    toast('Already solved in this contest. Reattempt is disabled.','info');
    return;
  }
  const sql=el('judge-editor').value;
  if(!sql.trim()){toast('Write a query first','warn');return;}
  resetJudgeExecutionState(p);
  el('btn-judge-submit').disabled=true; el('btn-judge-submit').textContent='Judging...';

  setTimeout(()=>{
    const result=runSQL(sql,DB);
    showJudgeResult(result);
    const allPassed=runTestCases(p,result,true);

    // Determine verdict
    let verdict='WA';
    if(result.error) verdict='CE';
    else if(allPassed) verdict='AC';

    if(isContestReattemptBlocked(p.id,effectiveContestId)){
      el('btn-judge-submit').disabled=true;
      el('btn-judge-submit').textContent='Solved';
      toast('Already solved in this contest. Reattempt is disabled.','info');
      return;
    }

    // Check if already solved BEFORE adding new submission
    const alreadySolved=getSolvedIds().has(p.id);

    // Record submission
    const publicTotal=p.testCases.filter(tc=>!tc.hidden).length;
    const publicPassed=p.testCases.filter(tc=>!tc.hidden&&tc.validate(result)).length;
    const sub={
      id:genId(), userId:S.user.userId, problemId:p.id,
      contestId:effectiveContestId,
      code:sql, verdict, timeTaken:S.judgeElapsed,
      at:Date.now(), tcPassed:p.testCases.filter(tc=>tc.validate(result)).length,
      tcTotal:p.testCases.length,
      publicPassed,
      publicTotal,
    };
    S.submissions.unshift(sub);
    LS.set(`subs:${S.user.userId}`,S.submissions);
    // Sync submission to Supabase in background - don't wait
    syncSubmissionToRelational(sub,result,p).catch(err=>console.warn('Background submission sync failed:',err));

    // Update user score — only if this is the FIRST acceptance
    if(verdict==='AC'&&!alreadySolved){
      const bonus=S.judgeElapsed<60?50:S.judgeElapsed<120?30:S.judgeElapsed<300?10:0;
      S.user.score=(S.user.score||0)+p.points+bonus;
      S.user.solved=(S.user.solved||0)+1;
      LS.set(`user:${S.user.username}`,S.user);
      clearInterval(S.judgeTimer);
    }

    // Show verdict
    const vColor=verdict==='AC'?'var(--grn)':verdict==='CE'?'var(--violet)':'var(--rose)';
    el('judge-verdict').innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:5px;background:${vColor}18;border:1px solid ${vColor}44">
      <span style="color:${vColor};font-size:15px;font-weight:800">${verdict}</span>
      <span style="font-size:11px;color:var(--t2)">${sub.publicPassed}/${sub.publicTotal} public · ${sub.tcPassed}/${sub.tcTotal} total</span>
    </div>`;

    const fb=el('judge-feedback');
    fb.innerHTML=`<div class="fx ic gap2" style="padding:10px 14px;border-radius:5px;background:${vColor}10;border:1px solid ${vColor}30">
      <span style="color:${vColor};font-size:16px">${verdict==='AC'?'✓':'✗'}</span>
      <span style="color:${vColor};font-size:12px;font-weight:500">${
        verdict==='AC'?`Accepted! ${sub.publicPassed}/${sub.publicTotal} public tests passed (${sub.tcPassed}/${sub.tcTotal} total).`:
        verdict==='CE'?`Compilation/Runtime Error: ${result.error}`:
        `Wrong Answer — ${sub.publicPassed}/${sub.publicTotal} public tests passed (${sub.tcPassed}/${sub.tcTotal} total).`
      }</span>
    </div>`;
    show(fb);

    if(verdict==='AC'){
      // Always persist user to LS so leaderboard stays fresh
      LS.set(`user:${S.user.username}`, S.user);
      renderTopRight();
      updateJudgeNextButton();
      toast(`Accepted! +${p.points} points`,'success');
      el('btn-judge-submit').textContent='Solved';
    } else {
      el('btn-judge-submit').disabled=false;
      el('btn-judge-submit').textContent='Submit';
      toast(verdict==='CE'?'Error in query':'Wrong answer','error');
    }
  },300);
}

/* ══════════════════════════════════════════════════════════
   CUSTOM CONTESTS
══════════════════════════════════════════════════════════ */
function renderCustom(){
  const mine=S.customContests.filter(c=>isOwnedByCurrentUser(c.createdBy));
  const myCustomProblems=S.problems.filter(p=>p.isCustom&&isOwnedByCurrentUser(p.createdBy));
  const contestHtml=mine.length?mine.map(c=>`<div class="mb3">${contestCardHTML({...c,type:'custom'})}<div class="fx gap2" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openCustomCreator('${c.id}')">Edit Contest</button><button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteCustomContest('${c.id}')">Delete Contest</button></div></div>`).join(''):`
    <div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div>
    <div style="font-size:13px;color:var(--t2);margin-bottom:10px">No custom contests yet</div>
    <button class="btn btn-blue btn-md" onclick="openCustomCreator()">Create Your First Contest</button></div>`;
  const customProblemHtml=`<div class="card" style="margin-top:12px"><div class="card-hdr"><div class="card-title">My Custom Problems (${myCustomProblems.length})</div><button class="btn btn-ghost btn-sm" onclick="openProblemEditor()">+ New</button></div><div class="card-body">${myCustomProblems.length?myCustomProblems.map(p=>`<div class="fx ic sb" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><div style="font-size:12px;color:var(--t0)">${esc(p.title)}</div><div style="font-size:10px;color:var(--t3)">${esc(p.code||p.id)}</div></div><div class="fx gap2"><button class="btn btn-ghost btn-xs" onclick="openProblemEditor('${p.id}')">Edit</button><button class="btn btn-danger btn-xs" onclick="deleteProblem('${p.id}')">Del</button></div></div>`).join(''):'<div style="font-size:12px;color:var(--t3)">No custom problems created yet.</div>'}</div></div>`;
  el('custom-my-list').innerHTML=contestHtml+customProblemHtml;
  el('custom-inv-list').innerHTML='<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No invitations</div></div>';
}

function canEditProblem(problem){
  if(!S.user)return false;
  if(isMaster())return true;
  if(!problem)return true;
  return problem.isCustom===true&&isOwnedByCurrentUser(problem.createdBy);
}

function openCustomCreator(id){
  if(!S.user){toast('Please sign in first','error');return;}
  const ex=id?S.customContests.find(c=>c.id===id):null;
  if(id&&!ex){toast('Contest not found','error');return;}
  if(ex&&!isOwnedByCurrentUser(ex.createdBy)&&!isMaster()){toast('Permission denied','error');return;}
  S.editingCustomContest=ex?{...ex,_existing:true}:null;
  const c=ex||{title:'',description:'',duration:120,isPublic:false,startTime:Date.now()+3600000,problemIds:[],invitees:[],password:''};
  const startVal=new Date(c.startTime||Date.now()+3600000).toISOString().slice(0,16);
  const selectedIds=new Set(c.problemIds||[]);
  const selectableProblems=getContestSelectableProblems(c.problemIds||[]);
  const modalTitle=el('custom-editor-title');
  const modalBtn=el('custom-editor-save-btn');
  if(modalTitle)modalTitle.textContent=ex?'EDIT CUSTOM CONTEST':'CREATE CUSTOM CONTEST';
  if(modalBtn)modalBtn.textContent=ex?'Save Changes':'Create Contest';
  el('custom-creator-body').innerHTML=`
    <div class="fg"><label class="lbl">Contest Title</label><input class="inp" id="cc-title" value="${esc(c.title||'')}" placeholder="e.g. Study Group Round 1"></div>
    <div class="fg"><label class="lbl">Description</label><textarea class="ta" rows="3" id="cc-desc" placeholder="What is this contest about?">${esc(c.description||'')}</textarea></div>
    <div class="g3">
      <div class="fg"><label class="lbl">Start Time</label><input class="inp" type="datetime-local" id="cc-start" value="${startVal}"></div>
      <div class="fg"><label class="lbl">Duration (minutes)</label><input class="inp" type="number" id="cc-dur" value="${Number(c.duration||120)}"></div>
      <div class="fg"><label class="lbl">Visibility</label><select class="sel" id="cc-vis" onchange="updateContestPrivacyUI()"><option value="private" ${c.isPublic?'':'selected'}>Private (invite only)</option><option value="public" ${c.isPublic?'selected':''}>Public</option></select></div>
    </div>
    <div class="fg" id="cc-pass-wrap"><label class="lbl">Contest Password</label><input class="inp" id="cc-pass" type="password" value="${esc(c.password||'')}" placeholder="Required for private contests"></div>
    <div class="fg">
      <label class="lbl">Add Problem by Code</label>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input class="inp" id="cc-code-input" placeholder="e.g. BSQ-001" style="flex:1;font-family:var(--mono)" oninput="this.value=this.value.toUpperCase()" onkeydown="if(event.key==='Enter'){event.preventDefault();ccAddByCode();}">
        <button class="btn btn-ghost btn-sm" onclick="ccAddByCode()">Add</button>
      </div>
      <div id="cc-selected-problems" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"></div>
      ${isAdmin()?'':'<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Only admins can add custom problems to contests.</div>'}
      <div style="font-size:10px;color:var(--t3);margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Or pick from list</div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto">
        ${selectableProblems.map(p=>`
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 10px;border-radius:4px;background:var(--bg2);border:1px solid var(--line)" onclick="setTimeout(ccRefreshSelected,10)">
            <input type="checkbox" class="cc-prob-check" value="${p.id}" id="cc-chk-${p.id}" ${selectedIds.has(p.id)?'checked':''}>
            <span style="font-size:10px;font-family:var(--mono);color:var(--grn);font-weight:700;width:64px;flex-shrink:0">${p.code||p.id.toUpperCase()}</span>
            <span style="flex:1;font-size:12px;color:var(--t1)">${esc(p.title)}</span>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
            <span style="font-size:11px;color:var(--gold)">${p.points}pt</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="fg"><label class="lbl">Invite Users (comma separated usernames)</label><input class="inp" id="cc-invite" value="${esc((c.invitees||[]).join(', '))}" placeholder="user1, user2, ..."></div>`;
  ccRefreshSelected();
  updateContestPrivacyUI();
  openModal('modal-custom');
}

function updateContestPrivacyUI(){
  const vis=(el('cc-vis')||{}).value||'private';
  const wrap=el('cc-pass-wrap');
  if(!wrap)return;
  wrap.style.display=vis==='private'?'block':'none';
}

function ccAddByCode(){
  const inp=el('cc-code-input');
  if(!inp)return;
  const code=inp.value.trim().toUpperCase();
  if(!code){toast('Enter a problem code','warn');return;}
  const p=S.problems.find(x=>(x.code||x.id.toUpperCase())===code);
  if(!p){toast(`No problem found: ${code}`,'warn');return;}
  const chk=document.getElementById(`cc-chk-${p.id}`);
  if(chk)chk.checked=true;
  inp.value='';
  ccRefreshSelected();
  toast(`Added: ${p.title}`,'success');
}
function ccRefreshSelected(){
  const checked=[...document.querySelectorAll('.cc-prob-check:checked')];
  const wrap=el('cc-selected-problems');
  if(!wrap)return;
  wrap.innerHTML=checked.length?`<div style="font-size:10px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Selected (${checked.length})</div>`+checked.map(chk=>{
    const p=S.problems.find(x=>x.id===chk.value);if(!p)return'';
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--gdim);border:1px solid rgba(46,200,102,.2);border-radius:4px">
      <span style="font-size:10px;font-family:var(--mono);color:var(--grn);font-weight:700">${p.code||p.id.toUpperCase()}</span>
      <span style="flex:1;font-size:12px;color:var(--t0)">${esc(p.title)}</span>
      <button class="btn btn-ghost btn-xs" onclick="document.getElementById('cc-chk-${p.id}').checked=false;ccRefreshSelected()">×</button>
    </div>`;
  }).join(''):'';
}
function saveCustomContest(){
  const title=(el('cc-title')||{}).value?.trim();
  if(!title){toast('Enter a title','warn');return;}
  const ids=[...document.querySelectorAll('.cc-prob-check:checked')].map(c=>c.value);
  if(!ids.length){toast('Select at least one problem','warn');return;}
  const isPublic=(el('cc-vis')||{}).value==='public';
  const pass=((el('cc-pass')||{}).value||'').trim();
  const dur=parseInt((el('cc-dur')||{}).value)||120;
  const startTs=new Date((el('cc-start')||{}).value).getTime()||Date.now()+3600000;
  if(!isPublic&&pass.length<4){toast('Private contest password must be at least 4 characters','warn');return;}
  const existing=S.editingCustomContest;
  if(!isAdmin()){
    const prevIds=new Set(Array.isArray(existing?.problemIds)?existing.problemIds:[]);
    const hasUnauthorizedCustom=ids.some(pid=>{
      const prob=S.problems.find(p=>p.id===pid);
      return prob?.isCustom===true&&!prevIds.has(pid);
    });
    if(hasUnauthorizedCustom){toast('Only admin can add custom problems to contests','error');return;}
  }
  const c={
    id:existing?.id||genId(),title,
    description:(el('cc-desc')||{}).value?.trim()||'',
    duration:dur,
    isPublic,
    problemIds:ids,type:'custom',status:'upcoming',
    createdBy:existing?.createdBy||S.user.userId||S.user.username,
    startTime:startTs,endTime:startTs+dur*60000,
    announcement:existing?.announcement||'',
    participants:Array.isArray(existing?.participants)?existing.participants:[S.user.userId],
    invitees:((el('cc-invite')||{}).value||'').split(',').map(u=>u.trim()).filter(Boolean),
    password:isPublic?'':pass,
  };
  if(existing?._existing){
    const idx=S.customContests.findIndex(x=>x.id===c.id);
    if(idx>=0)S.customContests[idx]=c;
    else S.customContests.push(c);
  }else S.customContests.push(c);
  LS.set('customContests',S.customContests);
  LS.set(`custom:${S.user.userId}`,S.customContests);
  syncContestToRelational(c).catch(err=>console.warn('Background custom contest sync failed:',err));
  S.editingCustomContest=null;
  closeModal('modal-custom'); renderCustom();
  toast(existing?._existing?'Custom contest updated!':'Custom contest created!','success');
}

function deleteCustomContest(id){
  const contest=S.customContests.find(c=>c.id===id);
  if(!contest){toast('Contest not found','error');return;}
  if(!isOwnedByCurrentUser(contest.createdBy)&&!isMaster()){
    toast('Permission denied','error');
    return;
  }
  if(!confirm('Delete this contest? This cannot be undone.'))return;
  S.customContests=S.customContests.filter(c=>c.id!==id);
  LS.set('customContests',S.customContests);
  if(S.user?.userId){
    const mine=S.customContests.filter(c=>isOwnedByCurrentUser(c.createdBy));
    LS.set(`custom:${S.user.userId}`,mine);
  }
  deleteContestFromRelational(id).catch(err=>console.warn('Background custom contest delete sync failed:',err));
  renderCustom();
  renderContests();
  renderSidebar();
  toast('Custom contest deleted','info');
}

function customTab(tab,btn){
  document.querySelectorAll('#view-custom .tab-btn').forEach(b=>b.classList.remove('on'));
  ['my','invited'].forEach(t=>el(`custom-tab-${t}`).classList.add('hidden'));
  btn.classList.add('on'); el(`custom-tab-${tab}`).classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   PRACTICE
══════════════════════════════════════════════════════════ */
function renderPractice(){
  const solved=getSolvedIds();
  const publicProblems=getPublicPracticeProblems();
  const mode=S.practiceMode||'problems';
  const paneProblems=el('practice-pane-problems');
  const panePlayground=el('practice-pane-playground');
  const tabProblems=el('practice-mode-problems');
  const tabPlayground=el('practice-mode-playground');
  if(paneProblems)paneProblems.classList.toggle('hidden',mode!=='problems');
  if(panePlayground)panePlayground.classList.toggle('hidden',mode!=='playground');
  if(tabProblems)tabProblems.classList.toggle('on',mode==='problems');
  if(tabPlayground)tabPlayground.classList.toggle('on',mode==='playground');

  const diffs=['All','Easy','Medium','Hard','Expert'];
  el('practice-filters').innerHTML=diffs.map(d=>`
    <button class="btn btn-sm ${S.practiceFilter===d?'btn-blue':'btn-ghost'}" onclick="setPracticeFilter('${d}')">${d}</button>`).join('');

  const filtered=S.practiceFilter==='All'?publicProblems:publicProblems.filter(p=>p.difficulty===S.practiceFilter);
  el('practice-problem-list').innerHTML=`<div class="card">${filtered.map((p,i)=>`
    <div class="prob-row ${solved.has(p.id)?'solved':''}" onclick="nav('judge',{problemId:'${p.id}',backView:'practice'})">
      <div class="prob-num" style="width:28px">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div class="fx ic gap2">
          <span style="font-size:10px;font-family:var(--mono);font-weight:700;color:var(--t3)">${p.code||p.id.toUpperCase()}</span><span style="font-size:13px;color:${solved.has(p.id)?'var(--grn)':'var(--t0)'}">${esc(p.title)}</span>
          ${p.dailyDate===getTodayStr()?'<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--gdim);color:var(--grn);border:1px solid rgba(46,200,102,.2);font-weight:700">TODAY</span>':''}
        </div>
        <div class="fx gap2 mt1">${p.tags.slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <div class="fx ic gap3">
        <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
        <span style="font-size:12px;color:var(--gold);font-weight:700">${p.points}pt</span>
        <span style="font-size:12px;color:var(--t3)">${p.testCases.filter(tc=>!tc.hidden).length} tests</span>
        ${solved.has(p.id)?'<span style="color:var(--grn);font-weight:700;font-size:11px">AC</span>':''}
      </div>
    </div>`).join('')||'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}</div>`;

  // Streak
  const streak=S.user?.streak||0;
  el('streak-count').textContent=streak;
  el('practice-streak-display').innerHTML=`<div class="fx ic gap2"><span style="font-size:24px"></span><div><div style="font-size:20px;font-weight:800;color:var(--gold)">${streak} days</div><div style="font-size:10px;color:var(--t3)">current streak</div></div></div>`;

  // Calendar (last 7 days)
  const days=['M','T','W','T','F','S','S'];
  el('streak-calendar').innerHTML=days.map((d,i)=>{
    const cls=i<streak?'sd-done':i===streak?'sd-today':'sd-miss';
    return `<div class="streak-day ${cls}">${d}</div>`;
  }).join('');

  // Diff stats
  el('practice-diff-stats').innerHTML=['Easy','Medium','Hard','Expert'].map(d=>{
    const dp=publicProblems.filter(p=>p.difficulty===d);
    const ds=dp.filter(p=>solved.has(p.id)).length;
    const pct=dp.length?Math.round(ds/dp.length*100):0;
    const color=d==='Easy'?'var(--grn)':d==='Medium'?'var(--gold)':d==='Hard'?'var(--rose)':'var(--violet)';
    return `<div style="margin-bottom:12px"><div class="fx ic sb mb1"><span class="${diffCls(d)}">${d}</span><span style="font-size:11px;color:var(--t2)">${ds}/${dp.length}</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div></div>`;
  }).join('');

  renderPracticeLabTables();
  renderPracticeLabTasks();
}
function setPracticeFilter(f){S.practiceFilter=f;renderPractice();}
function setPracticeMode(m){S.practiceMode=m;renderPractice();}

/* ══════════════════════════════════════════════════════════
   SUBMISSIONS
══════════════════════════════════════════════════════════ */
function renderSubmissions(){
  const filter=(el('sub-filter-verdict')||{}).value||'all';
  const subs=filter==='all'?S.submissions:S.submissions.filter(s=>s.verdict===filter);
  el('sub-list').innerHTML=subs.length?subs.map(s=>{
    const p=S.problems.find(x=>x.id===s.problemId);
    const vcolor=s.verdict==='AC'?'var(--grn)':s.verdict==='WA'?'var(--rose)':s.verdict==='TLE'?'var(--gold)':'var(--violet)';
    return `<div class="sub-row">
      <span style="font-size:10px;color:var(--t3);width:130px;flex-shrink:0">${new Date(s.at).toLocaleString()}</span>
      <span style="flex:1;min-width:0" class="trunc">${esc(p?.title||s.problemId)}</span>
      <span class="${diffCls(p?.difficulty||'Easy')}" style="flex-shrink:0">${p?.difficulty||'?'}</span>
      <span style="color:${vcolor};font-weight:700;font-size:11px;width:40px;text-align:center;flex-shrink:0">${s.verdict}</span>
      <span style="font-size:11px;color:var(--t3);width:60px;text-align:right;flex-shrink:0">${s.tcPassed}/${s.tcTotal} TC</span>
      <span style="font-size:11px;color:var(--t3);width:40px;text-align:right;flex-shrink:0">${s.timeTaken}s</span>
    </div>`;}).join(''):'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div><div style="font-size:12px;color:var(--t3)">No submissions yet</div></div>';
}

/* ══════════════════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════════════════ */
function renderProfile(){
  if(!S.user){el('profile-content').innerHTML='<div class="empty" style="padding-top:80px"><div style="font-size:15px;color:var(--t2);margin-bottom:14px">Sign in to view your profile</div><button class="btn btn-primary btn-md" onclick="openAuth()">Sign In</button></div>';return;}
  const u=S.user;
  const solved=getSolvedIds();
  const rank=buildLeaderboard().findIndex(e=>e.userId===u.userId)+1;
  el('profile-content').innerHTML=`
    <div style="display:flex;align-items:center;gap:20px;padding:22px;background:var(--bg1);border:1px solid var(--line);border-radius:10px;margin-bottom:16px">
      <div style="width:60px;height:60px;border-radius:10px;background:var(--bg3);border:2px solid var(--ind);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:var(--grn)">${esc(u.username[0].toUpperCase())}</div>
      <div style="flex:1">
        <div style="font-size:24px;font-weight:900;letter-spacing:2px">${esc(u.username)}</div>
        <div class="fx ic gap3 mt1">${roleBadge(u.role)}<span style="font-size:11px;color:var(--t3)">Member since ${new Date(u.joinedAt||Date.now()).toLocaleDateString()}</span></div>
      </div>
      ${rank>0?`<div style="text-align:center"><div style="font-size:28px;font-weight:700;color:var(--gold);line-height:1;font-variant-numeric:tabular-nums">#${rank}</div><div style="font-size:10px;color:var(--t3);letter-spacing:1px">GLOBAL RANK</div></div>`:''}
    </div>
    <div class="g4 mb4">
      ${[['SCORE',fmtN(u.score||0),'var(--gold)'],['SOLVED',u.solved||0,'var(--grn)'],['SUBMISSIONS',S.submissions.length,'var(--ind)'],['STREAK',u.streak||0,'var(--gold)']].map(([l,v,c])=>`<div class="stat"><div class="stat-v" style="color:${c}">${v}</div><div class="stat-l">${l}</div></div>`).join('')}
    </div>
    <div class="g2">
      <div class="card">
        <div class="card-hdr"><div class="card-title">Solved Problems</div></div>
        <div>${S.problems.filter(p=>solved.has(p.id)).map(p=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)">
            <span style="color:var(--grn);font-weight:700;font-size:11px">AC</span>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--t0)">${esc(p.title)}</div></div>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
            <span style="color:var(--gold);font-weight:700;font-size:13px">+${p.points}</span>
          </div>`).join('')||'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">Recent Submissions</div></div>
        <div>${S.submissions.slice(0,8).map(s=>{
          const p=S.problems.find(x=>x.id===s.problemId);
          const vc=s.verdict==='AC'?'var(--grn)':s.verdict==='WA'?'var(--rose)':s.verdict==='TLE'?'var(--gold)':'var(--violet)';
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)">
            <span style="color:${vc};font-weight:700;font-size:11px;width:36px">${s.verdict}</span>
            <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--t0)" class="trunc">${esc(p?.title||'—')}</div></div>
            <span style="font-size:10px;color:var(--t3)">${new Date(s.at).toLocaleDateString()}</span>
          </div>`;}).join('')||'<div class="empty"><div class="empty-ico" style="font-size:14px;color:var(--t3)">—</div></div>'}
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════════════════ */
function renderAdmin(){
  if(!isMaster()){el('view-admin').innerHTML='<div class="empty" style="padding:80px"><div style="font-size:13px;color:var(--t3);margin-top:8px">Access Denied — insufficient permissions.</div></div>';return;}
  renderAdminTab(S.adminSubTab);
}
function adminTab(tab,btn){
  S.adminSubTab=tab;
  document.querySelectorAll('#view-admin .tab-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('#view-admin .tab-content').forEach(c=>c.classList.add('hidden'));
  btn.classList.add('on'); el(`admin-tab-${tab}`).classList.remove('hidden');
  renderAdminTab(tab);
}
function renderAdminTab(tab){
  if(tab==='problems')renderAdminProblems();
  if(tab==='contests')renderAdminContests();
  if(tab==='users')renderAdminUsers();
  if(tab==='announce')renderAdminAnnounce();
  if(tab==='analytics')renderAdminAnalytics();
}

function renderAdminProblems(){
  const c=el('admin-tab-problems');
  c.innerHTML=`<div class="fx ic sb mb3"><div style="font-size:14px;font-weight:600;color:var(--t0)">Problem Bank (${S.problems.length})</div><button class="btn btn-blue btn-sm" onclick="openProblemEditor()">+ New Problem</button></div>
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Title</th><th>Difficulty</th><th>Points</th><th>Tests</th><th>Category</th><th>Daily</th><th>Actions</th></tr></thead>
      <tbody>${S.problems.map(p=>`
        <tr>
          <td style="font-weight:600;color:var(--t0)">${esc(p.title)}</td>
          <td><span class="${diffCls(p.difficulty)}">${p.difficulty}</span></td>
          <td style="color:var(--gold)">${p.points}</td>
          <td style="color:var(--ind)">${p.testCases.length}</td>
          <td style="color:var(--t2)">${esc(p.category)}</td>
          <td>${p.dailyDate?`<span style="font-size:10px;color:var(--grn)">${p.dailyDate}</span>`:'<span style="color:var(--t3)">—</span>'}</td>
          <td><div class="fx gap2">
            <button class="btn btn-ghost btn-xs" onclick="openProblemEditor('${p.id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="deleteProblem('${p.id}')">Del</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
}

function renderAdminContests(){
  const c=el('admin-tab-contests');
  c.innerHTML=`<div class="fx ic sb mb3"><div style="font-size:14px;font-weight:600;color:var(--t0)">Contests (${S.contests.length})</div><button class="btn btn-blue btn-sm" onclick="openContestCreator()">+ New Contest</button></div>
    <div class="card"><div class="tw"><table class="tbl">
      <thead><tr><th>Title</th><th>Status</th><th>Problems</th><th>Duration</th><th>Start</th><th>Actions</th></tr></thead>
      <tbody>${S.contests.map(c2=>`
        <tr>
          <td style="font-weight:600;color:var(--t0)">${esc(c2.title)}</td>
          <td><span class="v-${c2.status==='live'?'ac':c2.status==='upcoming'?'pending':'pe'}">${c2.status.toUpperCase()}</span></td>
          <td style="color:var(--ind)">${c2.problemIds.length}</td>
          <td style="color:var(--t2)">${fmtDur(c2.duration*60000)}</td>
          <td style="font-size:11px;color:var(--t2)">${fmtDate(c2.startTime)}</td>
          <td><div class="fx gap2">
            <button class="btn btn-ghost btn-xs" onclick="openContestCreator('${c2.id}')">Edit</button>
            ${c2.status==='upcoming'?`<button class="btn btn-success btn-xs" onclick="launchContest('${c2.id}')">Launch</button>`:''}
            ${c2.status==='live'?`<button class="btn btn-danger btn-xs" onclick="endContest('${c2.id}')">End</button>`:''}
          </div></td>
        </tr>`).join('')}
      </tbody></table></div></div>`;
}

function renderAdminUsers(){
  const allUsers=LS.keys('user:').map(k=>LS.get(k)).filter(u=>u?.userId);
  const c=el('admin-tab-users');
  c.innerHTML=`<div class="card"><div class="tw"><table class="tbl">
    <thead><tr><th>Username</th><th>Role</th><th>Score</th><th>Solved</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody>${allUsers.map(u=>`
      <tr>
        <td style="font-weight:600;color:var(--t0)">${esc(u.username)}</td>
        <td>${roleBadge(u.role)}</td>
        <td style="color:var(--gold)">${fmtN(u.score||0)}</td>
        <td style="color:var(--grn)">${u.solved||0}</td>
        <td style="font-size:11px;color:var(--t2)">${new Date(u.joinedAt||Date.now()).toLocaleDateString()}</td>
        <td><div class="fx gap2">
          <select class="sel" style="width:120px;font-size:11px;padding:3px 8px" onchange="changeUserRole('${u.username}',this.value)">
            ${['contestant','master','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
}

function changeUserRole(username,role){
  const u=LS.get(`user:${username}`);
  if(!u)return;
  u.role=role; LS.set(`user:${username}`,u);
  if(S.user&&S.user.username===username){S.user.role=role;renderTopRight();}
  toast(`${username} is now ${role}`,'success');
}

function renderAdminAnnounce(){
  const c=el('admin-tab-announce');
  c.innerHTML=`<div class="card"><div class="card-hdr"><div class="card-title">Global Announcement</div></div><div class="card-body">
    <div class="fg"><label class="lbl">Message</label><textarea class="ta" rows="4" id="ann-msg" placeholder="Announcement visible to all users...">${esc(LS.get('announcement')||'')}</textarea></div>
    <div class="fx gap3">
      <button class="btn btn-blue btn-md" onclick="saveAnnouncement()">Publish</button>
      <button class="btn btn-danger btn-md" onclick="clearAnnouncement()">Clear</button>
    </div>
  </div></div>`;
}

function saveAnnouncement(){
  const msg=(el('ann-msg')||{}).value?.trim();
  LS.set('announcement',msg);
  if(msg){el('announce-text').textContent=msg;show('announce-bar');}
  else hide('announce-bar');
  toast('Announcement published','success');
}
function clearAnnouncement(){LS.del('announcement');hide('announce-bar');toast('Cleared','info');}

function renderAdminAnalytics(){
  const allSubs=LS.keys('subs:').map(k=>LS.get(k)||[]).flat();
  const solved=S.problems.map(p=>{const s=allSubs.filter(s=>s.problemId===p.id&&s.verdict==='AC').length;return{...p,solveCount:s};});
  const c=el('admin-tab-analytics');
  c.innerHTML=`<div class="g4 mb4">
    ${[['Problems',S.problems.length,'var(--ind)'],['Contests',S.contests.length,'var(--sky)'],['Total Users',LS.keys('user:').length,'var(--gold)'],['Live Now',S.contests.filter(c=>c.status==='live').length,'var(--grn)']].map(([l,v,c2])=>`<div class="stat"><div class="stat-v" style="color:${c2}">${v}</div><div class="stat-l">${l}</div></div>`).join('')}
  </div>
  <div class="g2">
    <div class="card"><div class="card-hdr"><div class="card-title">Acceptance Rate</div></div><div class="card-body">
      ${S.problems.map(p=>{
        const totalSubs=allSubs.filter(s=>s.problemId===p.id).length;
        const acSubs=allSubs.filter(s=>s.problemId===p.id&&s.verdict==='AC').length;
        const rate=totalSubs?Math.round(acSubs/totalSubs*100):0;
        return `<div style="margin-bottom:10px"><div class="fx ic sb mb1"><span style="font-size:12px;color:var(--t1)">${esc(p.title)}</span><span style="font-size:11px;color:var(--t2)">${rate}%</span></div><div class="pbar"><div class="pfill" style="width:${rate}%;background:var(--grn)"></div></div></div>`;
      }).join('')}
    </div></div>
    <div class="card"><div class="card-hdr"><div class="card-title">Difficulty Distribution</div></div><div class="card-body">
      ${['Easy','Medium','Hard','Expert'].map(d=>{const count=S.problems.filter(p=>p.difficulty===d).length;const pct=S.problems.length?Math.round(count/S.problems.length*100):0;const color=d==='Easy'?'var(--grn)':d==='Medium'?'var(--gold)':d==='Hard'?'var(--rose)':'var(--violet)';return `<div style="margin-bottom:12px"><div class="fx ic sb mb1"><span class="${diffCls(d)}">${d}</span><span style="font-size:11px;color:var(--t2)">${count}</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div></div>`;}).join('')}
    </div></div>
  </div>`;
}

/* Problem Editor Modal */
function openProblemEditor(id){
  const target=id?S.problems.find(p=>p.id===id):null;
  if(!canEditProblem(target)){toast('Permission denied','error');return;}
  S.editingProblem=id
    ?{...target,_existing:true}
    :{id:getNextBsqCode(),code:getNextBsqCode(),title:'',difficulty:'Easy',points:100,timeLimit:null,category:'Filtering',tags:[],description:'',solution:'',testCases:[],dailyDate:null,isCustom:!isMaster(),createdBy:S.user?.userId,_existing:false};
  el('prob-editor-title').textContent=id?'EDIT PROBLEM':'NEW PROBLEM';
  const p=S.editingProblem;
  el('prob-editor-body').innerHTML=`
    <div class="g2">
      <div class="fg"><label class="lbl">Title *</label><input class="inp" id="pe-title" value="${esc(p.title)}" placeholder="Problem title..."></div>
      <div class="fg"><label class="lbl">Category</label><input class="inp" id="pe-cat" value="${esc(p.category)}" placeholder="Filtering, Joins..."></div>
    </div>
    <div class="g3">
      <div class="fg"><label class="lbl">Difficulty</label><select class="sel" id="pe-diff">${['Easy','Medium','Hard','Expert'].map(d=>`<option${p.difficulty===d?' selected':''}>${d}</option>`).join('')}</select></div>
      <div class="fg"><label class="lbl">Points</label><input class="inp" type="number" id="pe-pts" value="${p.points}"></div>
      <div class="fg"><label class="lbl">Mode</label><input class="inp" value="No time limit" readonly></div>
    </div>
    <div class="fg"><label class="lbl">Tags (comma separated)</label><input class="inp" id="pe-tags" value="${esc(Array.isArray(p.tags)?p.tags.join(', '):(p.tags||''))}" placeholder="WHERE, JOIN, GROUP BY"></div>
    <div class="fg"><label class="lbl">Description *</label><textarea class="ta" rows="5" id="pe-desc" placeholder="Problem statement...">${esc(p.description)}</textarea></div>
    <div class="fg">
      <label class="lbl">Reference Solution * (used to auto-generate test cases)</label>
      <textarea class="ta code-ta" rows="5" id="pe-sol" placeholder="SELECT ...">${esc(p.solution)}</textarea>
      <div class="fx ic gap3 mt2">
        <button class="btn btn-ghost btn-sm" onclick="testProblemSol()">▶ Test Solution</button>
        <span id="pe-sol-res" style="font-size:11px"></span>
      </div>
      <div id="pe-sol-table" class="hidden mt2"></div>
    </div>
    <div class="fg">
      <div class="fx ic sb mb2">
        <label class="lbl" style="margin:0">Test Cases</label>
        <button class="btn btn-ghost btn-sm" onclick="addTestCase()">+ Add Test</button>
      </div>
      <div id="pe-tcs">${renderTCEditor(p.testCases)}</div>
    </div>
    <div class="fg">
      <label class="lbl">Set as Daily Problem</label>
      <input class="inp" id="pe-daily" type="date" value="${p.dailyDate||''}" style="width:180px">
    </div>`;
  openModal('modal-problem');
}

function renderTCEditor(tcs){
  if(!tcs||!tcs.length)return'<div style="font-size:12px;color:var(--t3);padding:8px">No test cases. Add some or they will be auto-generated from the solution.</div>';
  return tcs.map((tc,i)=>`
    <div style="background:var(--bg2);border:1px solid var(--line);border-radius:5px;padding:10px 12px;margin-bottom:8px">
      <div class="fx ic sb mb2">
        <span style="font-size:11px;color:var(--t2);font-weight:600">Test Case ${i+1}</span>
        <button class="btn btn-danger btn-xs" onclick="removeTC(${i})">×</button>
      </div>
      <div class="g2">
        <div class="fg" style="margin-bottom:6px"><label class="lbl">Name</label><input class="inp" id="tc-name-${i}" value="${esc(tc.name)}" placeholder="e.g. Row Count"></div>
        <div class="fg" style="margin-bottom:6px"><label class="lbl">Description</label><input class="inp" id="tc-desc-${i}" value="${esc(tc.desc)}" placeholder="What this checks..."></div>
      </div>
    </div>`).join('');
}

function addTestCase(){
  if(!S.editingProblem)return;
  S.editingProblem.testCases=[...(S.editingProblem.testCases||[]),{id:genId(),name:'',desc:'',hint:''}];
  el('pe-tcs').innerHTML=renderTCEditor(S.editingProblem.testCases);
}

function removeTC(i){
  if(!S.editingProblem)return;
  S.editingProblem.testCases.splice(i,1);
  el('pe-tcs').innerHTML=renderTCEditor(S.editingProblem.testCases);
}

function testProblemSol(){
  const sol=(el('pe-sol')||{}).value?.trim();
  if(!sol)return;
  const res=runSQL(sol,DB);
  const tr=el('pe-sol-res'),tt=el('pe-sol-table');
  if(res.error){tr.style.color='var(--rose)';tr.textContent=res.error;hide(tt);return;}
  tr.style.color='var(--grn)';tr.textContent=`${res.rowCount} rows`;
  if(res.rowCount>0){
    tt.innerHTML=`<div class="tw" style="max-height:140px;overflow-y:auto"><table class="tbl"><thead><tr>${res.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${res.rows.slice(0,5).map(row=>`<tr>${row.map(cell=>`<td>${esc(String(cell??'NULL'))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    show(tt);
  }
}

function saveProblem(){
  const title=(el('pe-title')||{}).value?.trim();
  const solution=(el('pe-sol')||{}).value?.trim();
  if(!title||!solution){toast('Title and solution are required','warn');return;}

  const ref=runSQL(solution,DB);
  const refRows=ref.rowCount;
  const tags=((el('pe-tags')||{}).value||'').split(',').map(t=>t.trim()).filter(Boolean);

  // Collect test cases from editor
  const existingTCs=S.editingProblem.testCases||[];
  const tcs=existingTCs.length>0?existingTCs.map((tc,i)=>({
    ...tc,
    name:(el(`tc-name-${i}`)||{}).value||tc.name||`Test ${i+1}`,
    desc:(el(`tc-desc-${i}`)||{}).value||tc.desc||'',
    validate:(r)=>{if(r.error||!r.rows)return false;return r.rowCount===refRows;}
  })):[
    // Auto-generate basic test cases
    {id:genId(),name:'Row Count',desc:`Must return ${refRows} rows`,validate:(r)=>!r.error&&r.rowCount===refRows},
    {id:genId(),name:'No SQL Error',desc:'Query must execute without errors',validate:(r)=>!r.error},
  ];

  const existingCode=normalizeBsqCode(S.editingProblem.code||S.editingProblem.id);
  const ensuredCode=existingCode||getNextBsqCode();

  const updated={
    ...S.editingProblem,title,solution,
    code:ensuredCode,
    difficulty:(el('pe-diff')||{}).value||'Easy',
    points:parseInt((el('pe-pts')||{}).value)||100,
    timeLimit:null,
    category:(el('pe-cat')||{}).value?.trim()||'General',
    description:(el('pe-desc')||{}).value?.trim(),
    tags, testCases:tcs,
    dailyDate:(el('pe-daily')||{}).value||null,
    isCustom:S.editingProblem.isCustom===true||!isMaster(),
    createdBy:S.editingProblem.createdBy||S.user?.userId||S.user?.username,
  };
  updated.testCases=injectHiddenStrongTestCases([updated])[0].testCases;

  if(S.editingProblem._existing){
    const idx=S.problems.findIndex(p=>p.id===updated.id);
    if(idx>=0)S.problems[idx]=updated;
  } else S.problems.push(updated);

  persistProblems();
  // Sync problem to Supabase in background - don't wait
  syncProblemToRelational(updated).catch(err=>console.warn('Background problem sync failed:',err));
  closeModal('modal-problem');
  renderAdminProblems();
  toast('Problem saved','success');
}

function deleteProblem(id){
  const p=S.problems.find(x=>x.id===id);
  if(!canEditProblem(p)){toast('Permission denied','error');return;}
  if(!confirm('Delete this problem?'))return;
  S.problems=S.problems.filter(p=>p.id!==id);
  // Deactivate problem in Supabase in background - don't wait
  deactivateProblemInRelational(id).catch(err=>console.warn('Background problem deactivate failed:',err));
  persistProblems(); renderAdminProblems();
  toast('Deleted','info');
}

/* Contest Creator */
function openContestCreator(id){
  if(!isMaster()){toast('Permission denied','error');return;}
  const ex=id?S.contests.find(c=>c.id===id):null;
  S.editingContest=ex?{...ex,_existing:true}:{id:genId(),title:'',description:'',type:'official',status:'upcoming',startTime:Date.now()+86400000,endTime:Date.now()+86400000+7200000,duration:120,problemIds:[],isPublic:true,maxParticipants:500,announcement:'',password:'',createdBy:S.user?.userId,_existing:false};
  el('contest-editor-title').textContent=id?'EDIT CONTEST':'CREATE CONTEST';
  const c=S.editingContest;
  const selectableProblems=getContestSelectableProblems(c.problemIds||[]);
  const startVal=new Date(c.startTime).toISOString().slice(0,16);
  el('contest-editor-body').innerHTML=`
    <div class="fg"><label class="lbl">Title *</label><input class="inp" id="ce-title" value="${esc(c.title)}" placeholder="Contest title..."></div>
    <div class="fg"><label class="lbl">Description</label><textarea class="ta" rows="3" id="ce-desc">${esc(c.description)}</textarea></div>
    <div class="g3">
      <div class="fg"><label class="lbl">Duration (min)</label><input class="inp" type="number" id="ce-dur" value="${c.duration}"></div>
      <div class="fg"><label class="lbl">Max Participants</label><input class="inp" type="number" id="ce-max" value="${c.maxParticipants}"></div>
      <div class="fg"><label class="lbl">Type</label><select class="sel" id="ce-type"><option value="official" ${c.type==='official'?'selected':''}>Official</option><option value="custom" ${c.type==='custom'?'selected':''}>Custom</option></select></div>
    </div>
    <div class="fg"><label class="lbl">Start Time</label><input class="inp" type="datetime-local" id="ce-start" value="${startVal}"></div>
    <div class="fg"><label class="lbl">Announcement / Message</label><textarea class="ta" rows="2" id="ce-ann">${esc(c.announcement||'')}</textarea></div>
    <div class="fg">
      <label class="lbl">Problems</label>
      ${isAdmin()?'':'<div style="font-size:10px;color:var(--t3);margin-bottom:8px">Only admins can add custom problems to contests.</div>'}
      <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;padding:8px 0">
        ${selectableProblems.map(p=>`
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:7px 10px;border-radius:5px;background:var(--bg2);border:1px solid var(--line)">
            <input type="checkbox" class="ce-prob-check" value="${p.id}" ${c.problemIds.includes(p.id)?'checked':''}>
            <span style="flex:1;font-size:12px;color:var(--t1)">${esc(p.title)}</span>
            <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="fg">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--t1)">
        <input type="checkbox" id="ce-pub" ${c.isPublic?'checked':''} onchange="updateContestCreatorPrivacyUI()"> Public contest (visible to all)
      </label>
    </div>
    <div class="fg" id="ce-pass-wrap">
      <label class="lbl">Contest Password</label>
      <input class="inp" id="ce-pass" type="password" value="${esc(c.password||'')}" placeholder="Required for private contests">
    </div>`;
  updateContestCreatorPrivacyUI();
  openModal('modal-contest');
}

function updateContestCreatorPrivacyUI(){
  const isPublic=(el('ce-pub')||{}).checked;
  const wrap=el('ce-pass-wrap');
  if(!wrap)return;
  wrap.style.display=isPublic?'none':'block';
}

function saveContest(){
  const title=(el('ce-title')||{}).value?.trim();
  if(!title){toast('Enter a title','warn');return;}
  const ids=[...document.querySelectorAll('.ce-prob-check:checked')].map(c=>c.value);
  if(!ids.length){toast('Select at least one problem','warn');return;}
  if(!isAdmin()){
    const existing=S.editingContest;
    const prevIds=new Set(Array.isArray(existing?.problemIds)?existing.problemIds:[]);
    const hasUnauthorizedCustom=ids.some(pid=>{
      const prob=S.problems.find(p=>p.id===pid);
      return prob?.isCustom===true&&!prevIds.has(pid);
    });
    if(hasUnauthorizedCustom){toast('Only admin can add custom problems to contests','error');return;}
  }
  const dur=parseInt((el('ce-dur')||{}).value)||120;
  const startTs=new Date((el('ce-start')||{}).value).getTime()||Date.now()+86400000;
  const isPublic=(el('ce-pub')||{}).checked;
  const pass=((el('ce-pass')||{}).value||'').trim();
  if(!isPublic&&pass.length<4){toast('Private contest password must be at least 4 characters','warn');return;}
  const updated={
    ...S.editingContest,title,
    description:(el('ce-desc')||{}).value?.trim()||'',
    duration:dur,maxParticipants:parseInt((el('ce-max')||{}).value)||500,
    type:(el('ce-type')||{}).value||'official',
    startTime:startTs, endTime:startTs+dur*60000,
    problemIds:ids, isPublic,
    password:isPublic?'':pass,
    announcement:(el('ce-ann')||{}).value?.trim()||'',
  };
  if(S.editingContest._existing){const i=S.contests.findIndex(c=>c.id===updated.id);if(i>=0)S.contests[i]=updated;}
  else S.contests.push(updated);
  LS.set('contests',S.contests.map(({announce,...r})=>r));
  syncContestToRelational(updated).catch(err=>console.warn('Background contest sync failed:',err));
  closeModal('modal-contest'); renderAdminContests(); renderContests();
  toast('Contest saved','success');
}

function launchContest(id){
  const c=S.contests.find(x=>x.id===id);
  if(!c)return;
  c.status='live'; c.startTime=Date.now(); c.endTime=Date.now()+c.duration*60000;
  LS.set('contests',S.contests); renderAdminContests(); renderContests(); renderSidebar();
  syncContestToRelational(c).catch(err=>console.warn('Background contest launch sync failed:',err));
  toast(`${c.title} is now LIVE!`,'success');
}
function endContest(id){
  const c=S.contests.find(x=>x.id===id);
  if(!c)return;
  c.status='ended'; c.endTime=Date.now();
  c.isPublic=true; c.password='';
  LS.set('contests',S.contests); renderAdminContests(); renderContests(); renderSidebar();
  syncContestToRelational(c).catch(err=>console.warn('Background contest end sync failed:',err));
  toast(`Contest ended`,'info');
}

/* ══════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════ */
function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  LS.set('theme', isLight?'light':'dark');
  const btn=el('theme-btn');
  if(btn)btn.textContent=isLight?'☀':'◑';
}
function applyTheme(){
  const t=LS.get('theme')||'dark';
  if(t==='light'){document.body.classList.add('light');const btn=el('theme-btn');if(btn)btn.textContent='☀';}
}

function withTimeout(promise,ms,label='operation'){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out after ${ms}ms`)),ms))
  ]);
}

async function safeCloudCall(fn,label,timeout=12000){
  try{
    return await withTimeout(fn(),timeout,label);
  }catch(err){
    console.warn(`[Init] ${label} failed:`,err?.message||err);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
async function init(){
  applyTheme();
  // Load problems from relational table first when available.
  const relResult=await safeCloudCall(()=>loadProblemsFromRelational(),'loadProblemsFromRelational')||{success:false,problems:null};
  if(relResult.success&&Array.isArray(relResult.problems)&&relResult.problems.length>0){
    S.problems=relResult.problems;
    persistProblems();
  } else {
    // Fallback: merge local cached problems with defaults.
    const savedP=LS.get('problems');
    if(savedP&&savedP.length>0){
      const defaultIds=new Set(PROBLEMS_DEFAULT.map(p=>p.id));
      const customProblems=savedP.filter(p=>!defaultIds.has(p.id));
      S.problems=[
        ...PROBLEMS_DEFAULT,
        ...customProblems.map(p=>({...p,testCases:(p.testCases||[]).map(tc=>({...tc,validate:buildValidator(tc,p)}))}))
      ];
    } else {
      S.problems=[...PROBLEMS_DEFAULT];
      persistProblems();
    }
    if(Array.isArray(relResult.problems)&&relResult.problems.length===0){
      await safeCloudCall(()=>seedProblemsToRelational(S.problems),'seedProblemsToRelational');
    }
  }
  S.problems=injectHiddenStrongTestCases(S.problems);

  // Load contests from relational table first when available.
  const relContestResult=await safeCloudCall(()=>loadContestsFromRelational(),'loadContestsFromRelational')||{success:false,contests:null};
  if(relContestResult.success&&Array.isArray(relContestResult.contests)&&relContestResult.contests.length>0){
    const allContests=relContestResult.contests;
    S.contests=allContests.filter(c=>c.type!=='custom');
    S.customContests=allContests.filter(c=>c.type==='custom');
    LS.set('contests',S.contests.map(({announce,...r})=>r));
    LS.set('customContests',S.customContests);
  } else {
    const savedC=LS.get('contests');
    if(savedC&&savedC.length>0)S.contests=savedC;
    else{S.contests=[...CONTESTS_DEFAULT];LS.set('contests',S.contests);}
  }

  // Auto-update contest statuses and normalize access for ended contests.
  S.contests.forEach(normalizeContestLifecycle);

  // Seed admin account (admin123 / 123) — always ensure it exists
  if(!LS.get('user:admin123')){
    const seededAdmin={userId:'admin-uid-001',username:'admin123',email:'admin123@besql.local',passwordHash:await hashPassword('123'),role:'admin',score:0,solved:0,streak:0,joinedAt:Date.now()};
    LS.set('user:admin123',seededAdmin);
    await safeCloudCall(()=>syncUserToRelational(seededAdmin),'syncUserToRelational(admin)');
  } else {
    // Ensure role stays admin even if tampered, and migrate plain password.
    const adm=LS.get('user:admin123');
    if(adm&&adm.password&&!adm.passwordHash){adm.passwordHash=await hashPassword(adm.password);delete adm.password;}
    if(adm&&adm.role!=='admin'){adm.role='admin';LS.set('user:admin123',adm);}
    else if(adm){LS.set('user:admin123',adm);}
    if(adm)await safeCloudCall(()=>syncUserToRelational(adm),'syncUserToRelational(existing admin)');
  }

  // Load user session
  const sessionUser=restoreSessionUser();
  if(sessionUser){
    S.user=sessionUser;
    S.submissions=LS.get(`subs:${sessionUser.userId}`)||[];
  }

  // Load custom contests from local fallback only when relational is unavailable/empty.
  if(!(relContestResult.success&&Array.isArray(relContestResult.contests)&&relContestResult.contests.length>0)){
    const globalCustom=LS.get('customContests')||[];
    const ownCustom=S.user?LS.get(`custom:${S.user.userId}`)||[]:[];
    const mergedCustom=[...globalCustom,...ownCustom];
    const seenCustom=new Set();
    S.customContests=mergedCustom.filter(c=>{
      if(!c||!c.id||seenCustom.has(c.id))return false;
      seenCustom.add(c.id);
      return true;
    });
  }

  S.customContests.forEach(normalizeContestLifecycle);
  LS.set('customContests',S.customContests);

  if(relContestResult.success&&Array.isArray(relContestResult.contests)&&relContestResult.contests.length===0){
    await safeCloudCall(()=>seedContestsToRelational([...S.contests,...S.customContests]),'seedContestsToRelational');
  }

  // Announcement
  const ann=LS.get('announcement');
  if(ann){el('announce-text').textContent=ann;show('announce-bar');}

  // Practice lab sandbox
  S.practiceLab=LS.get('practiceLab')||createDefaultPracticeLab();
  S.practiceLabTaskDone=LS.get('practiceLabTaskDone')||{};

  // Render
  renderTopRight();
  renderSidebar();
  const restoredRoute=restoreRouteState();
  if(!restoredRoute)renderHome();
  el('btn-create-contest') && tog('btn-create-contest',isMaster());

  if(STORAGE_MODE!=='supabase'){
    toast(STORAGE_DIAGNOSTIC||'Supabase unavailable. Running in local browser storage mode.','warn');
  }

  // Online count drift
  setInterval(()=>{S.onlineCount=Math.floor(Math.random()*40)+300+Math.floor(Date.now()/15000)%30;el('sb-online').textContent=S.onlineCount;},9000);

  hide('init');
}

// Modal close on backdrop
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click',e=>{if(e.target===o)closeModal(o.id);});
});
// ESC to close
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.querySelectorAll('.overlay:not(.hidden)').forEach(o=>closeModal(o.id));
});

// Login shortcuts
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    if(!el('modal-auth').classList.contains('hidden')){
      if(el('ap'))doLogin();else if(el('rp'))doRegister();
    }
  }
});

async function bootstrap(){
  try{
    const storageResult=await initStorageWithTimeout();
    if(!storageResult.success){
      console.warn('[Bootstrap] Storage initialization failed, using fallback mode');
      if(storageResult.timedOut){
        toast('Database connection timeout. Running in offline mode.','warn');
      }
    }
    await withTimeout(init(),9000,'init');
  }catch(err){
    console.error('[Bootstrap] Initialization failed:',err?.message||err);
    toast('Startup took too long. Loaded in safe mode.','warn');
    try{renderTopRight();renderSidebar();renderHome();}catch{}
  }finally{
    hide('init');
  }
}
bootstrap();
