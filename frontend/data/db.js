'use strict';

/* ══════════════════════════════════════════════════════════
   IN-BROWSER DATABASE — Sample Data for the SQL Engine
   These tables are used by runSQL() to evaluate user queries.
   Each key is a table name; the value is an array of row objects.
══════════════════════════════════════════════════════════ */

const DB = {

  /* ── employees ────────────────────────────────────────── */
  employees: [
    { id: 1,  name: 'Alice',    dept_id: 1, salary: 72000,  hire_year: 2018, age: 29, level: 'Senior'   },
    { id: 2,  name: 'Bob',      dept_id: 1, salary: 58000,  hire_year: 2020, age: 26, level: 'Junior'   },
    { id: 3,  name: 'Charlie',  dept_id: 2, salary: 91000,  hire_year: 2015, age: 35, level: 'Lead'     },
    { id: 4,  name: 'Diana',    dept_id: 2, salary: 64000,  hire_year: 2021, age: 24, level: 'Junior'   },
    { id: 5,  name: 'Eve',      dept_id: 3, salary: 83000,  hire_year: 2017, age: 31, level: 'Senior'   },
    { id: 6,  name: 'Frank',    dept_id: 1, salary: 95000,  hire_year: 2014, age: 38, level: 'Lead'     },
    { id: 7,  name: 'Grace',    dept_id: 3, salary: 55000,  hire_year: 2022, age: 23, level: 'Intern'   },
    { id: 8,  name: 'Hank',     dept_id: 4, salary: 78000,  hire_year: 2019, age: 30, level: 'Senior'   },
    { id: 9,  name: 'Ivy',      dept_id: 4, salary: 62000,  hire_year: 2021, age: 27, level: 'Junior'   },
    { id: 10, name: 'Jack',     dept_id: 2, salary: 105000, hire_year: 2012, age: 42, level: 'Lead'     },
    { id: 11, name: 'Karen',    dept_id: 1, salary: 67000,  hire_year: 2019, age: 28, level: 'Mid'      },
    { id: 12, name: 'Leo',      dept_id: 3, salary: 71000,  hire_year: 2018, age: 33, level: 'Mid'      },
    { id: 13, name: 'Mona',     dept_id: 2, salary: 48000,  hire_year: 2023, age: 22, level: 'Intern'   },
    { id: 14, name: 'Nate',     dept_id: 4, salary: 88000,  hire_year: 2016, age: 36, level: 'Senior'   },
    { id: 15, name: 'Olivia',   dept_id: 1, salary: 52000,  hire_year: 2023, age: 21, level: 'Intern'   },
  ],

  /* ── departments ─────────────────────────────────────── */
  departments: [
    { id: 1, name: 'Engineering', budget: 500000, location: 'New York',      headcount: 5 },
    { id: 2, name: 'Marketing',   budget: 300000, location: 'San Francisco', headcount: 4 },
    { id: 3, name: 'Sales',       budget: 250000, location: 'Chicago',       headcount: 3 },
    { id: 4, name: 'HR',          budget: 200000, location: 'New York',      headcount: 3 },
  ],

  /* ── orders ──────────────────────────────────────────── */
  orders: [
    { id: 1,  customer: 'Alice',   product_id: 1,  amount: 250,   status: 'completed', month: 'Jan' },
    { id: 2,  customer: 'Bob',     product_id: 3,  amount: 120,   status: 'completed', month: 'Jan' },
    { id: 3,  customer: 'Charlie', product_id: 2,  amount: 890,   status: 'pending',   month: 'Feb' },
    { id: 4,  customer: 'Alice',   product_id: 5,  amount: 45,    status: 'completed', month: 'Feb' },
    { id: 5,  customer: 'Diana',   product_id: 1,  amount: 250,   status: 'cancelled', month: 'Mar' },
    { id: 6,  customer: 'Eve',     product_id: 4,  amount: 1500,  status: 'completed', month: 'Mar' },
    { id: 7,  customer: 'Bob',     product_id: 2,  amount: 890,   status: 'completed', month: 'Apr' },
    { id: 8,  customer: 'Frank',   product_id: 6,  amount: 320,   status: 'pending',   month: 'Apr' },
    { id: 9,  customer: 'Grace',   product_id: 3,  amount: 120,   status: 'completed', month: 'May' },
    { id: 10, customer: 'Alice',   product_id: 7,  amount: 75,    status: 'completed', month: 'May' },
    { id: 11, customer: 'Hank',    product_id: 1,  amount: 250,   status: 'completed', month: 'Jun' },
    { id: 12, customer: 'Charlie', product_id: 8,  amount: 2200,  status: 'completed', month: 'Jun' },
    { id: 13, customer: 'Diana',   product_id: 4,  amount: 1500,  status: 'pending',   month: 'Jul' },
    { id: 14, customer: 'Eve',     product_id: 5,  amount: 45,    status: 'cancelled', month: 'Jul' },
    { id: 15, customer: 'Bob',     product_id: 6,  amount: 320,   status: 'completed', month: 'Aug' },
    { id: 16, customer: 'Frank',   product_id: 7,  amount: 75,    status: 'completed', month: 'Aug' },
    { id: 17, customer: 'Alice',   product_id: 8,  amount: 2200,  status: 'completed', month: 'Sep' },
    { id: 18, customer: 'Grace',   product_id: 2,  amount: 890,   status: 'pending',   month: 'Sep' },
    { id: 19, customer: 'Hank',    product_id: 3,  amount: 120,   status: 'completed', month: 'Oct' },
    { id: 20, customer: 'Charlie', product_id: 1,  amount: 250,   status: 'completed', month: 'Oct' },
  ],

  /* ── products ────────────────────────────────────────── */
  products: [
    { id: 1, name: 'Wireless Mouse',     category: 'Electronics', price: 25,   stock: 150 },
    { id: 2, name: 'Mechanical Keyboard', category: 'Electronics', price: 89,   stock: 75  },
    { id: 3, name: 'USB-C Hub',           category: 'Electronics', price: 40,   stock: 200 },
    { id: 4, name: 'Monitor 27"',         category: 'Electronics', price: 350,  stock: 30  },
    { id: 5, name: 'Notebook A5',         category: 'Stationery',  price: 5,    stock: 500 },
    { id: 6, name: 'Desk Lamp',           category: 'Furniture',   price: 45,   stock: 80  },
    { id: 7, name: 'Pen Set',             category: 'Stationery',  price: 12,   stock: 300 },
    { id: 8, name: 'Standing Desk',       category: 'Furniture',   price: 450,  stock: 20  },
  ],

  /* ── students ────────────────────────────────────────── */
  students: [
    { id: 1,  name: 'Zara',    grade: 'A',  course_id: 1, year: 2023, gpa: 3.9 },
    { id: 2,  name: 'Yusuf',   grade: 'B',  course_id: 2, year: 2022, gpa: 3.2 },
    { id: 3,  name: 'Xena',    grade: 'A',  course_id: 1, year: 2023, gpa: 3.8 },
    { id: 4,  name: 'Will',    grade: 'C',  course_id: 3, year: 2021, gpa: 2.5 },
    { id: 5,  name: 'Vera',    grade: 'B',  course_id: 2, year: 2023, gpa: 3.4 },
    { id: 6,  name: 'Uma',     grade: 'A',  course_id: 4, year: 2022, gpa: 3.7 },
    { id: 7,  name: 'Tom',     grade: 'D',  course_id: 5, year: 2021, gpa: 2.0 },
    { id: 8,  name: 'Sara',    grade: 'B',  course_id: 1, year: 2022, gpa: 3.1 },
    { id: 9,  name: 'Raj',     grade: 'A',  course_id: 3, year: 2023, gpa: 3.6 },
    { id: 10, name: 'Quinn',   grade: 'C',  course_id: 4, year: 2021, gpa: 2.8 },
    { id: 11, name: 'Paul',    grade: 'B',  course_id: 5, year: 2022, gpa: 3.0 },
    { id: 12, name: 'Noor',    grade: 'A',  course_id: 2, year: 2023, gpa: 3.95},
  ],

  /* ── courses ─────────────────────────────────────────── */
  courses: [
    { id: 1, name: 'Database Systems',     credits: 4, instructor: 'Dr. Smith',   dept: 'CS'      },
    { id: 2, name: 'Data Structures',      credits: 3, instructor: 'Dr. Lee',     dept: 'CS'      },
    { id: 3, name: 'Operating Systems',    credits: 4, instructor: 'Dr. Patel',   dept: 'CS'      },
    { id: 4, name: 'Linear Algebra',       credits: 3, instructor: 'Dr. Khan',    dept: 'Math'    },
    { id: 5, name: 'Business Analytics',   credits: 3, instructor: 'Dr. Johnson', dept: 'Business'},
  ],
};
