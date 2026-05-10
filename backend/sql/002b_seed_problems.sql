-- =============================================================
-- BeSQL | Migration 002b — Seed Problems 26–50
-- Target: Supabase (PostgreSQL 15+)
-- =============================================================

INSERT INTO problems (id, code, title, difficulty, points, category, tags, description, solution, schema_hint, test_cases, daily_date, is_active, created_by) VALUES

-- ─── MEDIUM continued (26–30) ────────────────────────────────

('p26', 'BSQ-026', 'Average GPA per Course', 'Medium', 100, 'Aggregation',
 '["AVG","GROUP BY","JOIN"]',
 'Calculate the average GPA of students in each course. Return course name and avg_gpa. Order by avg_gpa descending.',
 'SELECT c.name, AVG(s.gpa) AS avg_gpa FROM students s JOIN courses c ON s.course_id = c.id GROUP BY c.name ORDER BY avg_gpa DESC',
 '{"table":"students · courses","columns":[["students.gpa","FLOAT"],["courses.name","VARCHAR"]]}',
 '[]', '2026-5-22', true, 'system'),

('p27', 'BSQ-027', 'Employees per Level', 'Medium', 100, 'Aggregation',
 '["COUNT","GROUP BY"]',
 'Count the number of employees at each level (Intern, Junior, Mid, Senior, Lead). Return level and emp_count. Order by emp_count descending.',
 'SELECT level, COUNT(*) AS emp_count FROM employees GROUP BY level ORDER BY emp_count DESC',
 '{"table":"employees","columns":[["level","VARCHAR"]]}',
 '[]', '2026-5-23', true, 'system'),

('p28', 'BSQ-028', 'Cancelled Orders', 'Medium', 100, 'Filtering',
 '["WHERE","orders"]',
 'Find all cancelled orders. Return customer, amount, and month.',
 'SELECT customer, amount, month FROM orders WHERE status = ''cancelled''',
 '{"table":"orders","columns":[["customer","VARCHAR"],["amount","INT"],["status","VARCHAR"],["month","VARCHAR"]]}',
 '[]', '2026-5-23', true, 'system'),

('p29', 'BSQ-029', 'Highest Paid per Department', 'Medium', 150, 'Subqueries',
 '["subquery","MAX","GROUP BY"]',
 'Find the highest paid employee in each department. Return employee name, dept_id, and salary. Order by salary descending.',
 'SELECT name, dept_id, salary FROM employees WHERE salary IN (SELECT MAX(salary) FROM employees GROUP BY dept_id) ORDER BY salary DESC',
 '{"table":"employees","columns":[["name","VARCHAR"],["dept_id","INT"],["salary","INT"]]}',
 '[]', '2026-5-24', true, 'system'),

('p30', 'BSQ-030', 'New York Departments', 'Medium', 100, 'JOINs',
 '["JOIN","WHERE","location"]',
 'List all employees who work in New York departments. Return employee name, department name, and salary.',
 'SELECT e.name, d.name AS department, e.salary FROM employees e JOIN departments d ON e.dept_id = d.id WHERE d.location = ''New York''',
 '{"table":"employees · departments","columns":[["employees.name","VARCHAR"],["departments.name","VARCHAR"],["departments.location","VARCHAR"]]}',
 '[]', '2026-5-24', true, 'system'),

-- ─── HARD (31–42) ────────────────────────────────────────────

('p31', 'BSQ-031', 'Department Salary vs Budget', 'Hard', 200, 'JOINs',
 '["JOIN","SUM","GROUP BY","comparison"]',
 'For each department, show the department name, budget, and total employee salaries. Return name, budget, and total_salaries.',
 'SELECT d.name, d.budget, SUM(e.salary) AS total_salaries FROM departments d JOIN employees e ON d.id = e.dept_id GROUP BY d.name, d.budget',
 '{"table":"employees · departments","columns":[["departments.name","VARCHAR"],["departments.budget","INT"],["employees.salary","INT"]]}',
 '[]', '2026-5-25', true, 'system'),

('p32', 'BSQ-032', 'Second Highest Salary', 'Hard', 200, 'Subqueries',
 '["subquery","MAX","ORDER BY","LIMIT"]',
 'Find the employee(s) with the second highest salary. Return name and salary.',
 'SELECT name, salary FROM employees WHERE salary = (SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees))',
 '{"table":"employees","columns":[["name","VARCHAR"],["salary","INT"]]}',
 '[]', '2026-5-25', true, 'system'),

