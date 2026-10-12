-- =====================================================
-- Views for offers and placements. Student and company data are reached through
-- offer -> application -> student / drive -> job -> company (Phase 2 design, change #3).
-- =====================================================
CREATE OR REPLACE VIEW offer_details_view AS
SELECT o.offer_id, o.application_id, o.offer_date, o.package_lpa, o.joining_date,
       o.status, o.remarks, o.created_at,
       a.student_id, a.application_status,
       u.full_name AS student_name, u.email AS student_email,
       s.roll_number, d.department_code,
       p.drive_id, p.drive_title, c.company_name, j.job_title,
       pl.placement_id
  FROM offers o
  JOIN applications a     ON a.application_id = o.application_id
  JOIN students s         ON s.student_id = a.student_id
  JOIN users u            ON u.user_id = s.user_id
  JOIN departments d      ON d.department_id = s.department_id
  JOIN placement_drives p ON p.drive_id = a.drive_id
  JOIN jobs j             ON j.job_id = p.job_id
  JOIN companies c        ON c.company_id = j.company_id
  LEFT JOIN placements pl ON pl.offer_id = o.offer_id;

CREATE OR REPLACE VIEW placement_summary_view AS
SELECT pl.placement_id, pl.offer_id, pl.placement_date, pl.final_package_lpa,
       pl.joining_date, pl.placement_status,
       a.application_id, a.student_id,
       u.full_name AS student_name, u.email AS student_email,
       s.roll_number, s.cgpa, s.graduation_year,
       d.department_code, d.department_name,
       c.company_id, c.company_name, j.job_id, j.job_title,
       p.drive_id, p.drive_title
  FROM placements pl
  JOIN offers o           ON o.offer_id = pl.offer_id
  JOIN applications a     ON a.application_id = o.application_id
  JOIN students s         ON s.student_id = a.student_id
  JOIN users u            ON u.user_id = s.user_id
  JOIN departments d      ON d.department_id = s.department_id
  JOIN placement_drives p ON p.drive_id = a.drive_id
  JOIN jobs j             ON j.job_id = p.job_id
  JOIN companies c        ON c.company_id = j.company_id;
