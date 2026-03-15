/**
 * data/problems.js — In-memory problem bank and sample database schema.
 *
 * Each problem contains:
 *  - Metadata (id, code, title, difficulty, points, timeLimit, category, tags)
 *  - description  : plain text shown to the contestant
 *  - sampleOutput : { columns, rows } shown as a preview in the UI
 *  - schemaHint   : { table, columns } shown as a reference card
 *  - testCases    : array of { id, name, desc, validate(result), hint }
 *  - solution     : canonical correct SQL used to rebuild validators
 *  - dailyDate    : 'YYYY-M-D' string (set on today's daily problem)
 */
'use strict';

/* ============================================================
   SAMPLE DATABASE SCHEMA
   ============================================================ */
const DB = {
  employees: [
    { id: 1,  name: 'Alice Chen',   dept_id: 1, salary: 95000,  hire_year: 2019, age: 32, level: 'Senior' },
    { id: 2,  name: 'Bob Martin',   dept_id: 2, salary: 72000,  hire_year: 2020, age: 28, level: 'Junior' },
    { id: 3,  name: 'Carol White',  dept_id: 1, salary: 110000, hire_year: 2017, age: 41, level: 'Staff'  },
    { id: 4,  name: 'David Lee',    dept_id: 3, salary: 88000,  hire_year: 2021, age: 35, level: 'Mid'    },
    { id: 5,  name: 'Eva Ramos',    dept_id: 2, salary: 67000,  hire_year: 2022, age: 26, level: 'Junior' },
    { id: 6,  name: 'Frank Kim',    dept_id: 3, salary: 105000, hire_year: 2018, age: 39, level: 'Senior' },
    { id: 7,  name: 'Grace Park',   dept_id: 1, salary: 99000,  hire_year: 2020, age: 33, level: 'Senior' },
    { id: 8,  name: 'Henry Zhao',   dept_id: 4, salary: 115000, hire_year: 2016, age: 44, level: 'Staff'  },
    { id: 9,  name: 'Iris Novak',   dept_id: 4, salary: 78000,  hire_year: 2023, age: 29, level: 'Mid'    },
    { id: 10, name: 'Jake Torres',  dept_id: 2, salary: 82000,  hire_year: 2019, age: 31, level: 'Mid'    },
  ],

  departments: [
    { id: 1, name: 'Engineering', budget: 500000, location: 'San Francisco', headcount: 3 },
    { id: 2, name: 'Marketing',   budget: 200000, location: 'New York',      headcount: 3 },
    { id: 3, name: 'Finance',     budget: 300000, location: 'Chicago',       headcount: 2 },
    { id: 4, name: 'Executive',   budget: 800000, location: 'San Francisco', headcount: 2 },
  ],

  orders: [
    { id: 1,  customer: 'TechCorp',    product_id: 1, amount: 12500, status: 'delivered', month: 'Jan' },
    { id: 2,  customer: 'MegaRetail',  product_id: 2, amount: 8300,  status: 'pending',   month: 'Feb' },
    { id: 3,  customer: 'TechCorp',    product_id: 1, amount: 5700,  status: 'delivered', month: 'Feb' },
    { id: 4,  customer: 'StartupXYZ', product_id: 3, amount: 2100,  status: 'cancelled', month: 'Feb' },
    { id: 5,  customer: 'MegaRetail',  product_id: 2, amount: 19800, status: 'delivered', month: 'Mar' },
    { id: 6,  customer: 'GlobalCo',    product_id: 1, amount: 31000, status: 'delivered', month: 'Mar' },
    { id: 7,  customer: 'TechCorp',    product_id: 3, amount: 4200,  status: 'pending',   month: 'Mar' },
    { id: 8,  customer: 'StartupXYZ', product_id: 2, amount: 9900,  status: 'delivered', month: 'Apr' },
    { id: 9,  customer: 'GlobalCo',    product_id: 1, amount: 15600, status: 'delivered', month: 'Apr' },
    { id: 10, customer: 'NewCo',       product_id: 3, amount: 7200,  status: 'pending',   month: 'Apr' },
  ],

  products: [
    { id: 1, name: 'Enterprise Suite', category: 'Software', price: 15000, stock: 999 },
    { id: 2, name: 'Analytics Pro',    category: 'Software', price: 8000,  stock: 999 },
    { id: 3, name: 'Consulting Pack',  category: 'Services', price: 5000,  stock: 50  },
  ],

  students: [
    { id: 1, name: 'Ahmed Ali',     grade: 85, course_id: 1, year: 2022, gpa: 3.5 },
    { id: 2, name: 'Sara Khan',     grade: 92, course_id: 2, year: 2021, gpa: 3.8 },
    { id: 3, name: 'Omar Raza',     grade: 78, course_id: 1, year: 2023, gpa: 3.2 },
    { id: 4, name: 'Fatima Malik',  grade: 95, course_id: 3, year: 2022, gpa: 3.9 },
    { id: 5, name: 'Bilal Hassan',  grade: 68, course_id: 2, year: 2023, gpa: 2.9 },
    { id: 6, name: 'Zara Sheikh',   grade: 88, course_id: 3, year: 2021, gpa: 3.6 },
  ],

  courses: [
    { id: 1, name: 'Database Systems', credits: 3, instructor: 'Dr. Smith', dept: 'CS' },
    { id: 2, name: 'Data Structures',  credits: 3, instructor: 'Dr. Jones', dept: 'CS' },
    { id: 3, name: 'Machine Learning', credits: 4, instructor: 'Dr. Ahmed', dept: 'AI' },
  ],
};

