-- =============================================================
-- BeSQL | Migration 002 — Seed 50 Daily Practice Problems
-- Target: Supabase (PostgreSQL 15+)
-- Run: paste into Supabase SQL Editor → Run
-- =============================================================

-- Batch 1: Problems 1–25

INSERT INTO problems (id, code, title, difficulty, points, category, tags, description, solution, schema_hint, test_cases, daily_date, is_active, created_by) VALUES

-- ─── EASY (1–12) ─────────────────────────────────────────────

('p1', 'BSQ-001', 'All Employees', 'Easy', 50, 'SELECT Basics',
 '["SELECT","basics"]',
 'Select all columns from the employees table.',
 'SELECT * FROM employees',
 '{"table":"employees","columns":[["id","INT"],["name","VARCHAR"],["dept_id","INT"],["salary","INT"],["hire_year","INT"],["age","INT"],["level","VARCHAR"]]}',
 '[]', '2026-5-10', true, 'system'),

('p2', 'BSQ-002', 'Count by Department', 'Easy', 75, 'Aggregation',
 '["GROUP BY","COUNT"]',
 'Count the number of employees in each department. Return dept_id and total_employees. Order by total_employees descending, then dept_id ascending.',
 'SELECT dept_id, COUNT(*) AS total_employees FROM employees GROUP BY dept_id ORDER BY total_employees DESC, dept_id ASC',
 '{"table":"employees","columns":[["dept_id","INT"],["name","VARCHAR"]]}',
 '[]', '2026-5-10', true, 'system'),

('p3', 'BSQ-003', 'High Earners', 'Easy', 50, 'Filtering',
 '["WHERE","salary"]',
 'Find all employees with a salary greater than 70000. Return name and salary.',
 'SELECT name, salary FROM employees WHERE salary > 70000',
 '{"table":"employees","columns":[["name","VARCHAR"],["salary","INT"]]}',
 '[]', '2026-5-11', true, 'system'),

('p4', 'BSQ-004', 'Product Categories', 'Easy', 50, 'SELECT Basics',
 '["DISTINCT","products"]',
 'List all unique product categories from the products table.',
 'SELECT DISTINCT category FROM products',
 '{"table":"products","columns":[["category","VARCHAR"]]}',
 '[]', '2026-5-11', true, 'system'),

('p5', 'BSQ-005', 'Recent Hires', 'Easy', 50, 'Filtering',
 '["WHERE","hire_year"]',
 'Find employees hired in 2021 or later. Return name, hire_year, and level. Order by hire_year.',
 'SELECT name, hire_year, level FROM employees WHERE hire_year >= 2021 ORDER BY hire_year',
 '{"table":"employees","columns":[["name","VARCHAR"],["hire_year","INT"],["level","VARCHAR"]]}',
 '[]', '2026-5-12', true, 'system'),

('p6', 'BSQ-006', 'Completed Orders', 'Easy', 50, 'Filtering',
 '["WHERE","status"]',
 'List all orders with status ''completed''. Return id, customer, and amount.',
 'SELECT id, customer, amount FROM orders WHERE status = ''completed''',
 '{"table":"orders","columns":[["id","INT"],["customer","VARCHAR"],["amount","INT"],["status","VARCHAR"]]}',
 '[]', '2026-5-12', true, 'system'),

('p7', 'BSQ-007', 'Top Students', 'Easy', 50, 'Filtering',
 '["WHERE","GPA"]',
 'Find students with a GPA of 3.5 or higher. Return name and gpa. Order by gpa descending.',
 'SELECT name, gpa FROM students WHERE gpa >= 3.5 ORDER BY gpa DESC',
 '{"table":"students","columns":[["name","VARCHAR"],["gpa","FLOAT"]]}',
 '[]', '2026-5-13', true, 'system'),

('p8', 'BSQ-008', 'Department Names', 'Easy', 50, 'SELECT Basics',
 '["SELECT","departments"]',
 'List all department names and their locations from the departments table.',
 'SELECT name, location FROM departments',
 '{"table":"departments","columns":[["name","VARCHAR"],["location","VARCHAR"]]}',
 '[]', '2026-5-13', true, 'system'),

