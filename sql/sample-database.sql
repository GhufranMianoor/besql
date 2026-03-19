-- =====================================================
-- BeSQL Sample Database Schema
-- =====================================================
-- This file contains the complete schema for the sample
-- database used in practice problems and contests

-- =====================================================
-- ROLES TABLE
-- =====================================================
CREATE TABLE roles (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- Insert roles as needed

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert users as needed

-- =====================================================
-- USER_ROLES TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Insert user roles as needed

-- =====================================================
-- PRIVILEGES TABLE
-- =====================================================
CREATE TABLE privileges (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  code VARCHAR(50) NOT NULL UNIQUE
);

-- Insert privileges as needed

-- =====================================================
-- ROLE_PRIVILEGES TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE role_privileges (
  role_id INT NOT NULL,
  privilege_id INT NOT NULL,
  PRIMARY KEY (role_id, privilege_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (privilege_id) REFERENCES privileges(id) ON DELETE CASCADE
);

-- Admin role has all privileges
-- Insert role-privilege mappings as needed

-- =====================================================
-- SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  problem_id VARCHAR(50) NOT NULL,
  contest_id INT,
  submitted_code LONGTEXT NOT NULL,
  verdict VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message LONGTEXT,
  runtime_ms INT,
  memory_mb INT,
  tests_passed INT DEFAULT 0,
  total_tests INT DEFAULT 0,
  score INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  judged_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_user_problem (user_id, problem_id),
  KEY idx_verdict (verdict),
  KEY idx_submitted_at (submitted_at)
);

-- Insert submissions as needed

-- =====================================================
-- DEPARTMENTS TABLE (Sample Business Data)
-- =====================================================
CREATE TABLE departments (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  budget INT NOT NULL,
  location VARCHAR(100) NOT NULL,
  headcount INT NOT NULL
);

-- Insert departments as needed

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dept_id INT NOT NULL,
  salary INT NOT NULL,
  hire_year INT NOT NULL,
  age INT NOT NULL,
  level VARCHAR(50) NOT NULL,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);

-- Insert employees as needed

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price INT NOT NULL,
  stock INT NOT NULL
);

-- Insert products as needed

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer VARCHAR(100) NOT NULL,
  product_id INT NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  month VARCHAR(10) NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert orders as needed

-- =====================================================
-- COURSES TABLE
-- =====================================================
CREATE TABLE courses (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  credits INT NOT NULL,
  instructor VARCHAR(100) NOT NULL,
  dept VARCHAR(50) NOT NULL
);

-- Insert courses as needed

-- =====================================================
-- STUDENTS TABLE
-- =====================================================
CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade INT NOT NULL,
  course_id INT NOT NULL,
  year INT NOT NULL,
  gpa DECIMAL(3,1) NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Insert students as needed

-- =====================================================
-- INDEXES (Optional, for performance)
-- =====================================================
CREATE INDEX idx_employees_dept_id ON employees(dept_id);
CREATE INDEX idx_employees_salary ON employees(salary);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_customer ON orders(customer);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_students_course_id ON students(course_id);