('p33', 'BSQ-033', 'Customer Spending Summary', 'Hard', 200, 'Aggregation',
 '["SUM","COUNT","GROUP BY","HAVING"]',
 'Find customers who have spent more than 1000 total across all completed orders. Return customer, total_spent, and order_count. Order by total_spent descending.',
 'SELECT customer, SUM(amount) AS total_spent, COUNT(*) AS order_count FROM orders WHERE status = ''completed'' GROUP BY customer HAVING SUM(amount) > 1000 ORDER BY total_spent DESC',
 '{"table":"orders","columns":[["customer","VARCHAR"],["amount","INT"],["status","VARCHAR"]]}',
 '[]', '2026-5-26', true, 'system'),

('p34', 'BSQ-034', 'Cross-Department Salary Comparison', 'Hard', 200, 'Subqueries',
 '["subquery","AVG","JOIN"]',
 'Find employees who earn more than the average salary of their own department. Return employee name, salary, and department name. Order by salary descending.',
 'SELECT e.name, e.salary, d.name AS department FROM employees e JOIN departments d ON e.dept_id = d.id WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id) ORDER BY e.salary DESC',
 '{"table":"employees · departments","columns":[["employees.name","VARCHAR"],["employees.salary","INT"],["departments.name","VARCHAR"]]}',
 '[]', '2026-5-26', true, 'system'),

('p35', 'BSQ-035', 'Most Popular Product', 'Hard', 200, 'Aggregation',
 '["COUNT","GROUP BY","JOIN","ORDER BY","LIMIT"]',
 'Find the most ordered product (by number of orders). Return product name and order_count.',
 'SELECT p.name, COUNT(*) AS order_count FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY order_count DESC LIMIT 1',
 '{"table":"orders · products","columns":[["products.name","VARCHAR"],["orders.product_id","INT"]]}',
 '[]', '2026-5-27', true, 'system'),

('p36', 'BSQ-036', 'Students Above Course Average', 'Hard', 200, 'Subqueries',
 '["subquery","AVG","JOIN"]',
 'Find students whose GPA is above the average GPA of their course. Return student name, course name, and gpa.',
 'SELECT s.name, c.name AS course_name, s.gpa FROM students s JOIN courses c ON s.course_id = c.id WHERE s.gpa > (SELECT AVG(s2.gpa) FROM students s2 WHERE s2.course_id = s.course_id)',
 '{"table":"students · courses","columns":[["students.name","VARCHAR"],["courses.name","VARCHAR"],["students.gpa","FLOAT"]]}',
 '[]', '2026-5-27', true, 'system'),

('p37', 'BSQ-037', 'Revenue by Category', 'Hard', 200, 'JOINs',
 '["JOIN","SUM","GROUP BY"]',
 'Calculate total revenue per product category from completed orders. Return category and total_revenue. Order by total_revenue descending.',
 'SELECT p.category, SUM(o.amount) AS total_revenue FROM orders o JOIN products p ON o.product_id = p.id WHERE o.status = ''completed'' GROUP BY p.category ORDER BY total_revenue DESC',
 '{"table":"orders · products","columns":[["products.category","VARCHAR"],["orders.amount","INT"]]}',
 '[]', '2026-5-28', true, 'system'),

('p38', 'BSQ-038', 'Employee Tenure Ranking', 'Hard', 200, 'Expressions',
 '["arithmetic","ORDER BY"]',
 'Calculate each employee''s tenure (2026 minus hire_year). Return name, hire_year, and tenure. Order by tenure descending.',
 'SELECT name, hire_year, 2026 - hire_year AS tenure FROM employees ORDER BY tenure DESC',
 '{"table":"employees","columns":[["name","VARCHAR"],["hire_year","INT"]]}',
 '[]', '2026-5-28', true, 'system'),

