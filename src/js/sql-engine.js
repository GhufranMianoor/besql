/**
 * sql-engine.js — In-browser SQL query executor.
 *
 * Supports a meaningful subset of SQL:
 *   SELECT (columns, expressions, *, aggregate functions)
 *   FROM / JOIN (INNER, LEFT, RIGHT)
 *   WHERE  (AND, OR, NOT, IS NULL, IS NOT NULL, BETWEEN, IN, LIKE, comparisons)
 *   GROUP BY + aggregate functions (COUNT, SUM, AVG, MIN, MAX)
 *   HAVING
 *   ORDER BY (multiple columns, ASC/DESC)
 *   LIMIT / OFFSET
 *
 * @param {string} query  - SQL query string (SELECT only)
 * @param {Object} schema - { tableName: Array<rowObject>, ... }
 * @returns {{ columns: string[], rows: any[][], rowCount: number } | { error: string }}
 */
'use strict';

function runSQL(query, schema) {
  try {
    let q = query.trim().replace(/\s+/g, ' ').replace(/;$/, '');

    if (!/^SELECT/i.test(q)) {
      return { error: 'Only SELECT statements are allowed.' };
    }

    // --- FROM clause ---
    const fromM = q.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/i);
    if (!fromM) return { error: 'Missing FROM clause.' };

    const tname  = fromM[1];
    const talias = fromM[2] || fromM[1];
    const base   = schema[tname] || schema[tname.toLowerCase()];
    if (!base) {
      return { error: `Table '${tname}' not found. Available: ${Object.keys(schema).join(', ')}` };
    }

    // Seed rows with table-alias-qualified keys so "alias.col" lookups work
    let rows = base.map(r => {
      const o = {};
      Object.entries(r).forEach(([k, v]) => {
        o[k] = v;
        o[`${talias}.${k}`] = v;
      });
      return o;
    });

    // --- JOINs ---
    const joinRe = /(?:(?:INNER|LEFT|RIGHT)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([^\s]+)\s*=\s*([^\s]+)/gi;
    let jm;
    while ((jm = joinRe.exec(q)) !== null) {
      const jtn = jm[1];
      const ja  = jm[2] || jm[1];
      const jt  = schema[jtn] || schema[jtn.toLowerCase()];
      if (!jt) return { error: `Table '${jtn}' not found.` };

      const joined = [];
      for (const row of rows) {
        let matched = false;
        for (const jr of jt) {
          const jr2 = {};
          Object.entries(jr).forEach(([k, v]) => { jr2[`${ja}.${k}`] = v; jr2[`${ja}_${k}`] = v; });
          const lv = _col(row, jm[3]);
          const rv = _col(jr2, jm[4]) ?? jr[jm[4].split('.')[1]];
          // eslint-disable-next-line eqeqeq
          if (lv == rv) { joined.push({ ...row, ...jr2 }); matched = true; }
        }
        if (!matched && /LEFT/i.test(jm[0])) joined.push(row);
      }
      rows = joined;
    }

    // --- WHERE ---
    const whereM = q.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereM) rows = rows.filter(r => _evalWhere(whereM[1].trim(), r));

    // --- SELECT list & aggregates ---
    const selectList = (q.match(/SELECT\s+(.*?)\s+FROM/i)?.[1] || '*').trim();
    const hasAgg     = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(selectList);

    // --- GROUP BY ---
    const groupM  = q.match(/GROUP\s+BY\s+(.*?)(?:\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    let grouped   = false;

    if (groupM) {
      grouped = true;
      const groupCols = groupM[1].split(',').map(s => s.trim());
      const groups    = new Map();

      for (const r of rows) {
        const key = groupCols.map(c => _col(r, c) ?? '').join('|||');
        if (!groups.has(key)) groups.set(key, { rows: [], first: r });
        groups.get(key).rows.push(r);
      }

      rows = [];
      for (const [, g] of groups) {
        const ar = { ...g.first };
        for (const { expr, alias } of _parseSelectList(selectList)) {
          const aggM = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);
          if (aggM) ar[alias] = _aggregate(aggM[1], aggM[2], g.rows);
        }
        rows.push(ar);
      }
    } else if (hasAgg) {
      // Single aggregate row (no GROUP BY)
      const ar = {};
      for (const { expr, alias } of _parseSelectList(selectList)) {
        const aggM = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);
        if (aggM) ar[alias] = _aggregate(aggM[1], aggM[2], rows);
        else       ar[alias] = _col(rows[0] || {}, expr);
      }
      rows = [ar];
    }

    // --- HAVING ---
    const havingM = q.match(/HAVING\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (havingM) rows = rows.filter(r => _evalWhere(havingM[1].trim(), r));

    // --- ORDER BY ---
    const orderM = q.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/i);
    if (orderM) {
      const parts = orderM[1].split(',').map(s => s.trim());
      rows = [...rows].sort((a, b) => {
        for (const part of parts) {
          const [col, dir] = part.split(/\s+/);
          const av = _col(a, col);
          const bv = _col(b, col);
          const cmp =
            av == null ? -1 :
            bv == null ?  1 :
            typeof av === 'number' && typeof bv === 'number' ? av - bv :
            String(av).localeCompare(String(bv));
          if (cmp !== 0) return (dir?.toUpperCase() === 'DESC' ? -1 : 1) * cmp;
        }
        return 0;
      });
    }

    // --- LIMIT / OFFSET ---
    const limitM = q.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if (limitM) {
      const offset = parseInt(limitM[2] || 0, 10);
      rows = rows.slice(offset, offset + parseInt(limitM[1], 10));
    }

    // --- Final column projection ---
    if (selectList !== '*' && (!hasAgg || grouped)) {
      const parts = _parseSelectList(selectList);
      if (!(parts.length === 1 && parts[0].expr === '*')) {
        rows = rows.map(r => {
          const o = {};
          for (const { expr, alias } of parts) {
            if (expr === '*') Object.assign(o, r);
            else o[alias] = r[alias] ?? _col(r, expr);
          }
          return o;
        });
      }
    }

    if (!rows.length) return { columns: [], rows: [], rowCount: 0 };

    const columns = Object.keys(rows[0]).filter(k => !k.includes('.'));
    return {
      columns,
      rows: rows.map(r => columns.map(c => r[c] ?? null)),
      rowCount: rows.length,
    };
  } catch (e) {
    return { error: `Runtime error: ${e.message}` };
  }
}

