-- =====================================================
-- Phase 10: analytics views and functions (the reports in the project specification).
-- Safe to re-run. Phase 11 exposes these through the API and the dashboards.
--
-- Definition used everywhere: a student is "placed" when they have a placement whose status is
-- not CANCELLED. The one-placement-per-student trigger (Phase 8) guarantees that means
-- "at most one row per student", so counting placements never double-counts a student.
-- =====================================================

-- ---------- VIEWS ----------

-- Students who are eligible for a currently OPEN drive. The eligibility decision comes from the same
-- SQL function used by the student drive list and by the apply transaction, so reports can never disagree.
CREATE OR REPLACE VIEW eligible_students_view AS
SELECT p.drive_id, p.drive_title,
       s.student_id, u.full_name AS student_name, s.roll_number,
       d.department_code, s.cgpa, s.graduation_year
  FROM placement_drives p
  CROSS JOIN students s
  JOIN users u       ON u.user_id = s.user_id AND u.is_active
  JOIN departments d ON d.department_id = s.department_id
  CROSS JOIN LATERAL check_student_eligibility(s.student_id, p.drive_id) AS e
 WHERE p.status = 'OPEN' AND e.is_eligible;

-- One row per company: its pipeline from jobs to hired students
CREATE OR REPLACE VIEW company_hiring_view AS
SELECT c.company_id, c.company_name, c.industry,
       COUNT(DISTINCT j.job_id)                AS jobs,
       COUNT(DISTINCT p.drive_id)              AS drives,
       COUNT(DISTINCT a.application_id)        AS applications,
       COUNT(DISTINCT o.offer_id)              AS offers,
       COUNT(DISTINCT pl.placement_id)         AS students_hired,
       ROUND(AVG(pl.final_package_lpa), 2)     AS avg_package_lpa,
       MAX(pl.final_package_lpa)               AS highest_package_lpa
  FROM companies c
  LEFT JOIN jobs j              ON j.company_id = c.company_id
  LEFT JOIN placement_drives p  ON p.job_id = j.job_id
  LEFT JOIN applications a      ON a.drive_id = p.drive_id
  LEFT JOIN offers o            ON o.application_id = a.application_id
  LEFT JOIN placements pl       ON pl.offer_id = o.offer_id AND pl.placement_status <> 'CANCELLED'
 GROUP BY c.company_id, c.company_name, c.industry;

-- One row per department. The CTE reduces placements to "one row per placed student" first, so the
-- LEFT JOIN below cannot multiply rows.
CREATE OR REPLACE VIEW department_placement_statistics_view AS
WITH placed AS (
  SELECT a.student_id, pl.final_package_lpa
    FROM placements pl
    JOIN offers o       ON o.offer_id = pl.offer_id
    JOIN applications a ON a.application_id = o.application_id
   WHERE pl.placement_status <> 'CANCELLED'
)
SELECT d.department_id, d.department_code, d.department_name,
       COUNT(s.student_id)                                          AS total_students,
       COUNT(pd.student_id)                                         AS placed_students,
       ROUND(100.0 * COUNT(pd.student_id) / NULLIF(COUNT(s.student_id), 0), 2) AS placement_rate,
       ROUND(AVG(pd.final_package_lpa), 2)                          AS avg_package_lpa,
       MAX(pd.final_package_lpa)                                    AS highest_package_lpa
  FROM departments d
  LEFT JOIN students s ON s.department_id = d.department_id
  LEFT JOIN placed pd  ON pd.student_id = s.student_id
 GROUP BY d.department_id, d.department_code, d.department_name;

-- ---------- FUNCTIONS ----------

-- Funnel numbers for the whole portal (one row)
CREATE OR REPLACE FUNCTION get_overview_statistics()
RETURNS TABLE (total_students INT, total_companies INT, active_drives INT, total_applications INT,
               shortlisted_students INT, selected_students INT, placed_students INT, placement_rate NUMERIC)
