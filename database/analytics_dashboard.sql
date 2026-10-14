-- =====================================================
-- Phase 11: three more reporting functions for the dashboards. Safe to re-run.
-- Run after analytics.sql (Phase 10).
-- =====================================================

-- How many applications ever reached each stage? One row, for the whole portal or for one drive.
-- Read from the status HISTORY, so a student who was shortlisted and later selected still counts as shortlisted.
CREATE OR REPLACE FUNCTION get_application_funnel(p_drive_id INT DEFAULT NULL)
RETURNS TABLE (applied INT, shortlisted INT, interviewed INT, selected INT, offered INT, placed INT)
LANGUAGE sql STABLE AS $$
  SELECT COUNT(DISTINCT h.application_id)::int,
         (COUNT(DISTINCT h.application_id) FILTER (WHERE h.new_status = 'SHORTLISTED'))::int,
         (COUNT(DISTINCT h.application_id) FILTER (WHERE h.new_status = 'INTERVIEW'))::int,
         (COUNT(DISTINCT h.application_id) FILTER (WHERE h.new_status = 'SELECTED'))::int,
         (COUNT(DISTINCT h.application_id) FILTER (WHERE h.new_status = 'OFFERED'))::int,
         (COUNT(DISTINCT h.application_id) FILTER (WHERE h.new_status = 'PLACED'))::int
    FROM application_status_history h
    JOIN applications a ON a.application_id = h.application_id
   WHERE p_drive_id IS NULL OR a.drive_id = p_drive_id;
$$;

-- Histogram of final packages in buckets of p_bucket_lpa (default 3 LPA). generate_series makes
-- sure empty buckets between the lowest and highest package still appear, with a count of zero.
CREATE OR REPLACE FUNCTION get_package_distribution(p_bucket_lpa INT DEFAULT 3)
RETURNS TABLE (range_start INT, range_end INT, students INT)
LANGUAGE sql STABLE AS $$
  WITH width AS (SELECT GREATEST(COALESCE(p_bucket_lpa, 3), 1) AS w),
  bounds AS (
    SELECT FLOOR(MIN(pl.final_package_lpa) / w.w)::int AS lo, FLOOR(MAX(pl.final_package_lpa) / w.w)::int AS hi
      FROM placements pl, width w WHERE pl.placement_status <> 'CANCELLED' GROUP BY w.w
  ), buckets AS (
    SELECT g * w.w AS start_lpa FROM bounds b, width w, generate_series(b.lo, b.hi) AS g
  )
  SELECT b.start_lpa, b.start_lpa + w.w, COUNT(pl.placement_id)::int
    FROM buckets b
    CROSS JOIN width w
    LEFT JOIN placements pl ON pl.placement_status <> 'CANCELLED'
                           AND pl.final_package_lpa >= b.start_lpa
                           AND pl.final_package_lpa <  b.start_lpa + w.w
   GROUP BY b.start_lpa, w.w
   ORDER BY b.start_lpa;
$$;

-- Applications per status, in lifecycle order, zeros included. For one student or for everybody.
CREATE OR REPLACE FUNCTION get_application_status_breakdown(p_student_id INT DEFAULT NULL)
RETURNS TABLE (status TEXT, applications INT)
LANGUAGE sql STABLE AS $$
  SELECT s.status, COUNT(a.application_id)::int
    FROM unnest(ARRAY['APPLIED','UNDER_REVIEW','SHORTLISTED','INTERVIEW','SELECTED','OFFERED','PLACED','REJECTED','WITHDRAWN'])
           WITH ORDINALITY AS s(status, ord)
    LEFT JOIN applications a ON a.application_status = s.status
                            AND (p_student_id IS NULL OR a.student_id = p_student_id)
   GROUP BY s.status, s.ord
   ORDER BY s.ord;
$$;
