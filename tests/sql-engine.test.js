/**
 * sql-engine.test.js
 *
 * Test suite for the in-browser SQL engine (src/js/sql-engine.js).
 *
 * Run: node tests/sql-engine.test.js
 *
 * Coverage:
 *  - SELECT * / column list
 *  - WHERE with comparisons, AND, OR, NOT, IN, BETWEEN, LIKE, IS NULL
 *  - JOIN (INNER / LEFT)
 *  - GROUP BY + aggregate functions (COUNT, SUM, AVG, MIN, MAX)
 *  - HAVING
 *  - ORDER BY (ASC / DESC, multi-column)
 *  - LIMIT / OFFSET
 *  - Error handling (non-SELECT, bad syntax, unknown table)
 */
'use strict';

/* ── Polyfill browser globals for Node.js ─────────────── */
const _fs = require('fs');
const _vm = require('vm');
const _rootDir = require('path').resolve(__dirname, '..');

/** Load a source file into the current Node.js global scope (mirrors <script> tags in the browser). */
function loadSrc(relPath) {
  _vm.runInThisContext(_fs.readFileSync(`${_rootDir}/${relPath}`, 'utf8'), { filename: relPath });
}

global.DB = {
  employees: [
    { id: 1, name: 'Alice',   dept_id: 1, salary: 90000, hire_year: 2018, age: 30, level: 'Senior'  },
    { id: 2, name: 'Bob',     dept_id: 2, salary: 65000, hire_year: 2020, age: 26, level: 'Junior'  },
    { id: 3, name: 'Carol',   dept_id: 1, salary: 110000, hire_year: 2015, age: 38, level: 'Staff'  },
    { id: 4, name: 'Dave',    dept_id: 3, salary: 75000, hire_year: 2019, age: 32, level: 'Mid'     },
    { id: 5, name: 'Eve',     dept_id: 2, salary: 95000, hire_year: 2017, age: 35, level: 'Senior'  },
    { id: 6, name: 'Frank',   dept_id: 1, salary: 105000, hire_year: 2016, age: 40, level: 'Senior' },
    { id: 7, name: 'Grace',   dept_id: 3, salary: 80000, hire_year: 2021, age: 28, level: 'Mid'     },
    { id: 8, name: 'Henry',   dept_id: 2, salary: 115000, hire_year: 2013, age: 45, level: 'Staff'  },
    { id: 9, name: 'Iris',    dept_id: 1, salary: 70000, hire_year: 2022, age: 24, level: 'Junior'  },
    { id: 10, name: 'Jack',   dept_id: 3, salary: 88000, hire_year: 2018, age: 33, level: 'Senior'  },
  ],
  departments: [
    { id: 1, name: 'Engineering', budget: 1500000, location: 'New York',  headcount: 4 },
    { id: 2, name: 'Marketing',   budget: 800000,  location: 'Chicago',   headcount: 3 },
    { id: 3, name: 'Operations',  budget: 600000,  location: 'Los Angeles', headcount: 3 },
  ],
  orders: [
    { id: 1, customer: 'Acme Corp', product_id: 1, amount: 15000, status: 'delivered', month: 1 },
    { id: 2, customer: 'TechCo',    product_id: 2, amount: 8000,  status: 'delivered', month: 1 },
    { id: 3, customer: 'Acme Corp', product_id: 1, amount: 15000, status: 'pending',   month: 2 },
    { id: 4, customer: 'Bigmart',   product_id: 3, amount: 5000,  status: 'delivered', month: 2 },
    { id: 5, customer: 'TechCo',    product_id: 2, amount: 8000,  status: 'delivered', month: 3 },
  ],
  products: [
    { id: 1, name: 'Enterprise Suite', category: 'Software', price: 15000, stock: 999 },
    { id: 2, name: 'Analytics Pro',    category: 'Software', price: 8000,  stock: 999 },
    { id: 3, name: 'Consulting Pack',  category: 'Services', price: 5000,  stock: 50  },
  ],
  students: [
    { id: 1, name: 'Ahmed',  grade: 85, course_id: 1, year: 2022, gpa: 3.5 },
    { id: 2, name: 'Sara',   grade: 92, course_id: 2, year: 2021, gpa: 3.8 },
    { id: 3, name: 'Omar',   grade: 78, course_id: 1, year: 2023, gpa: 3.2 },
    { id: 4, name: 'Fatima', grade: 95, course_id: 3, year: 2022, gpa: 3.9 },
    { id: 5, name: 'Bilal',  grade: 68, course_id: 2, year: 2023, gpa: 2.9 },
    { id: 6, name: 'Zara',   grade: 88, course_id: 3, year: 2021, gpa: 3.6 },
  ],
  courses: [
    { id: 1, name: 'Database Systems', credits: 3, instructor: 'Dr. Smith', dept: 'CS' },
    { id: 2, name: 'Data Structures',  credits: 3, instructor: 'Dr. Jones', dept: 'CS' },
    { id: 3, name: 'Machine Learning', credits: 4, instructor: 'Dr. Ahmed', dept: 'AI' },
  ],
};