('p9', 'BSQ-009', 'Expensive Products', 'Easy', 50, 'Filtering',
 '["WHERE","price"]',
 'Find all products with a price greater than 50. Return name, category, and price. Order by price descending.',
 'SELECT name, category, price FROM products WHERE price > 50 ORDER BY price DESC',
 '{"table":"products","columns":[["name","VARCHAR"],["category","VARCHAR"],["price","INT"]]}',
 '[]', '2026-5-14', true, 'system'),

('p10', 'BSQ-010', 'CS Courses', 'Easy', 50, 'Filtering',
 '["WHERE","dept"]',
 'List all courses in the CS department. Return name, credits, and instructor.',
 'SELECT name, credits, instructor FROM courses WHERE dept = ''CS''',
 '{"table":"courses","columns":[["name","VARCHAR"],["credits","INT"],["instructor","VARCHAR"],["dept","VARCHAR"]]}',
 '[]', '2026-5-14', true, 'system'),

('p11', 'BSQ-011', 'Young Employees', 'Easy', 50, 'Filtering',
 '["WHERE","age","ORDER BY"]',
 'Find employees under 25 years old. Return name, age, and level. Order by age ascending.',
 'SELECT name, age, level FROM employees WHERE age < 25 ORDER BY age',
 '{"table":"employees","columns":[["name","VARCHAR"],["age","INT"],["level","VARCHAR"]]}',
 '[]', '2026-5-15', true, 'system'),

('p12', 'BSQ-012', 'Order Count per Customer', 'Easy', 75, 'Aggregation',
 '["GROUP BY","COUNT","orders"]',
 'Count the number of orders per customer. Return customer and order_count. Order by order_count descending.',
 'SELECT customer, COUNT(*) AS order_count FROM orders GROUP BY customer ORDER BY order_count DESC',
 '{"table":"orders","columns":[["customer","VARCHAR"],["amount","INT"]]}',
 '[]', '2026-5-15', true, 'system'),

-- ─── MEDIUM (13–30) ──────────────────────────────────────────

('p13', 'BSQ-013', 'Average Salary by Department', 'Medium', 100, 'Aggregation',
 '["AVG","GROUP BY","JOIN"]',
 'Calculate the average salary for each department. Return the department name and avg_salary. Order by avg_salary descending.',
 'SELECT d.name, AVG(e.salary) AS avg_salary FROM employees e JOIN departments d ON e.dept_id = d.id GROUP BY d.name ORDER BY avg_salary DESC',
 '{"table":"employees · departments","columns":[["employees.name","VARCHAR"],["employees.salary","INT"],["departments.name","VARCHAR"]]}',
 '[]', '2026-5-16', true, 'system'),

('p14', 'BSQ-014', 'Total Revenue by Product', 'Medium', 100, 'Aggregation',
 '["SUM","GROUP BY","JOIN"]',
 'Calculate total revenue (sum of amount) for each product. Return the product name and total_revenue. Order by total_revenue descending.',
 'SELECT p.name, SUM(o.amount) AS total_revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY total_revenue DESC',
 '{"table":"orders · products","columns":[["orders.amount","INT"],["products.name","VARCHAR"]]}',
 '[]', '2026-5-16', true, 'system'),

('p15', 'BSQ-015', 'Employees Above Average', 'Medium', 125, 'Subqueries',
 '["subquery","AVG","WHERE"]',
 'Find employees whose salary is above the company-wide average salary. Return name and salary. Order by salary descending.',
 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC',
 '{"table":"employees","columns":[["name","VARCHAR"],["salary","INT"]]}',
 '[]', '2026-5-17', true, 'system'),

('p16', 'BSQ-016', 'Students with Course Names', 'Medium', 100, 'JOINs',
 '["JOIN","students","courses"]',
 'List each student along with the name of their enrolled course. Return student name, course name, and gpa.',
 'SELECT s.name, c.name AS course_name, s.gpa FROM students s JOIN courses c ON s.course_id = c.id',
 '{"table":"students · courses","columns":[["students.name","VARCHAR"],["courses.name","VARCHAR"],["students.gpa","FLOAT"]]}',
 '[]', '2026-5-17', true, 'system'),

('p17', 'BSQ-017', 'Monthly Order Totals', 'Medium', 100, 'Aggregation',
 '["SUM","GROUP BY","month"]',
 'Calculate the total order amount for each month. Return month and total_amount. Order by total_amount descending.',
 'SELECT month, SUM(amount) AS total_amount FROM orders GROUP BY month ORDER BY total_amount DESC',
 '{"table":"orders","columns":[["month","VARCHAR"],["amount","INT"]]}',
 '[]', '2026-5-18', true, 'system'),

