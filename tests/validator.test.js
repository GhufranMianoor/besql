/**
 * validator.test.js
 *
 * Tests for the answer validation logic in src/js/validator.js.
 *
 * Run: node tests/validator.test.js
 */
'use strict';

/* ── Polyfill globals for Node.js ─────────────────────── */
const _fs = require('fs');
const _vm = require('vm');
const _rootDir = require('path').resolve(__dirname, '..');

function loadSrc(relPath) {
  _vm.runInThisContext(_fs.readFileSync(`${_rootDir}/${relPath}`, 'utf8'), { filename: relPath });
}

global.DB = {
  employees: [
    { id: 1, name: 'Alice', dept_id: 1, salary: 90000, hire_year: 2018, age: 30, level: 'Senior'  },
    { id: 2, name: 'Bob',   dept_id: 2, salary: 65000, hire_year: 2020, age: 26, level: 'Junior'  },
    { id: 3, name: 'Carol', dept_id: 1, salary: 110000, hire_year: 2015, age: 38, level: 'Staff'  },
    { id: 4, name: 'Dave',  dept_id: 3, salary: 75000, hire_year: 2019, age: 32, level: 'Mid'     },
    { id: 5, name: 'Eve',   dept_id: 2, salary: 95000, hire_year: 2017, age: 35, level: 'Senior'  },
  ],
  departments: [
    { id: 1, name: 'Engineering', budget: 1500000, location: 'New York',  headcount: 3 },
    { id: 2, name: 'Marketing',   budget: 800000,  location: 'Chicago',   headcount: 2 },
    { id: 3, name: 'Operations',  budget: 600000,  location: 'Los Angeles', headcount: 1 },
  ],
  orders:   [],
  products: [],
  students: [],
  courses:  [],
};

loadSrc('src/js/sql-engine.js');
loadSrc('src/js/validator.js');