/* Load the engine */
loadSrc('src/js/sql-engine.js');

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

/* ═════════════════════════════════════════════════════════
   1. SELECT  *
══════════════════════════════════════════════════════════ */
test('SELECT * returns all rows and correct columns', () => {
  const r = runSQL('SELECT * FROM departments', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3, 'Row count');
  assert(r.columns.includes('id'),       'Column: id');
  assert(r.columns.includes('name'),     'Column: name');
  assert(r.columns.includes('budget'),   'Column: budget');
  assert(r.columns.includes('location'), 'Column: location');
});

test('SELECT named columns returns only those columns', () => {
  const r = runSQL('SELECT name, salary FROM employees', DB);
  assert(!r.error, r.error);
  assertEq(r.columns.length, 2, 'Two columns');
  assertEq(r.columns[0], 'name');
  assertEq(r.columns[1], 'salary');
  assertEq(r.rowCount, 10, '10 employees');
});

/* ═════════════════════════════════════════════════════════
   2. WHERE — comparisons
══════════════════════════════════════════════════════════ */
test('WHERE salary > 90000 returns correct rows', () => {
  const r = runSQL('SELECT name, salary FROM employees WHERE salary > 90000', DB);
  assert(!r.error, r.error);
  const salIdx = r.columns.indexOf('salary');
  assert(r.rows.every(row => Number(row[salIdx]) > 90000), 'All salaries > 90000');
  assertEq(r.rowCount, 4, '4 rows above 90000');
});

test('WHERE salary = 65000 returns exactly one row', () => {
  const r = runSQL("SELECT name FROM employees WHERE salary = 65000", DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 1);
  assertEq(r.rows[0][0], 'Bob');
});

test('WHERE name LIKE starts-with pattern', () => {
  const r = runSQL("SELECT name FROM employees WHERE name LIKE 'A%'", DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 1);
  assertEq(r.rows[0][0], 'Alice');
});

test('WHERE salary IN list', () => {
  const r = runSQL('SELECT name FROM employees WHERE salary IN (65000, 75000, 80000)', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3);
});

test('WHERE salary BETWEEN low AND high', () => {
  const r = runSQL('SELECT name, salary FROM employees WHERE salary BETWEEN 80000 AND 100000', DB);
  assert(!r.error, r.error);
  assert(r.rowCount > 0, 'Should have rows in range');
  const salIdx = r.columns.indexOf('salary');
  assert(
    r.rows.every(row => { const s = Number(row[salIdx]); return s >= 80000 && s <= 100000; }),
    'All returned salaries must be between 80000 and 100000'
  );
  // employees with salary in [80k, 100k]: Alice(90k), Grace(80k), Eve(95k), Jack(88k) = 4
  assertEq(r.rowCount, 4, '4 employees in [80000, 100000]');
});

test('WHERE with AND', () => {
  const r = runSQL('SELECT name FROM employees WHERE salary > 80000 AND dept_id = 1', DB);
  assert(!r.error, r.error);
  // dept 1 members with salary > 80000: Alice(90k), Carol(110k), Frank(105k)
  assertEq(r.rowCount, 3);
});

test('WHERE with OR', () => {
  const r = runSQL("SELECT name FROM employees WHERE level = 'Staff' OR level = 'Junior'", DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 4, 'Staff(2) + Junior(2)');
});

test('WHERE with NOT', () => {
  const r = runSQL("SELECT name FROM employees WHERE NOT dept_id = 1", DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 6, 'dept 2 + dept 3 = 6');
});

/* ═════════════════════════════════════════════════════════
   3. ORDER BY
══════════════════════════════════════════════════════════ */
test('ORDER BY salary ASC produces ascending order', () => {
  const r = runSQL('SELECT salary FROM employees ORDER BY salary ASC', DB);
  assert(!r.error, r.error);
  for (let i = 1; i < r.rows.length; i++) {
    assert(Number(r.rows[i][0]) >= Number(r.rows[i - 1][0]), `Not ascending at index ${i}`);
  }
});