('p18', 'BSQ-018', 'Department Budget Utilization', 'Medium', 125, 'JOINs',
 '["JOIN","SUM","GROUP BY"]',
 'For each department, calculate the total salary expenditure (sum of all employee salaries). Return department name and total_salaries.',
 'SELECT d.name, SUM(e.salary) AS total_salaries FROM departments d JOIN employees e ON d.id = e.dept_id GROUP BY d.name',
 '{"table":"employees · departments","columns":[["departments.name","VARCHAR"],["employees.salary","INT"]]}',
 '[]', '2026-5-18', true, 'system'),

('p19', 'BSQ-019', 'Products Never Ordered', 'Medium', 125, 'Subqueries',
 '["NOT IN","subquery"]',
 'Find products that have never been ordered. Return the product name and category.',
 'SELECT name, category FROM products WHERE id NOT IN (SELECT product_id FROM orders)',
 '{"table":"products · orders","columns":[["products.name","VARCHAR"],["products.category","VARCHAR"]]}',
 '[]', '2026-5-19', true, 'system'),

('p20', 'BSQ-020', 'Senior Staff Salary Range', 'Medium', 100, 'Aggregation',
 '["MIN","MAX","WHERE"]',
 'Find the minimum and maximum salary among Senior-level employees. Return min_salary and max_salary.',
 'SELECT MIN(salary) AS min_salary, MAX(salary) AS max_salary FROM employees WHERE level = ''Senior''',
 '{"table":"employees","columns":[["salary","INT"],["level","VARCHAR"]]}',
 '[]', '2026-5-19', true, 'system'),

('p21', 'BSQ-021', 'Repeat Customers', 'Medium', 125, 'Aggregation',
 '["HAVING","COUNT","GROUP BY"]',
 'Find customers who have placed more than 2 orders. Return customer and order_count. Order by order_count descending.',
 'SELECT customer, COUNT(*) AS order_count FROM orders GROUP BY customer HAVING COUNT(*) > 2 ORDER BY order_count DESC',
 '{"table":"orders","columns":[["customer","VARCHAR"]]}',
 '[]', '2026-5-20', true, 'system'),

('p22', 'BSQ-022', 'Grade Distribution', 'Medium', 100, 'Aggregation',
 '["COUNT","GROUP BY","students"]',
 'Count the number of students in each grade. Return grade and student_count. Order by grade.',
 'SELECT grade, COUNT(*) AS student_count FROM students GROUP BY grade ORDER BY grade',
 '{"table":"students","columns":[["grade","VARCHAR"],["name","VARCHAR"]]}',
 '[]', '2026-5-20', true, 'system'),

('p23', 'BSQ-023', 'Low Stock Alert', 'Medium', 100, 'Filtering',
 '["WHERE","ORDER BY"]',
 'Find products with stock less than 50. Return name, stock, and price. Order by stock ascending.',
 'SELECT name, stock, price FROM products WHERE stock < 50 ORDER BY stock',
 '{"table":"products","columns":[["name","VARCHAR"],["stock","INT"],["price","INT"]]}',
 '[]', '2026-5-21', true, 'system'),

('p24', 'BSQ-024', 'Employee Department Lookup', 'Medium', 100, 'JOINs',
 '["JOIN","employees","departments"]',
 'List each employee along with their department name and location. Return employee name, department name, and location.',
 'SELECT e.name, d.name AS department, d.location FROM employees e JOIN departments d ON e.dept_id = d.id',
 '{"table":"employees · departments","columns":[["employees.name","VARCHAR"],["departments.name","VARCHAR"],["departments.location","VARCHAR"]]}',
 '[]', '2026-5-21', true, 'system'),

('p25', 'BSQ-025', 'High-Value Orders', 'Medium', 100, 'JOINs',
 '["JOIN","WHERE"]',
 'Find all completed orders with an amount greater than 500. Return customer, product name, and amount. Order by amount descending.',
 'SELECT o.customer, p.name, o.amount FROM orders o JOIN products p ON o.product_id = p.id WHERE o.status = ''completed'' AND o.amount > 500 ORDER BY o.amount DESC',
 '{"table":"orders · products","columns":[["orders.customer","VARCHAR"],["products.name","VARCHAR"],["orders.amount","INT"]]}',
 '[]', '2026-5-22', true, 'system');