/* ── Minimal test runner ──────────────────────────────── */
let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ ok: true, name });
  } catch (e) {
    failed++;
    results.push({ ok: false, name, error: e.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/* ═══════════════════════════════════════════════════════
   Fixture helpers
════════════════════════════════════════════════════════ */
function makeProblem(solution) {
  const prob = {
    id: 'test-prob',
    solution,
    testCases: [],
  };
  // We'll attach a single test case pointing back to the same problem
  const tc = { id: 'tc-1', name: 'Row count check', desc: 'Validate row count matches solution' };
  prob.testCases = [{ ...tc, validate: buildValidator(tc, prob) }];
  return prob;
}

/* ═══════════════════════════════════════════════════════
   buildValidator tests
════════════════════════════════════════════════════════ */
test('buildValidator returns a function', () => {
  const prob = makeProblem('SELECT * FROM employees');
  assert(typeof prob.testCases[0].validate === 'function', 'validate is a function');
});

test('validate passes when row count matches solution', () => {
  const prob = makeProblem('SELECT * FROM employees');
  const userResult = runSQL('SELECT * FROM employees', DB);
  const ok = prob.testCases[0].validate(userResult);
  assert(ok === true, 'Should pass when row counts match');
});

test('validate fails when row count does not match', () => {
  const prob = makeProblem('SELECT * FROM employees');
  // User returns only 2 rows
  const userResult = runSQL('SELECT * FROM employees LIMIT 2', DB);
  const ok = prob.testCases[0].validate(userResult);
  assert(ok === false, 'Should fail when row counts differ');
});

test('validate fails when result has an error', () => {
  const prob = makeProblem('SELECT * FROM employees');
  const errorResult = { error: 'Unknown table', rows: null };
  const ok = prob.testCases[0].validate(errorResult);
  assert(ok === false, 'Should fail on error result');
});

test('validate fails when result has no rows array', () => {
  const prob = makeProblem('SELECT * FROM employees');
  const ok = prob.testCases[0].validate({ rowCount: 5 });
  assert(ok === false, 'Should fail when rows is missing');
});

test('validate uses solution row count not user row count', () => {
  // Solution returns 3 rows (departments), user returns 5 (employees)
  const prob = makeProblem('SELECT * FROM departments');
  const wrongResult = runSQL('SELECT * FROM employees', DB);
  assertEq(wrongResult.rowCount, 5);
  const ok = prob.testCases[0].validate(wrongResult);
  assert(ok === false, 'Should fail: solution expects 3, user returned 5');
});

test('validate passes when both return same count via different queries', () => {
  // Solution: all employees. User: same count via explicit columns.
  const prob = makeProblem('SELECT * FROM employees');
  const userResult = runSQL('SELECT id, name FROM employees', DB);
  const ok = prob.testCases[0].validate(userResult);
  assert(ok === true, 'Should pass: same row count');
});

/* ═══════════════════════════════════════════════════════
   stripValidators tests
════════════════════════════════════════════════════════ */
test('stripValidators removes validate functions', () => {
  const prob = makeProblem('SELECT * FROM employees');
  const stripped = stripValidators([prob]);
  assert(stripped.length === 1, 'Still one problem');
  assert(!('validate' in stripped[0].testCases[0]), 'validate removed');
});

test('stripValidators preserves other test case fields', () => {
  const prob = makeProblem('SELECT * FROM employees');
  const stripped = stripValidators([prob]);
  assert('id'   in stripped[0].testCases[0], 'id preserved');
  assert('name' in stripped[0].testCases[0], 'name preserved');
  assert('desc' in stripped[0].testCases[0], 'desc preserved');
});

test('stripValidators does not mutate the original', () => {
  const prob    = makeProblem('SELECT * FROM employees');
  const before  = typeof prob.testCases[0].validate;
  stripValidators([prob]);
  assertEq(typeof prob.testCases[0].validate, before, 'Original unchanged');
});

/* ═══════════════════════════════════════════════════════
   rebuildValidators tests
════════════════════════════════════════════════════════ */
test('rebuildValidators restores validate functions after strip', () => {
  const prob     = makeProblem('SELECT * FROM employees');
  const stripped = stripValidators([prob]);
  assert(!('validate' in stripped[0].testCases[0]), 'Stripped — no validate');

  const rebuilt  = rebuildValidators(stripped);
  assert(typeof rebuilt[0].testCases[0].validate === 'function', 'Rebuilt — validate restored');
});

test('rebuildValidators rebuilt validator produces correct result', () => {
  const prob     = makeProblem('SELECT * FROM employees');
  const stripped = stripValidators([prob]);
  const rebuilt  = rebuildValidators(stripped);

  const userResult  = runSQL('SELECT * FROM employees', DB);
  const ok          = rebuilt[0].testCases[0].validate(userResult);
  assert(ok === true, 'Rebuilt validator should pass correct answer');
});

test('rebuildValidators rebuilt validator rejects wrong answer', () => {
  const prob     = makeProblem('SELECT * FROM employees');
  const stripped = stripValidators([prob]);
  const rebuilt  = rebuildValidators(stripped);

  const wrongResult = runSQL('SELECT * FROM departments', DB);
  const ok          = rebuilt[0].testCases[0].validate(wrongResult);
  assert(ok === false, 'Rebuilt validator should fail wrong answer');
});

test('rebuildValidators handles multiple problems', () => {
  const problems = [
    makeProblem('SELECT * FROM employees'),
    makeProblem('SELECT * FROM departments'),
  ];
  const stripped = stripValidators(problems);
  const rebuilt  = rebuildValidators(stripped);
  assertEq(rebuilt.length, 2, 'Both problems preserved');
  assertEq(typeof rebuilt[0].testCases[0].validate, 'function', 'Problem 0 validator restored');
  assertEq(typeof rebuilt[1].testCases[0].validate, 'function', 'Problem 1 validator restored');
});

test('round-trip strip → rebuild preserves semantics for complex solution', () => {
  const prob = makeProblem(
    "SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id HAVING avg_sal > 70000 ORDER BY avg_sal DESC"
  );
  const stripped = stripValidators([prob]);
  const rebuilt  = rebuildValidators(stripped);

  // Correct answer: same query
  const correct = runSQL(
    "SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id HAVING avg_sal > 70000 ORDER BY avg_sal DESC",
    DB
  );
  assert(rebuilt[0].testCases[0].validate(correct) === true, 'Correct answer passes');

  // Wrong answer: wrong filter
  const wrong = runSQL('SELECT * FROM employees', DB);
  assert(rebuilt[0].testCases[0].validate(wrong) === false, 'Wrong answer fails');
});

/* ── Print results ────────────────────────────────────── */
console.log('\n BeSQL — validator.test.js\n');
const pad = String(results.length).length;
results.forEach((r, i) => {
  const num  = String(i + 1).padStart(pad);
  const icon = r.ok ? '✓' : '✗';
  const tag  = r.ok ? 'PASS' : 'FAIL';
  console.log(`  ${num}. ${icon} [${tag}] ${r.name}`);
  if (!r.ok) {
    console.log(`  ${' '.repeat(pad)}       → ${r.error}`);
  }
});

console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);
process.exit(failed > 0 ? 1 : 0);