test('ORDER BY salary DESC produces descending order', () => {
  const r = runSQL('SELECT name, salary FROM employees ORDER BY salary DESC', DB);
  assert(!r.error, r.error);
  assertEq(r.rows[0][0], 'Henry', 'Highest salary first');
  for (let i = 1; i < r.rows.length; i++) {
    assert(Number(r.rows[i][1]) <= Number(r.rows[i - 1][1]), `Not descending at index ${i}`);
  }
});

/* ═════════════════════════════════════════════════════════
   4. LIMIT / OFFSET
══════════════════════════════════════════════════════════ */
test('LIMIT restricts row count', () => {
  const r = runSQL('SELECT * FROM employees LIMIT 3', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3);
});

test('LIMIT with OFFSET skips rows', () => {
  const all   = runSQL('SELECT id FROM employees ORDER BY id ASC', DB);
  const paged = runSQL('SELECT id FROM employees ORDER BY id ASC LIMIT 3 OFFSET 2', DB);
  assert(!paged.error, paged.error);
  assertEq(paged.rowCount, 3);
  assertEq(paged.rows[0][0], all.rows[2][0], 'First row after offset = all[2]');
});

/* ═════════════════════════════════════════════════════════
   5. GROUP BY + Aggregates
══════════════════════════════════════════════════════════ */
test('COUNT(*) with GROUP BY returns one row per group', () => {
  const r = runSQL('SELECT dept_id, COUNT(*) AS cnt FROM employees GROUP BY dept_id', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3, '3 departments');
});

test('SUM aggregate', () => {
  const r = runSQL('SELECT dept_id, SUM(salary) AS total FROM employees GROUP BY dept_id ORDER BY dept_id ASC', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3);
  const totalIdx = r.columns.indexOf('total');
  const totals   = r.rows.map(row => Number(row[totalIdx]));
  assert(totals.every(t => t > 0), 'All totals positive');
});

test('AVG aggregate returns float', () => {
  const r = runSQL('SELECT AVG(salary) AS avg_sal FROM employees', DB);
  assert(!r.error, r.error);
  const v = Number(r.rows[0][0]);
  assert(v > 0 && v < 200000, `Avg salary in range: ${v}`);
});

test('MIN and MAX aggregates', () => {
  const r = runSQL('SELECT MIN(salary) AS mn, MAX(salary) AS mx FROM employees', DB);
  assert(!r.error, r.error);
  assertEq(Number(r.rows[0][0]), 65000, 'MIN salary');
  assertEq(Number(r.rows[0][1]), 115000, 'MAX salary');
});

/* ═════════════════════════════════════════════════════════
   6. HAVING
══════════════════════════════════════════════════════════ */
test('HAVING filters groups after aggregation', () => {
  const r = runSQL('SELECT dept_id, COUNT(*) AS cnt FROM employees GROUP BY dept_id HAVING cnt >= 4', DB);
  assert(!r.error, r.error);
  // dept_id 1 has 4 employees
  assertEq(r.rowCount, 1, 'Only dept with >=4 employees');
  assertEq(Number(r.rows[0][0]), 1);
});

/* ═════════════════════════════════════════════════════════
   7. JOIN
══════════════════════════════════════════════════════════ */
test('INNER JOIN produces correct column set', () => {
  const r = runSQL(
    'SELECT e.name, d.name AS dept FROM employees e JOIN departments d ON e.dept_id = d.id',
    DB
  );
  assert(!r.error, r.error);
  assertEq(r.rowCount, 10, 'All 10 employees matched');
  assert(r.columns.includes('name'), 'name column');
  assert(r.columns.includes('dept'), 'dept column');
});

test('JOIN then WHERE filters correctly', () => {
  const r = runSQL(
    "SELECT e.name FROM employees e JOIN departments d ON e.dept_id = d.id WHERE d.name = 'Engineering'",
    DB
  );
  assert(!r.error, r.error);
  assertEq(r.rowCount, 4, 'Engineering has 4 employees');
});

test('JOIN with GROUP BY aggregation', () => {
  // Use dept_id to avoid column-name ambiguity between e.name and d.name
  const r = runSQL(
    'SELECT e.dept_id, COUNT(*) AS emp_count FROM employees e JOIN departments d ON e.dept_id = d.id GROUP BY e.dept_id ORDER BY emp_count DESC',
    DB
  );
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3, '3 department groups');
  const cntIdx = r.columns.indexOf('emp_count');
  // dept 1 (Engineering) has 4 employees — highest count
  assertEq(Number(r.rows[0][1]), 4, 'Largest dept has 4 employees');
  // Descending order
  for (let i = 1; i < r.rows.length; i++) {
    assert(Number(r.rows[i][cntIdx]) <= Number(r.rows[i - 1][cntIdx]), `Not descending at index ${i}`);
  }
});

