-- =====================================================
-- Seed data (all names and companies are fictional)
-- Demo password for every account: Demo@1234
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Departments ----------
INSERT INTO departments (department_name, department_code) VALUES
  ('Computer Science and Engineering',      'CSE'),
  ('Information Technology',                'IT'),
  ('Electronics and Telecommunication',     'ENTC'),
  ('Mechanical Engineering',                'MECH'),
  ('Civil Engineering',                     'CIVIL');

-- ---------- Users (1 admin, 1 officer, 8 students) ----------
INSERT INTO users (email, password_hash, full_name, role)
SELECT v.email, crypt('Demo@1234', gen_salt('bf', 10)), v.full_name, v.role
FROM (VALUES
  ('admin@example.com',    'Asha Admin',      'ADMIN'),
  ('officer@example.com',  'Omkar Officer',   'PLACEMENT_OFFICER'),
  ('student@example.com',  'Aarav Sharma',    'STUDENT'),
  ('student2@example.com', 'Diya Patil',      'STUDENT'),
  ('student3@example.com', 'Rohan Deshmukh',  'STUDENT'),
  ('student4@example.com', 'Sneha Kulkarni',  'STUDENT'),
  ('student5@example.com', 'Karan Mehta',     'STUDENT'),
  ('student6@example.com', 'Priya Joshi',     'STUDENT'),
  ('student7@example.com', 'Aditya Rao',      'STUDENT'),
  ('student8@example.com', 'Neha Singh',      'STUDENT')
) AS v(email, full_name, role);

-- ---------- Students ----------
INSERT INTO students (user_id, department_id, roll_number, phone, cgpa, graduation_year)
SELECT u.user_id, d.department_id, v.roll_number, v.phone, v.cgpa, v.graduation_year
FROM (VALUES
  ('student@example.com',  'CSE',   'CSE21001',   '9000000001', 9.10, 2027),
  ('student2@example.com', 'CSE',   'CSE21002',   '9000000002', 8.40, 2027),
  ('student3@example.com', 'IT',    'IT21001',    '9000000003', 7.60, 2027),
  ('student4@example.com', 'IT',    'IT21002',    '9000000004', 6.80, 2027),
  ('student5@example.com', 'ENTC',  'ENTC21001',  '9000000005', 8.90, 2027),
  ('student6@example.com', 'MECH',  'MECH21001',  '9000000006', 7.20, 2027),
  ('student7@example.com', 'CIVIL', 'CIVIL21001', '9000000007', 5.90, 2027),
  ('student8@example.com', 'CSE',   'CSE22001',   '9000000008', 8.00, 2028)
) AS v(email, dept_code, roll_number, phone, cgpa, graduation_year)
JOIN users u       ON u.email = v.email
JOIN departments d ON d.department_code = v.dept_code;

-- ---------- Skills ----------
INSERT INTO skills (skill_name) VALUES
  ('Java'), ('Python'), ('JavaScript'), ('React'), ('Node.js'), ('SQL'),
  ('C++'), ('Data Structures'), ('Machine Learning'), ('Communication'),
  ('AutoCAD'), ('Embedded C');

-- ---------- Student skills (proficiency 1 = beginner ... 5 = expert) ----------
INSERT INTO student_skills (student_id, skill_id, proficiency_level)
SELECT s.student_id, k.skill_id, v.level
FROM (VALUES
  ('student@example.com',  'Java',             4),
  ('student@example.com',  'Data Structures',  4),
  ('student@example.com',  'SQL',              3),
  ('student@example.com',  'React',            3),
  ('student2@example.com', 'Python',           4),
  ('student2@example.com', 'Machine Learning', 3),
  ('student2@example.com', 'SQL',              4),
  ('student2@example.com', 'Data Structures',  3),
  ('student3@example.com', 'Java',             3),
  ('student3@example.com', 'SQL',              2),
  ('student3@example.com', 'Data Structures',  3),
  ('student4@example.com', 'Python',           2),
  ('student4@example.com', 'SQL',              2),
  ('student5@example.com', 'Embedded C',       4),
  ('student5@example.com', 'C++',              3),
  ('student6@example.com', 'AutoCAD',          3),
  ('student6@example.com', 'Communication',    3),
  ('student7@example.com', 'AutoCAD',          2),
  ('student8@example.com', 'Java',             2)
) AS v(email, skill_name, level)
JOIN users  u ON u.email = v.email
JOIN students s ON s.user_id = u.user_id
JOIN skills k ON k.skill_name = v.skill_name;

-- ---------- Companies ----------
INSERT INTO companies (company_name, industry, location, website, description, contact_person, contact_email)
VALUES
  ('TechNova Solutions',  'IT Services',    'Pune',      'https://technova.example.com',
   'Demo IT services company.',          'Ritu Verma',  'hr@technova.example.com'),
  ('DataBridge Analytics','Data Analytics', 'Bengaluru', 'https://databridge.example.com',
   'Demo analytics and AI company.',     'Sameer Nair', 'talent@databridge.example.com'),
  ('CoreMech Industries', 'Manufacturing',  'Nashik',    'https://coremech.example.com',
   'Demo manufacturing company.',        'Anil Pawar',  'careers@coremech.example.com'),
  ('BuildRight Infra',    'Infrastructure', 'Mumbai',    'https://buildright.example.com',
   'Demo construction company.',         'Meera Shah',  'jobs@buildright.example.com');