('p39', 'BSQ-039', 'Department with Most Employees', 'Hard', 200, 'Subqueries',
 '["subquery","COUNT","GROUP BY","JOIN"]',
 'Find the department that has the most employees. Return department name and emp_count.',
 'SELECT d.name, COUNT(*) AS emp_count FROM employees e JOIN departments d ON e.dept_id = d.id GROUP BY d.name ORDER BY emp_count DESC LIMIT 1',
 '{"table":"employees · departments","columns":[["departments.name","VARCHAR"],["employees.id","INT"]]}',
 '[]', '2026-5-29', true, 'system'),

('p40', 'BSQ-040', 'Unmatched Salary Expectations', 'Hard', 225, 'JOINs',
 '["LEFT JOIN","NULL"]',
 'Find departments where the total employee salary exceeds the budget. Return department name, budget, and total_salaries.',
 'SELECT d.name, d.budget, SUM(e.salary) AS total_salaries FROM departments d JOIN employees e ON d.id = e.dept_id GROUP BY d.name, d.budget HAVING SUM(e.salary) > d.budget',
 '{"table":"employees · departments","columns":[["departments.name","VARCHAR"],["departments.budget","INT"],["employees.salary","INT"]]}',
 '[]', '2026-5-29', true, 'system'),

('p41', 'BSQ-041', 'Pending Order Values', 'Hard', 200, 'JOINs',
 '["JOIN","WHERE","SUM"]',
 'Calculate the total value of all pending orders grouped by product. Return product name and pending_total. Order by pending_total descending.',
 'SELECT p.name, SUM(o.amount) AS pending_total FROM orders o JOIN products p ON o.product_id = p.id WHERE o.status = ''pending'' GROUP BY p.name ORDER BY pending_total DESC',
 '{"table":"orders · products","columns":[["products.name","VARCHAR"],["orders.amount","INT"],["orders.status","VARCHAR"]]}',
 '[]', '2026-5-30', true, 'system'),

('p42', 'BSQ-042', 'Multi-Course Departments', 'Hard', 200, 'Aggregation',
 '["COUNT","GROUP BY","HAVING"]',
 'Find departments that offer more than 1 course. Return dept and course_count. Order by course_count descending.',
 'SELECT dept, COUNT(*) AS course_count FROM courses GROUP BY dept HAVING COUNT(*) > 1 ORDER BY course_count DESC',
 '{"table":"courses","columns":[["dept","VARCHAR"],["name","VARCHAR"]]}',
 '[]', '2026-5-30', true, 'system'),

-- ─── EXPERT (43–50) ──────────────────────────────────────────

('p43', 'BSQ-043', 'Full Employee Report', 'Expert', 300, 'Complex JOINs',
 '["JOIN","aggregation","subquery"]',
 'Create a report showing each department name, employee count, average salary, and the name of the highest-paid employee. Order by average salary descending.',
 'SELECT d.name AS department, COUNT(*) AS emp_count, AVG(e.salary) AS avg_salary, MAX(e.name) AS top_earner FROM employees e JOIN departments d ON e.dept_id = d.id GROUP BY d.name ORDER BY avg_salary DESC',
 '{"table":"employees · departments","columns":[["employees.name","VARCHAR"],["employees.salary","INT"],["departments.name","VARCHAR"]]}',
 '[]', '2026-5-31', true, 'system'),

('p44', 'BSQ-044', 'Customer Order Product Details', 'Expert', 300, 'Complex JOINs',
 '["JOIN","multiple tables","aggregation"]',
 'For each customer, find total orders, total spent, and the number of distinct products ordered. Only include completed orders. Return customer, total_orders, total_spent, and distinct_products. Order by total_spent descending.',
 'SELECT o.customer, COUNT(*) AS total_orders, SUM(o.amount) AS total_spent, COUNT(DISTINCT o.product_id) AS distinct_products FROM orders o WHERE o.status = ''completed'' GROUP BY o.customer ORDER BY total_spent DESC',
 '{"table":"orders · products","columns":[["orders.customer","VARCHAR"],["orders.amount","INT"],["orders.product_id","INT"]]}',
 '[]', '2026-5-31', true, 'system'),

('p45', 'BSQ-045', 'Salary Percentile', 'Expert', 300, 'Subqueries',
 '["subquery","COUNT","comparison"]',
 'For each employee, calculate how many other employees earn less than them. Return name, salary, and employees_below. Order by salary descending.',
 'SELECT e1.name, e1.salary, (SELECT COUNT(*) FROM employees e2 WHERE e2.salary < e1.salary) AS employees_below FROM employees e1 ORDER BY e1.salary DESC',
 '{"table":"employees","columns":[["name","VARCHAR"],["salary","INT"]]}',
 '[]', '2026-6-1', true, 'system'),