/* ── Private helpers ─────────────────────────────────────── */

/** Resolve a column reference from a row object */
function _col(row, expr) {
  if (!row || !expr) return undefined;
  expr = expr.trim();
  if (row[expr] !== undefined) return row[expr];
  return row[expr.split('.').pop()];
}

/** Round to 2 decimal places */
function _round2(n) { return Math.round(n * 100) / 100; }

/**
 * Parse a SELECT column list into [{ expr, alias }, ...]
 * Respects nested parentheses so COUNT(*) is not split at the comma.
 */
function _parseSelectList(raw) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of raw + ',') {
    if      (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) {
      const s  = cur.trim(); cur = '';
      const am = s.match(/^(.+?)\s+AS\s+(\w+)$/i);
      if (am) {
        parts.push({ expr: am[1].trim(), alias: am[2] });
      } else {
        const bare = s.split('.').pop();
        parts.push({ expr: s, alias: bare || s });
      }
    } else { cur += ch; }
  }
  return parts;
}

/** Compute an aggregate function over a set of rows */
function _aggregate(fn, col, rows) {
  const upper = fn.toUpperCase();
  if (upper === 'COUNT') return rows.length;

  const vals = rows
    .map(r => col === '*' ? 1 : parseFloat(_col(r, col)))
    .filter(v => !isNaN(v));

  if (!vals.length) return null;
  if (upper === 'SUM') return _round2(vals.reduce((a, b) => a + b, 0));
  if (upper === 'AVG') return _round2(vals.reduce((a, b) => a + b, 0) / vals.length);
  if (upper === 'MIN') return Math.min(...vals);
  if (upper === 'MAX') return Math.max(...vals);
  return null;
}