-- ---------- Jobs ----------
INSERT INTO jobs (company_id, job_title, job_description, job_location, employment_type, min_package_lpa, max_package_lpa)
SELECT c.company_id, v.job_title, v.job_description, v.job_location, v.employment_type, v.min_pkg, v.max_pkg
FROM (VALUES
  ('TechNova Solutions',   'Software Engineer',         'Develop and maintain backend services.',   'Pune',      'FULL_TIME', 6.00,  8.00),
  ('DataBridge Analytics', 'Data Analyst',              'Analyse data and build dashboards.',       'Bengaluru', 'FULL_TIME', 5.00,  7.00),
  ('DataBridge Analytics', 'ML Engineer',               'Build and deploy machine learning models.','Bengaluru', 'FULL_TIME', 8.00, 12.00),
  ('CoreMech Industries',  'Graduate Engineer Trainee', 'Shop-floor and design training program.',  'Nashik',    'FULL_TIME', 4.00,  5.00),
  ('BuildRight Infra',     'Site Engineer',             'Supervise construction sites.',            'Mumbai',    'FULL_TIME', 3.50,  4.50)
) AS v(company_name, job_title, job_description, job_location, employment_type, min_pkg, max_pkg)
JOIN companies c ON c.company_name = v.company_name;

-- ---------- Job skills (job titles are unique in this seed) ----------
INSERT INTO job_skills (job_id, skill_id, required_level)
SELECT j.job_id, k.skill_id, v.level
FROM (VALUES
  ('Software Engineer',         'Java',             3),
  ('Software Engineer',         'Data Structures',  3),
  ('Software Engineer',         'SQL',              2),
  ('Data Analyst',              'Python',           3),
  ('Data Analyst',              'SQL',              3),
  ('ML Engineer',               'Python',           4),
  ('ML Engineer',               'Machine Learning', 3),
  ('Graduate Engineer Trainee', 'AutoCAD',          2),
  ('Graduate Engineer Trainee', 'Communication',    2),
  ('Site Engineer',             'AutoCAD',          3)
) AS v(job_title, skill_name, level)
JOIN jobs   j ON j.job_title = v.job_title
JOIN skills k ON k.skill_name = v.skill_name;

-- ---------- Placement drives ----------
-- Dates are relative to NOW() so the OPEN drives stay open whenever you seed.
INSERT INTO placement_drives
  (job_id, drive_title, description, registration_open_date,
   registration_deadline, drive_date, status, created_by)
SELECT j.job_id, v.drive_title, v.description,
       NOW() + v.open_days     * INTERVAL '1 day',
       NOW() + v.deadline_days * INTERVAL '1 day',
       NOW() + v.drive_days    * INTERVAL '1 day',
       v.status,
       (SELECT user_id FROM users WHERE email = 'officer@example.com')
FROM (VALUES
  ('Software Engineer',         'TechNova Campus Drive 2027',        'On-campus hiring for software engineers.', 'OPEN',   -2,  14, 20),
  ('Data Analyst',              'DataBridge Analyst Drive 2027',     'Hiring data analysts.',                    'OPEN',   -1,  10, 15),
  ('Graduate Engineer Trainee', 'CoreMech GET Drive 2027',           'Graduate engineer trainee program.',       'OPEN',   -3,   7, 12),
  ('ML Engineer',               'DataBridge ML Drive 2027',          'Hiring ML engineers. Registration over.',  'CLOSED', -20, -5, -1),
  ('Site Engineer',             'BuildRight Site Engineer Drive 2027','Draft: not yet published.',               'DRAFT',   5,  25, 30)
) AS v(job_title, drive_title, description, status, open_days, deadline_days, drive_days)
JOIN jobs j ON j.job_title = v.job_title;

-- ---------- Eligibility criteria ----------
INSERT INTO drive_eligibility (drive_id, min_cgpa, graduation_year)
SELECT p.drive_id, v.min_cgpa, v.graduation_year
FROM (VALUES
  ('TechNova Campus Drive 2027',          7.00, 2027),
  ('DataBridge Analyst Drive 2027',       7.50, 2027),
  ('CoreMech GET Drive 2027',             6.50, 2027),
  ('DataBridge ML Drive 2027',            8.00, 2027),
  ('BuildRight Site Engineer Drive 2027', 6.00, NULL::int)   -- any graduation year
) AS v(drive_title, min_cgpa, graduation_year)
JOIN placement_drives p ON p.drive_title = v.drive_title;

INSERT INTO drive_eligible_departments (drive_id, department_id)
SELECT p.drive_id, d.department_id
FROM (VALUES
  ('TechNova Campus Drive 2027',          'CSE'),
  ('TechNova Campus Drive 2027',          'IT'),
  ('DataBridge Analyst Drive 2027',       'CSE'),
  ('DataBridge Analyst Drive 2027',       'IT'),
  ('DataBridge Analyst Drive 2027',       'ENTC'),
  ('CoreMech GET Drive 2027',             'MECH'),
  ('DataBridge ML Drive 2027',            'CSE'),
  ('DataBridge ML Drive 2027',            'IT'),
  ('BuildRight Site Engineer Drive 2027', 'CIVIL')
) AS v(drive_title, dept_code)
JOIN placement_drives p ON p.drive_title = v.drive_title
JOIN departments d      ON d.department_code = v.dept_code;