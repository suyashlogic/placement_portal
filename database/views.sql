-- =====================================================
-- View: one application with everything a list or detail page needs.
-- Used by both the student "My applications" page and the officer Applications page.
-- =====================================================
CREATE OR REPLACE VIEW student_application_view AS
SELECT a.application_id, a.student_id, a.drive_id,
       a.application_status, a.application_date, a.updated_at,
       p.drive_title, p.status AS drive_status, p.drive_date, p.registration_deadline,
       c.company_id, c.company_name,
       j.job_id, j.job_title, j.job_location, j.min_package_lpa, j.max_package_lpa,
       u.full_name AS student_name, u.email AS student_email,
       s.roll_number, s.cgpa, d.department_code
  FROM applications a
  JOIN students s          ON s.student_id = a.student_id
  JOIN users u             ON u.user_id = s.user_id
  JOIN departments d       ON d.department_id = s.department_id
  JOIN placement_drives p  ON p.drive_id = a.drive_id
  JOIN jobs j              ON j.job_id = p.job_id
  JOIN companies c         ON c.company_id = j.company_id;