/**
 * Evaluate a WHERE / HAVING condition expression against a row.
 * Handles: AND, OR, NOT, IS NULL, IS NOT NULL, BETWEEN, IN, NOT IN,
 *          =, !=, <>, <, >, <=, >=, LIKE, NOT LIKE
 */
function _evalWhere(cond, row) {
  // OR  (split on token boundary to avoid false positives inside strings)
  const orParts = _splitLogical(cond, /\bOR\b/i);
  if (orParts.length > 1) return orParts.some(p => _evalWhere(p.trim(), row));

  // BETWEEN — must be checked before AND split because BETWEEN x AND y uses AND
  const btM = cond.match(/^([^\s]+)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
  if (btM) {
    const v = parseFloat(_col(row, btM[1]));
    return v >= parseFloat(btM[2]) && v <= parseFloat(btM[3]);
  }

  // AND
  const andParts = _splitLogical(cond, /\bAND\b/i);
  if (andParts.length > 1) return andParts.every(p => _evalWhere(p.trim(), row));

  // NOT
  if (/^NOT\s+/i.test(cond)) return !_evalWhere(cond.replace(/^NOT\s+/i, '').trim(), row);

  // IS NOT NULL
  if (/IS\s+NOT\s+NULL/i.test(cond)) {
    const c = cond.match(/^([^\s]+)/)[1];
    return _col(row, c) != null;
  }

  // IS NULL
  if (/IS\s+NULL/i.test(cond)) {
    const c = cond.match(/^([^\s]+)/)[1];
    return _col(row, c) == null;
  }

  // (NOT) IN
  const inM = cond.match(/^([^\s]+)\s+(NOT\s+)?IN\s*\(([^)]+)\)/i);
  if (inM) {
    const vals  = inM[3].split(',').map(s => s.trim().replace(/^['"`]|['"`]$/g, ''));
    const v     = String(_col(row, inM[1]) ?? '');
    const found = vals.includes(v);
    return inM[2] ? !found : found;
  }

  // Comparison operators
  const cmpM = cond.match(/^([^\s<>=!]+)\s*(>=|<=|!=|<>|>|<|=|(?:NOT\s+)?LIKE)/i);
  if (!cmpM) return true;

  const colName = cmpM[1];
  const op      = cmpM[2].toUpperCase().replace(/\s+/, ' ');
  const rawVal  = cond.slice(cmpM[0].length).trim().replace(/^['"`]|['"`]$/g, '');
  const colVal  = _col(row, colName);
  const numCol  = parseFloat(colVal);
  const numVal  = parseFloat(rawVal);

  if (op === '=')        return String(colVal) === rawVal || (!isNaN(numCol) && !isNaN(numVal) && numCol === numVal);
  if (op === '!=' || op === '<>') return String(colVal) !== rawVal;
  if (op === '>')        return numCol > numVal;
  if (op === '<')        return numCol < numVal;
  if (op === '>=')       return numCol >= numVal;
  if (op === '<=')       return numCol <= numVal;
  if (op === 'LIKE')     return new RegExp('^' + rawVal.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(colVal ?? ''));
  if (op === 'NOT LIKE') return !new RegExp('^' + rawVal.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(colVal ?? ''));

  return true;
}

/** Split a WHERE string on AND/OR token boundaries (not inside parentheses) */
function _splitLogical(str, re) {
  const parts  = [];
  let cur      = '';
  const tokens = str.split(/(\s+(?:AND|OR)\s+)/i);
  for (const t of tokens) {
    if (re.test(t.trim())) { parts.push(cur.trim()); cur = ''; }
    else cur += t;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.length > 1 ? parts : [str];
}

/* Export for Node.js test environment */
if (typeof module !== 'undefined') {
  module.exports = { runSQL, _col, _round2, _parseSelectList, _aggregate, _evalWhere };
}