LANGUAGE sql STABLE AS $$
  WITH reached AS (          -- which students EVER reached each stage, read from the history table
    SELECT a.student_id,
           bool_or(h.new_status = 'SHORTLISTED') AS shortlisted,
           bool_or(h.new_status = 'SELECTED')    AS selected
      FROM application_status_history h
      JOIN applications a ON a.application_id = h.application_id
     GROUP BY a.student_id
  ), placed AS (
    SELECT DISTINCT a.student_id
      FROM placements pl JOIN offers o ON o.offer_id = pl.offer_id JOIN applications a ON a.application_id = o.application_id
     WHERE pl.placement_status <> 'CANCELLED'
  )
  SELECT (SELECT COUNT(*)::int FROM students),
         (SELECT COUNT(*)::int FROM companies WHERE status = 'ACTIVE'),
         (SELECT COUNT(*)::int FROM placement_drives WHERE status = 'OPEN'),
         (SELECT COUNT(*)::int FROM applications),
         (SELECT COUNT(*) FILTER (WHERE shortlisted)::int FROM reached),
         (SELECT COUNT(*) FILTER (WHERE selected)::int FROM reached),
         (SELECT COUNT(*)::int FROM placed),
         ROUND(100.0 * (SELECT COUNT(*) FROM placed) / NULLIF((SELECT COUNT(*) FROM students), 0), 2);
$$;

-- One student's own application statistics. PL/pgSQL because it validates its input first.
CREATE OR REPLACE FUNCTION get_student_application_statistics(p_student_id INT)
RETURNS TABLE (total_applications INT, in_progress INT, shortlisted INT, selected INT,
               rejected INT, withdrawn INT, offers_received INT, is_placed BOOLEAN)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = p_student_id) THEN
    RAISE EXCEPTION 'Student % does not exist', p_student_id;
  END IF;

  RETURN QUERY
  SELECT COUNT(*)::int,
         (COUNT(*) FILTER (WHERE a.application_status IN ('APPLIED','UNDER_REVIEW','SHORTLISTED','INTERVIEW')))::int,
         (COUNT(*) FILTER (WHERE a.application_status IN ('SHORTLISTED','INTERVIEW','SELECTED','OFFERED','PLACED')))::int,
         (COUNT(*) FILTER (WHERE a.application_status IN ('SELECTED','OFFERED','PLACED')))::int,
         (COUNT(*) FILTER (WHERE a.application_status = 'REJECTED'))::int,
         (COUNT(*) FILTER (WHERE a.application_status = 'WITHDRAWN'))::int,
         (COUNT(*) FILTER (WHERE a.application_status IN ('OFFERED','PLACED')))::int,
         COALESCE(bool_or(a.application_status = 'PLACED'), FALSE)
    FROM applications a
   WHERE a.student_id = p_student_id;
END;
$$;

-- Department placement rate, optionally for one graduating class
CREATE OR REPLACE FUNCTION calculate_department_placement_rate(p_graduation_year INT DEFAULT NULL)
RETURNS TABLE (department_code VARCHAR, department_name VARCHAR, total_students INT,
               placed_students INT, placement_rate NUMERIC, avg_package_lpa NUMERIC)
LANGUAGE sql STABLE AS $$
  WITH placed AS (
    SELECT a.student_id, pl.final_package_lpa
      FROM placements pl JOIN offers o ON o.offer_id = pl.offer_id JOIN applications a ON a.application_id = o.application_id
     WHERE pl.placement_status <> 'CANCELLED'
  )
  SELECT d.department_code, d.department_name,
         COUNT(s.student_id)::int,
         COUNT(pd.student_id)::int,
         ROUND(100.0 * COUNT(pd.student_id) / NULLIF(COUNT(s.student_id), 0), 2),
         ROUND(AVG(pd.final_package_lpa), 2)
    FROM departments d
    LEFT JOIN students s ON s.department_id = d.department_id
                        AND (p_graduation_year IS NULL OR s.graduation_year = p_graduation_year)
    LEFT JOIN placed pd  ON pd.student_id = s.student_id
   GROUP BY d.department_id, d.department_code, d.department_name
   ORDER BY 5 DESC NULLS LAST, d.department_code;
