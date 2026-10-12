-- =====================================================
-- Phase 10: SQL QUERY CATALOGUE
-- Every query answers a real question from the project specification and is labelled with the SQL
-- concept it demonstrates. Run them one at a time in pgAdmin (select a query, press F5).
-- All of them are read-only. Literal values such as 1, 'CSE' or 'Rahul' are examples: change them.
-- =====================================================


-- ---------------------------------------------------------------------------
-- A. THE QUERIES FROM THE SPECIFICATION
-- ---------------------------------------------------------------------------

-- A1. STUDENT SEARCH  [JOIN, ILIKE, parameter-style filters]
SELECT s.student_id, u.full_name, s.roll_number, d.department_code, s.cgpa, s.graduation_year
  FROM students s
  JOIN users u       ON u.user_id = s.user_id
  JOIN departments d ON d.department_id = s.department_id
 WHERE (u.full_name ILIKE '%student 1%' OR s.roll_number ILIKE '%R10%')
   AND d.department_code = 'CSE'
   AND s.cgpa >= 7
 ORDER BY s.cgpa DESC
 LIMIT 20;

-- A2. ELIGIBLE STUDENTS FOR A DRIVE  [view over a PL/pgSQL function, LATERAL join]
SELECT student_name, roll_number, department_code, cgpa
  FROM eligible_students_view
 WHERE drive_id = 1
 ORDER BY cgpa DESC
 LIMIT 20;

-- A3. APPLICATIONS PER DRIVE BY STATUS  [GROUP BY, conditional aggregation with FILTER]
SELECT p.drive_title,
       COUNT(*)                                                AS applications,
       COUNT(*) FILTER (WHERE a.application_status = 'APPLIED')     AS applied,
       COUNT(*) FILTER (WHERE a.application_status = 'SHORTLISTED') AS shortlisted,
       COUNT(*) FILTER (WHERE a.application_status = 'REJECTED')    AS rejected,
       COUNT(*) FILTER (WHERE a.application_status IN ('SELECTED','OFFERED','PLACED')) AS selected_or_beyond
  FROM applications a
  JOIN placement_drives p ON p.drive_id = a.drive_id
 GROUP BY p.drive_id, p.drive_title
 ORDER BY applications DESC
 LIMIT 10;

-- A4. SHORTLISTED STUDENTS OF A DRIVE  [multi-table JOIN through a view]
SELECT student_name, roll_number, department_code, cgpa, application_status
  FROM student_application_view
 WHERE drive_id = 8 AND application_status = 'SHORTLISTED'
 ORDER BY cgpa DESC
 LIMIT 20;

-- A5. COMPANY HIRING  [view with LEFT JOINs and DISTINCT counts]
SELECT company_name, jobs, drives, applications, offers, students_hired, avg_package_lpa, highest_package_lpa
  FROM company_hiring_view
 ORDER BY students_hired DESC;

-- A6. PLACEMENT STATISTICS  [one-row function, CTEs inside]
SELECT * FROM get_overview_statistics();

-- A7. DEPARTMENT PLACEMENT RATE  [function with an optional parameter]
SELECT * FROM calculate_department_placement_rate();           -- all classes
SELECT * FROM calculate_department_placement_rate(2027);       -- one graduating class

-- A8. AVERAGE, MEDIAN, HIGHEST AND LOWEST PACKAGE  [aggregates, percentile_cont]
SELECT * FROM get_package_statistics();

-- A9. WHO GOT THE HIGHEST PACKAGE  [scalar subquery]
SELECT sv.student_name, sv.roll_number, sv.company_name, sv.job_title, sv.final_package_lpa
  FROM placement_summary_view sv
 WHERE sv.final_package_lpa = (SELECT MAX(final_package_lpa) FROM placements WHERE placement_status <> 'CANCELLED')
   AND sv.placement_status <> 'CANCELLED';

-- A10. DRIVE-WISE SELECTION RATIO  [history-based funnel with bool_or]
SELECT drive_title, company_name, applications, shortlisted, selected, offered, selection_ratio
  FROM calculate_drive_selection_ratio()
 WHERE applications > 0
 ORDER BY selection_ratio DESC NULLS LAST
 LIMIT 10;

-- A11. ONE STUDENT'S APPLICATION STATISTICS  [PL/pgSQL function with input validation]
--      (By design it raises "Student N does not exist" when N is not a student id. Use an id from your students table.)
SELECT * FROM get_student_application_statistics(1);

-- A12. PLACEMENT TRENDS  [generate_series + window function: running total]
SELECT * FROM get_placement_trends(12);


-- ---------------------------------------------------------------------------
-- B. ADVANCED SQL (what faculty look for)
-- ---------------------------------------------------------------------------

-- B1. NOT EXISTS: students who never applied anywhere  [anti-join]
SELECT s.student_id, s.roll_number
  FROM students s
 WHERE NOT EXISTS (SELECT 1 FROM applications a WHERE a.student_id = s.student_id)
 LIMIT 10;

-- B2. CORRELATED SUBQUERY: students whose CGPA beats their own department's average
SELECT s.roll_number, s.cgpa, d.department_code
  FROM students s
  JOIN departments d ON d.department_id = s.department_id
 WHERE s.cgpa > (SELECT AVG(s2.cgpa) FROM students s2 WHERE s2.department_id = s.department_id)
 ORDER BY s.cgpa DESC
 LIMIT 10;