('p46', 'BSQ-046', 'Department Budget Efficiency', 'Expert', 300, 'Complex JOINs',
 '["JOIN","division","aggregation"]',
 'Calculate salary-to-budget ratio for each department. Return department name, budget, total_salaries, and the ratio as pct_used (total_salaries * 100 / budget). Order by pct_used descending.',
 'SELECT d.name, d.budget, SUM(e.salary) AS total_salaries, SUM(e.salary) * 100 / d.budget AS pct_used FROM departments d JOIN employees e ON d.id = e.dept_id GROUP BY d.name, d.budget ORDER BY pct_used DESC',
 '{"table":"employees · departments","columns":[["departments.name","VARCHAR"],["departments.budget","INT"],["employees.salary","INT"]]}',
 '[]', '2026-6-1', true, 'system'),

('p47', 'BSQ-047', 'Correlated Student Rankings', 'Expert', 300, 'Subqueries',
 '["correlated subquery","COUNT"]',
 'For each student, find their rank within their course based on GPA (number of students in the same course with a higher GPA, plus 1). Return student name, course_id, gpa, and course_rank. Order by course_id, course_rank.',
 'SELECT s1.name, s1.course_id, s1.gpa, (SELECT COUNT(*) FROM students s2 WHERE s2.course_id = s1.course_id AND s2.gpa > s1.gpa) + 1 AS course_rank FROM students s1 ORDER BY s1.course_id, course_rank',
 '{"table":"students","columns":[["name","VARCHAR"],["course_id","INT"],["gpa","FLOAT"]]}',
 '[]', '2026-6-2', true, 'system'),

('p48', 'BSQ-048', 'Product Inventory Value', 'Expert', 300, 'Expressions',
 '["arithmetic","aggregation","JOIN"]',
 'Calculate the total inventory value (price × stock) for each product category. Return category, total_value, and product_count. Order by total_value descending.',
 'SELECT category, SUM(price * stock) AS total_value, COUNT(*) AS product_count FROM products GROUP BY category ORDER BY total_value DESC',
 '{"table":"products","columns":[["category","VARCHAR"],["price","INT"],["stock","INT"]]}',
 '[]', '2026-6-2', true, 'system'),

('p49', 'BSQ-049', 'Full Sales Pipeline', 'Expert', 350, 'Complex JOINs',
 '["JOIN","CASE","GROUP BY"]',
 'For each product, show the product name, total completed revenue, total pending revenue, and total cancelled revenue. Order by completed revenue descending.',
 'SELECT p.name, SUM(CASE WHEN o.status = ''completed'' THEN o.amount ELSE 0 END) AS completed_revenue, SUM(CASE WHEN o.status = ''pending'' THEN o.amount ELSE 0 END) AS pending_revenue, SUM(CASE WHEN o.status = ''cancelled'' THEN o.amount ELSE 0 END) AS cancelled_revenue FROM orders o JOIN products p ON o.product_id = p.id GROUP BY p.name ORDER BY completed_revenue DESC',
 '{"table":"orders · products","columns":[["products.name","VARCHAR"],["orders.amount","INT"],["orders.status","VARCHAR"]]}',
 '[]', '2026-6-3', true, 'system'),

('p50', 'BSQ-050', 'Employee vs Department Average', 'Expert', 350, 'Complex Analysis',
 '["subquery","JOIN","comparison","arithmetic"]',
 'For each employee, show their name, salary, department name, department average salary, and the difference (salary minus department average). Order by difference descending.',
 'SELECT e.name, e.salary, d.name AS department, (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id) AS dept_avg, e.salary - (SELECT AVG(e3.salary) FROM employees e3 WHERE e3.dept_id = e.dept_id) AS difference FROM employees e JOIN departments d ON e.dept_id = d.id ORDER BY difference DESC',
 '{"table":"employees · departments","columns":[["employees.name","VARCHAR"],["employees.salary","INT"],["departments.name","VARCHAR"]]}',
 '[]', '2026-6-3', true, 'system');