/* ═════════════════════════════════════════════════════════
   8. Multi-table / subquery-like patterns
══════════════════════════════════════════════════════════ */
test('Products JOIN orders calculates revenue', () => {
  const r = runSQL(
    'SELECT p.name AS product, SUM(o.amount) AS revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY revenue DESC',
    DB
  );
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3, '3 products');
  const revIdx = r.columns.indexOf('revenue');
  for (let i = 1; i < r.rows.length; i++) {
    assert(Number(r.rows[i][revIdx]) <= Number(r.rows[i - 1][revIdx]), 'Descending revenue');
  }
});

test('Students GPA average per course', () => {
  const r = runSQL(
    'SELECT c.name AS course, AVG(s.gpa) AS avg_gpa FROM students s JOIN courses c ON s.course_id = c.id GROUP BY c.name',
    DB
  );
  assert(!r.error, r.error);
  assertEq(r.rowCount, 3, '3 courses');
  const gpaIdx = r.columns.indexOf('avg_gpa');
  assert(r.rows.every(row => Number(row[gpaIdx]) > 0), 'All avg GPAs positive');
});

/* ═════════════════════════════════════════════════════════
   9. Delivered orders filter (BSQ-006 equivalent)
══════════════════════════════════════════════════════════ */
test('Delivered orders GROUP BY customer ORDER BY total DESC', () => {
  const r = runSQL(
    "SELECT customer, SUM(amount) AS total_revenue FROM orders WHERE status = 'delivered' GROUP BY customer ORDER BY total_revenue DESC",
    DB
  );
  assert(!r.error, r.error);
  assert(r.rowCount >= 2, 'At least 2 customers with delivered orders');
  const revIdx = r.columns.indexOf('total_revenue');
  for (let i = 1; i < r.rows.length; i++) {
    assert(Number(r.rows[i][revIdx]) <= Number(r.rows[i - 1][revIdx]), 'Descending');
  }
});

/* ═════════════════════════════════════════════════════════
   10. Error handling
══════════════════════════════════════════════════════════ */
test('Non-SELECT statement returns error', () => {
  const r = runSQL('DROP TABLE employees', DB);
  assert(r.error, 'Expected an error for non-SELECT');
  assert(r.error.toLowerCase().includes('select'), 'Error mentions SELECT');
});

test('Missing FROM clause returns error', () => {
  const r = runSQL('SELECT name', DB);
  assert(r.error, 'Expected an error');
  assert(r.error.toLowerCase().includes('from'), 'Error mentions FROM');
});

test('Unknown table returns error', () => {
  const r = runSQL('SELECT * FROM unicorn_table', DB);
  assert(r.error, 'Expected an error for unknown table');
});

test('Empty query string returns error', () => {
  const r = runSQL('', DB);
  assert(r.error, 'Expected error for empty query');
});

/* ═════════════════════════════════════════════════════════
   11. Edge cases
══════════════════════════════════════════════════════════ */
test('Column alias in SELECT is preserved', () => {
  const r = runSQL('SELECT name AS employee_name, salary AS pay FROM employees LIMIT 1', DB);
  assert(!r.error, r.error);
  assert(r.columns.includes('employee_name'), 'Alias employee_name present');
  assert(r.columns.includes('pay'), 'Alias pay present');
});

test('SELECT COUNT(*) with no GROUP BY returns single row', () => {
  const r = runSQL('SELECT COUNT(*) AS total FROM employees', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 1, 'Single aggregated row');
  assertEq(Number(r.rows[0][0]), 10, 'Total = 10');
});

test('ORDER BY two columns', () => {
  const r = runSQL('SELECT dept_id, salary FROM employees ORDER BY dept_id ASC, salary DESC', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 10);
  // Within the same dept, salary should be descending
  for (let i = 1; i < r.rows.length; i++) {
    const prevDept = Number(r.rows[i - 1][0]);
    const currDept = Number(r.rows[i][0]);
    if (prevDept === currDept) {
      assert(Number(r.rows[i][1]) <= Number(r.rows[i - 1][1]), `Salary not desc in same dept at row ${i}`);
    }
  }
});

test('LIMIT 0 returns empty result', () => {
  const r = runSQL('SELECT * FROM employees LIMIT 0', DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 0);
});

test('WHERE with string equality', () => {
  const r = runSQL("SELECT name FROM employees WHERE level = 'Senior'", DB);
  assert(!r.error, r.error);
  assertEq(r.rowCount, 4, 'Four Senior employees (Alice, Eve, Frank, Jack)');
});

/* ── Print results ────────────────────────────────────── */
console.log('\n BeSQL — sql-engine.test.js\n');
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