-- B3. WINDOW FUNCTION RANK(): top 3 CGPAs inside every department
SELECT *
  FROM (SELECT d.department_code, s.roll_number, s.cgpa,
               RANK() OVER (PARTITION BY d.department_id ORDER BY s.cgpa DESC) AS rank_in_dept
          FROM students s JOIN departments d ON d.department_id = s.department_id) ranked
 WHERE rank_in_dept <= 3
 ORDER BY department_code, rank_in_dept, roll_number;

-- B4. CTE + ROW_NUMBER(): the best-paid placement in each department
WITH placed AS (
  SELECT sv.department_code, sv.student_name, sv.company_name, sv.final_package_lpa,
         ROW_NUMBER() OVER (PARTITION BY sv.department_code ORDER BY sv.final_package_lpa DESC) AS rn
    FROM placement_summary_view sv
   WHERE sv.placement_status <> 'CANCELLED'
)
SELECT department_code, student_name, company_name, final_package_lpa FROM placed WHERE rn = 1 ORDER BY department_code;

-- B5. GROUP BY ROLLUP: placements by department and company with subtotals and a grand total
SELECT COALESCE(department_code, 'ALL DEPARTMENTS') AS department,
       COALESCE(company_name, 'ALL COMPANIES')      AS company,
       COUNT(*) AS placements, ROUND(AVG(final_package_lpa), 2) AS avg_package
  FROM placement_summary_view
 WHERE placement_status <> 'CANCELLED' AND company_name IN ('Company 8', 'Company 5')
 GROUP BY ROLLUP (department_code, company_name)
 ORDER BY department_code NULLS LAST, company_name NULLS LAST;

-- B6. SET OPERATION EXCEPT: students shortlisted at least once but never selected anywhere
SELECT DISTINCT a.student_id FROM applications a
  JOIN application_status_history h ON h.application_id = a.application_id AND h.new_status = 'SHORTLISTED'
EXCEPT
SELECT DISTINCT a.student_id FROM applications a
  JOIN application_status_history h ON h.application_id = a.application_id AND h.new_status = 'SELECTED'
LIMIT 10;

-- B7. APPLICATION FUNNEL FROM HISTORY  [every stage ever reached, one pass over the history]
SELECT COUNT(DISTINCT application_id)                                      AS applied,
       COUNT(DISTINCT application_id) FILTER (WHERE new_status = 'SHORTLISTED') AS shortlisted,
       COUNT(DISTINCT application_id) FILTER (WHERE new_status = 'INTERVIEW')   AS interviewed,
       COUNT(DISTINCT application_id) FILTER (WHERE new_status = 'SELECTED')    AS selected,
       COUNT(DISTINCT application_id) FILTER (WHERE new_status = 'OFFERED')     AS offered,
       COUNT(DISTINCT application_id) FILTER (WHERE new_status = 'PLACED')      AS placed
  FROM application_status_history;

-- B8. HOW LONG DOES EACH STAGE TAKE?  [LEAD window function over history, interval arithmetic]
SELECT new_status AS stage,
       COUNT(*)                                                      AS transitions,
       ROUND(AVG(EXTRACT(EPOCH FROM (next_at - changed_at)) / 86400)::numeric, 1) AS avg_days_in_stage
  FROM (SELECT new_status, changed_at,
               LEAD(changed_at) OVER (PARTITION BY application_id ORDER BY history_id) AS next_at
          FROM application_status_history) t
 WHERE next_at IS NOT NULL
 GROUP BY new_status
 ORDER BY avg_days_in_stage DESC;

-- B9. HAVING: companies that made at least 100 offers but hired under 60 students
SELECT company_name, offers, students_hired
  FROM company_hiring_view
 WHERE offers >= 100 AND students_hired < 60;

-- B10. JSONB QUERY over the audit trail: every CGPA change with its old and new value
SELECT created_at, entity_id AS student_id,
       metadata -> 'changes' -> 'cgpa' ->> 'old' AS old_cgpa,
       metadata -> 'changes' -> 'cgpa' ->> 'new' AS new_cgpa
  FROM audit_logs
 WHERE action = 'DB_UPDATE_STUDENTS' AND metadata -> 'changes' ? 'cgpa'
 ORDER BY created_at DESC
 LIMIT 10;

-- B11. WHO IS BLOCKING WHOM RIGHT NOW  [system catalogue: pg_locks / pg_stat_activity]
SELECT blocked.pid  AS blocked_pid,  LEFT(blocked.query, 60)  AS blocked_query,
       blocking.pid AS blocking_pid, LEFT(blocking.query, 60) AS blocking_query
  FROM pg_stat_activity blocked
  JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS b(pid) ON TRUE
  JOIN pg_stat_activity blocking ON blocking.pid = b.pid;

-- B12. CATALOGUE OF THE DATABASE'S OWN LOGIC: every trigger and which table it guards
SELECT c.relname AS table_name, t.tgname AS trigger_name,
       CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
       concat_ws('/', CASE WHEN t.tgtype & 4  = 4  THEN 'INSERT' END,
                      CASE WHEN t.tgtype & 8  = 8  THEN 'DELETE' END,
                      CASE WHEN t.tgtype & 16 = 16 THEN 'UPDATE' END) AS fires_on,
       p.proname AS function_name
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc p  ON p.oid = t.tgfoid
 WHERE NOT t.tgisinternal
 ORDER BY c.relname, t.tgname;
