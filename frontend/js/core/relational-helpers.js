'use strict';

function serializeProblemTestCases(testCases) {
  return (testCases || []).map(tc => {
    const { validate, ...rest } = tc;
    return rest;
  });
}

function normalizeResultCell(v) {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isFinite(n) && String(v).trim() !== '') return n;
  return String(v).trim().toLowerCase();
}

function normalizeResultColumns(cols) {
  return (cols || []).map(c => String(c).trim().toLowerCase());
}

function normalizeResultRow(row) {
  return (row || []).map(normalizeResultCell);
}

function rowsMatch(actualRows, expectedRows, ignoreOrder = false) {
  const a = actualRows || [];
  const b = expectedRows || [];
  if (a.length !== b.length) return false;
  if (!ignoreOrder) {
    for (let i = 0; i < b.length; i++) {
      const ar = normalizeResultRow(a[i]);
      const br = normalizeResultRow(b[i]);
      if (ar.length !== br.length) return false;
      for (let j = 0; j < br.length; j++) if (ar[j] !== br[j]) return false;
    }
    return true;
  }
  const toKey = row => JSON.stringify(normalizeResultRow(row));
  const ak = a.map(toKey).sort();
  const bk = b.map(toKey).sort();
  for (let i = 0; i < bk.length; i++) if (ak[i] !== bk[i]) return false;
  return true;
}

function resultsExactlyMatch(actual, expected) {
  if (!actual || !expected) return false;
  const actualCols = normalizeResultColumns(actual.columns);
  const expectedCols = normalizeResultColumns(expected.columns);
  if (actualCols.length !== expectedCols.length) return false;
  return rowsMatch(actual.rows || [], expected.rows || [], true);
}