$$;

-- Funnel per drive. "Shortlisted/selected/offered" mean "ever reached that stage": a student who was
-- shortlisted and later selected still counts as shortlisted, which is why this reads the history table.
CREATE OR REPLACE FUNCTION calculate_drive_selection_ratio(p_drive_id INT DEFAULT NULL)
RETURNS TABLE (drive_id INT, drive_title VARCHAR, company_name VARCHAR, applications INT,
               shortlisted INT, selected INT, offered INT, selection_ratio NUMERIC)
LANGUAGE sql STABLE AS $$
  WITH reached AS (
    SELECT h.application_id,
           bool_or(h.new_status = 'SHORTLISTED') AS shortlisted,
           bool_or(h.new_status = 'SELECTED')    AS selected,
           bool_or(h.new_status = 'OFFERED')     AS offered
      FROM application_status_history h
     GROUP BY h.application_id
  )
  SELECT p.drive_id, p.drive_title, c.company_name,
         COUNT(a.application_id)::int,
         (COUNT(*) FILTER (WHERE r.shortlisted))::int,
         (COUNT(*) FILTER (WHERE r.selected))::int,
         (COUNT(*) FILTER (WHERE r.offered))::int,
         ROUND(100.0 * COUNT(*) FILTER (WHERE r.selected) / NULLIF(COUNT(a.application_id), 0), 2)
    FROM placement_drives p
    JOIN jobs j      ON j.job_id = p.job_id
    JOIN companies c ON c.company_id = j.company_id
    LEFT JOIN applications a ON a.drive_id = p.drive_id
    LEFT JOIN reached r      ON r.application_id = a.application_id
   WHERE p_drive_id IS NULL OR p.drive_id = p_drive_id
   GROUP BY p.drive_id, p.drive_title, c.company_name
   ORDER BY p.drive_id;
$$;

-- Company hiring: a function that wraps the view (one company, or all of them)
CREATE OR REPLACE FUNCTION get_company_hiring_statistics(p_company_id INT DEFAULT NULL)
RETURNS SETOF company_hiring_view
LANGUAGE sql STABLE AS $$
  SELECT * FROM company_hiring_view
   WHERE p_company_id IS NULL OR company_id = p_company_id
   ORDER BY students_hired DESC, company_name;
$$;

-- Average, median, highest and lowest final package
CREATE OR REPLACE FUNCTION get_package_statistics()
RETURNS TABLE (students_placed INT, avg_package_lpa NUMERIC, median_package_lpa NUMERIC,
               highest_package_lpa NUMERIC, lowest_package_lpa NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::int,
         ROUND(AVG(final_package_lpa), 2),
         ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY final_package_lpa))::numeric, 2),
         MAX(final_package_lpa),
         MIN(final_package_lpa)
    FROM placements WHERE placement_status <> 'CANCELLED';
$$;

-- Placements per month for the last N months, with a running total (window function).
-- generate_series supplies every month, so months with no placements still appear as zero.
CREATE OR REPLACE FUNCTION get_placement_trends(p_months INT DEFAULT 12)
RETURNS TABLE (month DATE, placements INT, avg_package_lpa NUMERIC, cumulative_placements INT)
LANGUAGE sql STABLE AS $$
  WITH months AS (
    SELECT generate_series(date_trunc('month', CURRENT_DATE) - make_interval(months => GREATEST(p_months, 1) - 1),
                           date_trunc('month', CURRENT_DATE), interval '1 month')::date AS month
  ), monthly AS (
    SELECT date_trunc('month', placement_date)::date AS month, COUNT(*)::int AS n, ROUND(AVG(final_package_lpa), 2) AS avg_pkg
      FROM placements WHERE placement_status <> 'CANCELLED' GROUP BY 1
  )
  SELECT m.month, COALESCE(mo.n, 0), mo.avg_pkg,
         (SUM(COALESCE(mo.n, 0)) OVER (ORDER BY m.month))::int
    FROM months m LEFT JOIN monthly mo ON mo.month = m.month
   ORDER BY m.month;
$$;