/* ============================================================
   PROBLEM BANK
   ============================================================ */
const PROBLEMS_DEFAULT = [
  /* ── BSQ-001 ─────────────────────────────────────────── */
  {
    id: 'p1', code: 'BSQ-001',
    title: 'High Salary Filter',
    difficulty: 'Easy', points: 100, timeLimit: 300,
    category: 'Filtering', tags: ['WHERE', 'ORDER BY'],
    description:
      'Find all employees with a salary greater than $85,000.\n\n' +
      'Return the columns: **name**, **salary**, **level**.\n' +
      'Order results by salary in descending order.',
    sampleOutput: {
      columns: ['name', 'salary', 'level'],
      rows: [
        ['Henry Zhao', '115000', 'Staff'],
        ['Carol White', '110000', 'Staff'],
        ['Frank Kim', '105000', 'Senior'],
      ],
    },
    schemaHint: {
      table: 'employees',
      columns: [
        ['id', 'INT'], ['name', 'VARCHAR'], ['dept_id', 'INT'],
        ['salary', 'INT'], ['hire_year', 'INT'], ['age', 'INT'], ['level', 'VARCHAR'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'Row Count',
        desc: 'Must return exactly 6 rows',
        validate: r => r.rowCount === 6,
        hint: 'WHERE salary > 85000',
      },
      {
        id: 'tc2', name: 'Salary Filter',
        desc: 'All returned salaries must be > 85000',
        validate: r => {
          const i = r.columns.findIndex(c => c.toLowerCase() === 'salary');
          return i >= 0 && r.rows.every(row => Number(row[i]) > 85000);
        },
        hint: 'Check your WHERE condition',
      },
      {
        id: 'tc3', name: 'Ordered Descending',
        desc: 'Rows must be ordered by salary DESC',
        validate: r => {
          const i = r.columns.findIndex(c => c.toLowerCase() === 'salary');
          if (i < 0) return false;
          for (let x = 1; x < r.rows.length; x++) {
            if (Number(r.rows[x][i]) > Number(r.rows[x - 1][i])) return false;
          }
          return true;
        },
        hint: 'Add ORDER BY salary DESC',
      },
      {
        id: 'tc4', name: 'Required Columns',
        desc: 'Result must include name, salary, and level columns',
        validate: r => {
          const cols = r.columns.map(c => c.toLowerCase());
          return cols.includes('name') && cols.includes('salary') && cols.includes('level');
        },
        hint: 'SELECT name, salary, level FROM ...',
      },
    ],
    solution: 'SELECT name, salary, level FROM employees WHERE salary > 85000 ORDER BY salary DESC',
    dailyDate: getTodayStr(),
  },

  /* ── BSQ-002 ─────────────────────────────────────────── */
  {
    id: 'p2', code: 'BSQ-002',
    title: 'Department Employee Count',
    difficulty: 'Easy', points: 150, timeLimit: 300,
    category: 'Aggregation', tags: ['GROUP BY', 'COUNT'],
    description:
      'Count the number of employees in each department.\n\n' +
      'Return: **dept_id**, **total_employees**.\n' +
      'Order results by total_employees descending.',
    sampleOutput: {
      columns: ['dept_id', 'total_employees'],
      rows: [['1', '3'], ['2', '3'], ['4', '2'], ['3', '2']],
    },
    schemaHint: {
      table: 'employees',
      columns: [['id', 'INT'], ['name', 'VARCHAR'], ['dept_id', 'INT'], ['salary', 'INT']],
    },
    testCases: [
      {
        id: 'tc1', name: 'Four departments',
        desc: 'Must return 4 rows (one per department)',
        validate: r => r.rowCount === 4,
        hint: 'GROUP BY dept_id',
      },
      {
        id: 'tc2', name: 'Count column exists',
        desc: 'Result must contain a count column',
        validate: r => r.columns.some(c =>
          c.toLowerCase().includes('total') ||
          c.toLowerCase().includes('count') ||
          c.toLowerCase().includes('emp')),
        hint: 'COUNT(*) AS total_employees',
      },
      {
        id: 'tc3', name: 'Descending order',
        desc: 'Departments with the most employees appear first',
        validate: r => {
          const ci = r.columns.findIndex(c =>
            c.toLowerCase().includes('total') ||
            c.toLowerCase().includes('count'));
          if (ci < 0) return false;
          for (let i = 1; i < r.rows.length; i++) {
            if (Number(r.rows[i][ci]) > Number(r.rows[i - 1][ci])) return false;
          }
          return true;
        },
        hint: 'ORDER BY total_employees DESC',
      },
      {
        id: 'tc4', name: 'Correct counts',
        desc: 'Dept 1 and dept 2 must each have 3 employees',
        validate: r => {
          const diIdx = r.columns.findIndex(c => c.toLowerCase().includes('dept'));
          const cntIdx = r.columns.findIndex(c =>
            c.toLowerCase().includes('total') || c.toLowerCase().includes('count'));
          if (diIdx < 0 || cntIdx < 0) return false;
          const d1 = r.rows.find(row => String(row[diIdx]) === '1');
          const d2 = r.rows.find(row => String(row[diIdx]) === '2');
          return d1 && d2 && Number(d1[cntIdx]) === 3 && Number(d2[cntIdx]) === 3;
        },
        hint: 'Make sure you are counting employees per dept_id',
      },
    ],
    solution: 'SELECT dept_id, COUNT(*) AS total_employees FROM employees GROUP BY dept_id ORDER BY total_employees DESC',
    dailyDate: null,
  },

  /* ── BSQ-003 ─────────────────────────────────────────── */
  {
    id: 'p3', code: 'BSQ-003',
    title: 'Join Employees & Departments',
    difficulty: 'Medium', points: 200, timeLimit: 480,
    category: 'Joins', tags: ['JOIN', 'WHERE'],
    description:
      'Join the employees table with departments.\n\n' +
      'Return: **name** (employee), **dept_name** (d.name), **salary**, **location**.\n' +
      'Filter to San Francisco employees only.\n' +
      'Order by salary DESC.',
    sampleOutput: {
      columns: ['name', 'dept_name', 'salary', 'location'],
      rows: [
        ['Henry Zhao', 'Executive', '115000', 'San Francisco'],
        ['Carol White', 'Engineering', '110000', 'San Francisco'],
        ['Grace Park', 'Engineering', '99000', 'San Francisco'],
        ['Alice Chen', 'Engineering', '95000', 'San Francisco'],
        ['Iris Novak', 'Executive', '78000', 'San Francisco'],
      ],
    },
    schemaHint: {
      table: 'employees  ·  departments',
      columns: [
        ['employees.id', 'INT'], ['employees.name', 'VARCHAR'],
        ['employees.dept_id', 'INT'], ['employees.salary', 'INT'],
        ['departments.id', 'INT'], ['departments.name', 'VARCHAR'],
        ['departments.location', 'VARCHAR'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'Five rows',
        desc: 'San Francisco has 5 employees',
        validate: r => r.rowCount === 5,
        hint: "JOIN departments d ON e.dept_id = d.id WHERE d.location = 'San Francisco'",
      },
      {
        id: 'tc2', name: 'dept_name column',
        desc: 'Must include a column aliased as dept_name',
        validate: r => r.columns.some(c => c.toLowerCase().includes('dept')),
        hint: 'd.name AS dept_name',
      },
      {
        id: 'tc3', name: 'Location filter',
        desc: 'Every returned row must be San Francisco',
        validate: r => {
          const li = r.columns.findIndex(c => c.toLowerCase().includes('loc'));
          if (li < 0) return true;
          return r.rows.every(row => String(row[li]).toLowerCase().includes('san francisco'));
        },
        hint: "WHERE d.location = 'San Francisco'",
      },
      {
        id: 'tc4', name: 'Salary ordering',
        desc: 'Rows ordered by salary descending',
        validate: r => {
          const si = r.columns.findIndex(c => c.toLowerCase() === 'salary');
          if (si < 0) return false;
          for (let i = 1; i < r.rows.length; i++) {
            if (Number(r.rows[i][si]) > Number(r.rows[i - 1][si])) return false;
          }
          return true;
        },
        hint: 'ORDER BY e.salary DESC',
      },
    ],
    solution: "SELECT e.name, d.name AS dept_name, e.salary, d.location FROM employees e JOIN departments d ON e.dept_id = d.id WHERE d.location = 'San Francisco' ORDER BY e.salary DESC",
    dailyDate: null,
  },

  /* ── BSQ-004 ─────────────────────────────────────────── */
  {
    id: 'p4', code: 'BSQ-004',
    title: 'Average Salary by Department',
    difficulty: 'Medium', points: 200, timeLimit: 420,
    category: 'Aggregation', tags: ['GROUP BY', 'AVG', 'HAVING'],
    description:
      'Show the average salary per department.\n\n' +
      'Return: **dept_id**, **avg_salary**.\n' +
      'Only include departments where the average salary exceeds $80,000.\n' +
      'Order by avg_salary descending.',
    sampleOutput: {
      columns: ['dept_id', 'avg_salary'],
      rows: [['1', '101333.33'], ['3', '96500'], ['4', '96500']],
    },
    schemaHint: {
      table: 'employees',
      columns: [
        ['id', 'INT'], ['name', 'VARCHAR'], ['dept_id', 'INT'],
        ['salary', 'INT'], ['hire_year', 'INT'], ['age', 'INT'], ['level', 'VARCHAR'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'HAVING filter',
        desc: 'Only departments with average salary > 80000',
        validate: r => {
          const ai = r.columns.findIndex(c => c.toLowerCase().includes('avg'));
          if (ai < 0) return false;
          return r.rows.every(row => Number(row[ai]) > 80000);
        },
        hint: 'HAVING AVG(salary) > 80000',
      },
      {
        id: 'tc2', name: 'Three departments',
        desc: 'Three departments qualify (depts 1, 3, 4)',
        validate: r => r.rowCount === 3,
        hint: 'Departments 1, 3, and 4 all have avg > 80000',
      },
      {
        id: 'tc3', name: 'Ordered DESC',
        desc: 'Highest average salary first',
        validate: r => {
          const ai = r.columns.findIndex(c => c.toLowerCase().includes('avg'));
          if (ai < 0) return false;
          for (let i = 1; i < r.rows.length; i++) {
            if (Number(r.rows[i][ai]) > Number(r.rows[i - 1][ai])) return false;
          }
          return true;
        },
        hint: 'ORDER BY avg_salary DESC',
      },
    ],
    solution: 'SELECT dept_id, AVG(salary) AS avg_salary FROM employees GROUP BY dept_id HAVING AVG(salary) > 80000 ORDER BY avg_salary DESC',
    dailyDate: null,
  },

  /* ── BSQ-005 ─────────────────────────────────────────── */
  {
    id: 'p5', code: 'BSQ-005',
    title: 'Top 3 Earners',
    difficulty: 'Easy', points: 100, timeLimit: 240,
    category: 'Filtering', tags: ['ORDER BY', 'LIMIT'],
    description:
      'Find the top 3 highest-paid employees.\n\n' +
      'Return: **name**, **salary** only.',
    sampleOutput: {
      columns: ['name', 'salary'],
      rows: [['Henry Zhao', '115000'], ['Carol White', '110000'], ['Frank Kim', '105000']],
    },
    schemaHint: {
      table: 'employees',
      columns: [
        ['id', 'INT'], ['name', 'VARCHAR'], ['dept_id', 'INT'],
        ['salary', 'INT'], ['hire_year', 'INT'], ['age', 'INT'], ['level', 'VARCHAR'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'Exactly 3 rows',
        desc: 'Must return exactly 3 rows',
        validate: r => r.rowCount === 3,
        hint: 'Use LIMIT 3',
      },
      {
        id: 'tc2', name: 'Descending salary',
        desc: 'Highest salary must be first',
        validate: r => {
          const si = r.columns.findIndex(c => c.toLowerCase().includes('salary'));
          if (si < 0 || r.rows.length < 3) return false;
          return Number(r.rows[0][si]) >= Number(r.rows[1][si]) &&
                 Number(r.rows[1][si]) >= Number(r.rows[2][si]);
        },
        hint: 'ORDER BY salary DESC',
      },
      {
        id: 'tc3', name: 'Top earner correct',
        desc: 'First row must be Henry Zhao with 115000',
        validate: r => {
          const ni = r.columns.findIndex(c => c.toLowerCase() === 'name');
          const si = r.columns.findIndex(c => c.toLowerCase() === 'salary');
          if (ni < 0 || si < 0 || !r.rows[0]) return false;
          return r.rows[0][ni] === 'Henry Zhao' && Number(r.rows[0][si]) === 115000;
        },
        hint: 'ORDER BY salary DESC LIMIT 3',
      },
    ],
    solution: 'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3',
    dailyDate: null,
  },

  /* ── BSQ-006 ─────────────────────────────────────────── */
  {
    id: 'p6', code: 'BSQ-006',
    title: 'Revenue by Customer',
    difficulty: 'Medium', points: 250, timeLimit: 480,
    category: 'Aggregation', tags: ['GROUP BY', 'SUM', 'WHERE'],
    description:
      'Calculate the total revenue per customer from **delivered** orders only.\n\n' +
      'Return: **customer**, **total_revenue**.\n' +
      'Order by total_revenue descending.',
    sampleOutput: {
      columns: ['customer', 'total_revenue'],
      rows: [
        ['GlobalCo', '46600'],
        ['MegaRetail', '19800'],
        ['TechCorp', '18200'],
        ['StartupXYZ', '9900'],
      ],
    },
    schemaHint: {
      table: 'orders',
      columns: [
        ['id', 'INT'], ['customer', 'VARCHAR'], ['product_id', 'INT'],
        ['amount', 'INT'], ['status', 'VARCHAR'], ['month', 'VARCHAR'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'Delivered only',
        desc: '4 unique customers have delivered orders',
        validate: r => r.rowCount === 4,
        hint: "WHERE status = 'delivered'",
      },
      {
        id: 'tc2', name: 'SUM column present',
        desc: 'A revenue / total column must exist',
        validate: r => r.columns.some(c =>
          c.toLowerCase().includes('rev') ||
          c.toLowerCase().includes('total') ||
          c.toLowerCase().includes('amount')),
        hint: 'SUM(amount) AS total_revenue',
      },
      {
        id: 'tc3', name: 'Descending order',
        desc: 'Highest revenue first',
        validate: r => {
          const ri = r.columns.findIndex(c =>
            c.toLowerCase().includes('rev') || c.toLowerCase().includes('total'));
          if (ri < 0) return false;
          for (let i = 1; i < r.rows.length; i++) {
            if (Number(r.rows[i][ri]) > Number(r.rows[i - 1][ri])) return false;
          }
          return true;
        },
        hint: 'ORDER BY total_revenue DESC',
      },
      {
        id: 'tc4', name: 'GlobalCo total',
        desc: 'GlobalCo total revenue must be 46600',
        validate: r => {
          const ci = r.columns.findIndex(c => c.toLowerCase() === 'customer');
          const ri = r.columns.findIndex(c =>
            c.toLowerCase().includes('rev') || c.toLowerCase().includes('total'));
          if (ci < 0 || ri < 0) return false;
          const row = r.rows.find(row => row[ci] === 'GlobalCo');
          return row && Number(row[ri]) === 46600;
        },
        hint: 'GlobalCo placed 2 delivered orders: 31000 + 15600 = 46600',
      },
    ],
    solution: "SELECT customer, SUM(amount) AS total_revenue FROM orders WHERE status = 'delivered' GROUP BY customer ORDER BY total_revenue DESC",
    dailyDate: null,
  },

  /* ── BSQ-007 ─────────────────────────────────────────── */
  {
    id: 'p7', code: 'BSQ-007',
    title: 'Product Order Report',
    difficulty: 'Hard', points: 350, timeLimit: 600,
    category: 'Joins', tags: ['JOIN', 'GROUP BY', 'SUM'],
    description:
      'Join **orders** with **products**.\n\n' +
      'For each product return:\n' +
      '- **product** (product name)\n' +
      '- **order_count** (number of orders)\n' +
      '- **total_revenue** (sum of amounts)\n\n' +
      'Order by total_revenue descending.',
    sampleOutput: {
      columns: ['product', 'order_count', 'total_revenue'],
      rows: [
        ['Enterprise Suite', '5', '65800'],
        ['Analytics Pro', '3', '38000'],
        ['Consulting Pack', '2', '6300'],
      ],
    },
    schemaHint: {
      table: 'orders  ·  products',
      columns: [
        ['orders.id', 'INT'], ['orders.customer', 'VARCHAR'],
        ['orders.product_id', 'INT'], ['orders.amount', 'INT'],
        ['orders.status', 'VARCHAR'],
        ['products.id', 'INT'], ['products.name', 'VARCHAR'],
        ['products.category', 'VARCHAR'], ['products.price', 'INT'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'Three products',
        desc: 'Must return 3 rows (one per product)',
        validate: r => r.rowCount === 3,
        hint: 'JOIN products ON orders.product_id = products.id, then GROUP BY product name',
      },
      {
        id: 'tc2', name: 'order_count column',
        desc: 'Must include an order count column',
        validate: r => r.columns.some(c =>
          c.toLowerCase().includes('count') || c.toLowerCase().includes('order')),
        hint: 'COUNT(*) AS order_count',
      },
      {
        id: 'tc3', name: 'Descending by revenue',
        desc: 'Products ordered by total revenue (highest first)',
        validate: r => {
          const ri = r.columns.findIndex(c =>
            c.toLowerCase().includes('rev') || c.toLowerCase().includes('total'));
          if (ri < 0) return false;
          for (let i = 1; i < r.rows.length; i++) {
            if (Number(r.rows[i][ri]) > Number(r.rows[i - 1][ri])) return false;
          }
          return true;
        },
        hint: 'ORDER BY total_revenue DESC',
      },
      {
        id: 'tc4', name: 'Enterprise Suite revenue',
        desc: 'Enterprise Suite total revenue = 65800',
        validate: r => {
          const pi = r.columns.findIndex(c => c.toLowerCase() === 'product');
          const ri = r.columns.findIndex(c =>
            c.toLowerCase().includes('rev') || c.toLowerCase().includes('total'));
          if (pi < 0 || ri < 0) return false;
          const row = r.rows.find(row => row[pi] === 'Enterprise Suite');
          return row && Number(row[ri]) === 65800;
        },
        hint: 'Enterprise Suite appears in orders 1,3,6,9 plus one more',
      },
    ],
    solution: 'SELECT p.name AS product, COUNT(*) AS order_count, SUM(o.amount) AS total_revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY total_revenue DESC',
    dailyDate: null,
  },

  /* ── BSQ-008 ─────────────────────────────────────────── */
  {
    id: 'p8', code: 'BSQ-008',
    title: 'Student GPA Report',
    difficulty: 'Hard', points: 300, timeLimit: 540,
    category: 'Joins', tags: ['JOIN', 'AVG', 'GROUP BY'],
    description:
      'Join **students** with **courses**.\n\n' +
      'For each course return:\n' +
      '- **course_name** (c.name)\n' +
      '- **enrolled** (student count)\n' +
      '- **avg_gpa** (average GPA)\n\n' +
      'Order by avg_gpa descending.',
    sampleOutput: {
      columns: ['course_name', 'enrolled', 'avg_gpa'],
      rows: [
        ['Machine Learning', '2', '3.75'],
        ['Data Structures', '2', '3.35'],
        ['Database Systems', '2', '3.35'],
      ],
    },
    schemaHint: {
      table: 'students  ·  courses',
      columns: [
        ['students.id', 'INT'], ['students.name', 'VARCHAR'],
        ['students.grade', 'INT'], ['students.course_id', 'INT'],
        ['students.year', 'INT'], ['students.gpa', 'FLOAT'],
        ['courses.id', 'INT'], ['courses.name', 'VARCHAR'],
        ['courses.credits', 'INT'], ['courses.instructor', 'VARCHAR'],
      ],
    },
    testCases: [
      {
        id: 'tc1', name: 'Three courses',
        desc: 'Must return 3 rows (one per course)',
        validate: r => r.rowCount === 3,
        hint: 'JOIN courses ON students.course_id = courses.id, GROUP BY course name',
      },
      {
        id: 'tc2', name: 'avg_gpa column',
        desc: 'Must compute and return average GPA',
        validate: r => r.columns.some(c =>
          c.toLowerCase().includes('gpa') || c.toLowerCase().includes('avg')),
        hint: 'AVG(s.gpa) AS avg_gpa',
      },
      {
        id: 'tc3', name: 'enrolled column',
        desc: 'Must count students per course',
        validate: r => r.columns.some(c =>
          c.toLowerCase().includes('enroll') || c.toLowerCase().includes('count')),
        hint: 'COUNT(*) AS enrolled',
      },
      {
        id: 'tc4', name: 'ML course top GPA',
        desc: 'Machine Learning must have the highest avg GPA (3.75)',
        validate: r => {
          const ni = r.columns.findIndex(c =>
            c.toLowerCase().includes('course') || c.toLowerCase().includes('name'));
          const gi = r.columns.findIndex(c =>
            c.toLowerCase().includes('gpa') || c.toLowerCase().includes('avg'));
          if (ni < 0 || gi < 0 || !r.rows[0]) return false;
          return String(r.rows[0][ni]).toLowerCase().includes('machine') &&
                 Number(r.rows[0][gi]) === 3.75;
        },
        hint: 'Machine Learning has students with GPAs 3.9 and 3.6 → avg 3.75',
      },
    ],
    solution: 'SELECT c.name AS course_name, COUNT(*) AS enrolled, AVG(s.gpa) AS avg_gpa FROM students s JOIN courses c ON s.course_id = c.id GROUP BY c.name ORDER BY avg_gpa DESC',
    dailyDate: null,
  },

  /* ── BSQ-009 ─────────────────────────────────────────── */
  {
    id: 'p9', code: 'BSQ-009',
    title: 'Employees Hired After 2019',
    difficulty: 'Easy', points: 80, timeLimit: 240,
    category: 'Filtering', tags: ['WHERE', 'ORDER BY'],
    description:
      'Find all employees hired **after** 2019.\n\n' +
      'Return: **name**, **hire_year**, **level**.\n' +
      'Order by hire_year ascending.',
    sampleOutput: {
      columns: ['name', 'hire_year', 'level'],
      rows: [
        ['Bob Martin', '2020', 'Junior'],
        ['Grace Park', '2020', 'Senior'],
        ['David Lee', '2021', 'Mid'],
        ['Eva Ramos', '2022', 'Junior'],
        ['Iris Novak', '2023', 'Mid'],
      ],
    },
    schemaHint: {
      table: 'employees',
      columns: [['id', 'INT'], ['name', 'VARCHAR'], ['hire_year', 'INT'], ['level', 'VARCHAR']],
    },
    testCases: [
      {
        id: 'tc1', name: 'Five employees',
        desc: 'Five employees were hired after 2019',
        validate: r => r.rowCount === 5,
        hint: 'WHERE hire_year > 2019',
      },
      {
        id: 'tc2', name: 'Ascending order',
        desc: 'Rows must be ordered by hire_year ASC',
        validate: r => {
          const hi = r.columns.findIndex(c => c.toLowerCase().includes('hire'));
          if (hi < 0) return false;
          for (let i = 1; i < r.rows.length; i++) {
            if (Number(r.rows[i][hi]) < Number(r.rows[i - 1][hi])) return false;
          }
          return true;
        },
        hint: 'ORDER BY hire_year ASC',
      },
      {
        id: 'tc3', name: 'No 2019 or earlier',
        desc: 'No hire_year <= 2019 should appear',
        validate: r => {
          const hi = r.columns.findIndex(c => c.toLowerCase().includes('hire'));
          if (hi < 0) return false;
          return r.rows.every(row => Number(row[hi]) > 2019);
        },
        hint: 'WHERE hire_year > 2019 (strict greater-than)',
      },
    ],
    solution: 'SELECT name, hire_year, level FROM employees WHERE hire_year > 2019 ORDER BY hire_year ASC',
    dailyDate: null,
  },

  /* ── BSQ-010 ─────────────────────────────────────────── */
  {
    id: 'p10', code: 'BSQ-010',
    title: 'Max & Min Salary',
    difficulty: 'Easy', points: 80, timeLimit: 240,
    category: 'Aggregation', tags: ['MAX', 'MIN'],
    description:
      'Return the highest and lowest salaries across all employees.\n\n' +
      'Return a single row with columns: **max_salary**, **min_salary**.',
    sampleOutput: {
      columns: ['max_salary', 'min_salary'],
      rows: [['115000', '67000']],
    },
    schemaHint: {
      table: 'employees',
      columns: [['id', 'INT'], ['name', 'VARCHAR'], ['salary', 'INT']],
    },
    testCases: [
      {
        id: 'tc1', name: 'Single row',
        desc: 'Must return exactly 1 row',
        validate: r => r.rowCount === 1,
        hint: 'MAX() and MIN() without GROUP BY return a single aggregate row',
      },
      {
        id: 'tc2', name: 'Correct max',
        desc: 'max_salary must be 115000',
        validate: r => {
          const mi = r.columns.findIndex(c => c.toLowerCase().includes('max'));
          return mi >= 0 && Number(r.rows[0][mi]) === 115000;
        },
        hint: 'MAX(salary) AS max_salary',
      },
      {
        id: 'tc3', name: 'Correct min',
        desc: 'min_salary must be 67000',
        validate: r => {
          const mi = r.columns.findIndex(c => c.toLowerCase().includes('min'));
          return mi >= 0 && Number(r.rows[0][mi]) === 67000;
        },
        hint: 'MIN(salary) AS min_salary',
      },
    ],
    solution: 'SELECT MAX(salary) AS max_salary, MIN(salary) AS min_salary FROM employees',
    dailyDate: null,
  },
];

/* ============================================================
   DEFAULT CONTESTS
   ============================================================ */
const _now = Date.now();
const CONTESTS_DEFAULT = [
  {
    id: 'con1', title: 'SQL Fundamentals Championship', type: 'official',
    status: 'live',
    startTime:  _now - 3600000,
    endTime:    _now + 7200000,
    duration:   180,
    description: 'Test your fundamental SQL skills — filtering, aggregation, and joins.',
    problemIds: ['p1', 'p2', 'p3'],
    createdBy: 'admin',
    isPublic: true,
    maxParticipants: 500,
    announcement: 'Welcome! Only SELECT statements are allowed. Good luck!',
  },
  {
    id: 'con2', title: 'Advanced Query Masters', type: 'official',
    status: 'upcoming',
    startTime:  _now + 86400000,
    endTime:    _now + 86400000 + 14400000,
    duration:   240,
    description: 'Advanced SQL: multi-table joins, subqueries, and aggregation mastery.',
    problemIds: ['p4', 'p5', 'p6', 'p7'],
    createdBy: 'admin',
    isPublic: true,
    maxParticipants: 200,
    announcement: '',
  },
  {
    id: 'con3', title: 'Weekend Grind', type: 'official',
    status: 'ended',
    startTime:  _now - 604800000,
    endTime:    _now - 604800000 + 7200000,
    duration:   120,
    description: 'A quick 2-hour warm-up contest for all skill levels.',
    problemIds: ['p1', 'p5'],
    createdBy: 'admin',
    isPublic: true,
    maxParticipants: 100,
    announcement: '',
  },
];

/* Export for Node.js test environment */
if (typeof module !== 'undefined') {
  module.exports = { DB, PROBLEMS_DEFAULT, CONTESTS_DEFAULT };
}
