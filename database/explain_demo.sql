-- =====================================================
-- Phase 10: PROVING THE INDEXES WITH EXPLAIN ANALYZE
--
-- Everything happens in a throw-away schema called perf_demo, so your real tables are never touched.
-- Run the numbered STEPS one at a time (select a step, press F5). pgAdmin shows only the LAST result
-- of a script, which is why each step is a single statement or a small block.
-- Numbers will differ on your computer; the SHAPE of each plan (Seq Scan vs Index Scan) is the lesson.
--
-- How to read a plan:  Seq Scan = read the whole table.  Index Scan / Bitmap Heap Scan = jump via an
-- index.  "actual time" and "Execution Time" are real milliseconds.  "Buffers: shared hit/read" = pages touched.
-- =====================================================

-- ---------- STEP 0: build 100,000 students and 300,000 applications (takes a few seconds) ----------
DROP SCHEMA IF EXISTS perf_demo CASCADE;
CREATE SCHEMA perf_demo;

CREATE TABLE perf_demo.students AS
SELECT g AS student_id, 1 + g % 5 AS department_id, round((5 + random() * 5)::numeric, 2) AS cgpa,
       2026 + g % 2 AS graduation_year
  FROM generate_series(1, 100000) g;

-- status is deliberately lopsided: 85% REJECTED, 0.5% PLACED (a placement season rejects most applicants).
-- drive_id is built so that no student has the same drive twice (step 5 needs that for a UNIQUE index).
CREATE TABLE perf_demo.applications AS
SELECT g AS application_id, 1 + g % 100000 AS student_id,
       1 + (g % 400 + 131 * (g / 100000)) % 400 AS drive_id,
       CASE WHEN r < 0.85 THEN 'REJECTED' WHEN r < 0.95 THEN 'APPLIED' WHEN r < 0.995 THEN 'SHORTLISTED' ELSE 'PLACED' END AS status
  FROM (SELECT g, random() AS r FROM generate_series(1, 300000) g) x;

ANALYZE perf_demo.students;
ANALYZE perf_demo.applications;


-- ---------- STEP 1: "all applications of one drive" WITHOUT an index ----------
-- Expect: Seq Scan (it reads all 300,000 rows to find about 750).
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT application_id, student_id FROM perf_demo.applications WHERE drive_id = 123;

-- ---------- STEP 2: create the index we use in the real schema (idx_applications_drive), run it again ----------
CREATE INDEX idx_demo_applications_drive ON perf_demo.applications (drive_id);
ANALYZE perf_demo.applications;

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT application_id, student_id FROM perf_demo.applications WHERE drive_id = 123;
-- Expect: Bitmap Index Scan + Bitmap Heap Scan, far fewer buffers and a much smaller Execution Time.


-- ---------- STEP 3: an index is NOT always used. Selectivity decides. ----------
CREATE INDEX idx_demo_applications_status ON perf_demo.applications (status);
ANALYZE perf_demo.applications;

-- 3a. A RARE value (0.5% of rows): the planner uses the index.
EXPLAIN (ANALYZE, COSTS OFF)
SELECT application_id FROM perf_demo.applications WHERE status = 'PLACED';

-- 3b. A COMMON value (85% of rows): the planner IGNORES the index and scans the table, correctly,
-- because fetching most of the table through an index is slower than reading it in order.
EXPLAIN (ANALYZE, COSTS OFF)
SELECT application_id FROM perf_demo.applications WHERE status = 'REJECTED';
-- Lesson: idx_applications_status exists for rare-status queries (offers, placements), not for "REJECTED".


-- ---------- STEP 4: composite index column ORDER matters ----------
CREATE INDEX idx_demo_students_eligibility ON perf_demo.students (graduation_year, cgpa);
ANALYZE perf_demo.students;

-- 4a. Filters on the LEADING column and the second one: uses both parts of the index.
EXPLAIN (ANALYZE, COSTS OFF)
SELECT student_id FROM perf_demo.students WHERE graduation_year = 2027 AND cgpa >= 9.9;

-- 4b. Filters only on the SECOND column: the index cannot narrow the search the same way
-- (PostgreSQL 18 adds "skip scan"; on 16 and 17 expect a Seq Scan).
EXPLAIN (ANALYZE, COSTS OFF)
SELECT student_id FROM perf_demo.students WHERE cgpa >= 9.9;
-- Lesson: this is why the real index is (graduation_year, cgpa), matching the eligibility query.


-- ---------- STEP 5: the duplicate-application check used by every "Apply" click ----------
CREATE UNIQUE INDEX idx_demo_one_application ON perf_demo.applications (student_id, drive_id);
ANALYZE perf_demo.applications;

EXPLAIN (ANALYZE, COSTS OFF)
SELECT 1 FROM perf_demo.applications WHERE student_id = 777 AND drive_id = 378;
-- Expect: Index Only Scan or Index Scan, a fraction of a millisecond. The same index is what the
-- UNIQUE constraint uses to refuse a duplicate, so the safety rule and the speed-up are one object.


-- ---------- STEP 6: a PARTIAL index is smaller and faster for "pending" style queries ----------
CREATE TABLE perf_demo.offers AS
SELECT g AS offer_id,
       CASE WHEN g % 50 = 0 THEN 'PENDING' ELSE 'ACCEPTED' END AS status,      -- 2% pending
       now() - (g % 90 || ' days')::interval AS created_at
  FROM generate_series(1, 200000) g;
CREATE INDEX idx_demo_offers_full    ON perf_demo.offers (created_at);
CREATE INDEX idx_demo_offers_partial ON perf_demo.offers (created_at) WHERE status = 'PENDING';
ANALYZE perf_demo.offers;

SELECT 'full index'    AS index, pg_size_pretty(pg_relation_size('perf_demo.idx_demo_offers_full'))    AS size
UNION ALL
SELECT 'partial index',          pg_size_pretty(pg_relation_size('perf_demo.idx_demo_offers_partial'));

EXPLAIN (ANALYZE, COSTS OFF)
SELECT offer_id FROM perf_demo.offers WHERE status = 'PENDING' AND created_at < now() - interval '14 days';
-- Expect: the partial index is used and is about 2% of the size of the full one. We did NOT add this to
-- the real schema: the real offers table is small, and unnecessary indexes only slow down writes (step 7).


-- ---------- STEP 7: every index has a cost: it must be maintained on every INSERT ----------
CREATE TABLE perf_demo.t_plain  (id INT, a INT, b INT, c INT, d INT);
CREATE TABLE perf_demo.t_indexed(id INT, a INT, b INT, c INT, d INT);
CREATE INDEX ON perf_demo.t_indexed (a);
CREATE INDEX ON perf_demo.t_indexed (b);
CREATE INDEX ON perf_demo.t_indexed (c);
CREATE INDEX ON perf_demo.t_indexed (d);

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
INSERT INTO perf_demo.t_plain   SELECT g, g, g % 100, g % 1000, random()*1000000 FROM generate_series(1, 200000) g;

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
INSERT INTO perf_demo.t_indexed SELECT g, g, g % 100, g % 1000, random()*1000000 FROM generate_series(1, 200000) g;
-- Compare the two "Execution Time" lines. Four indexes make the same insert several times slower.
-- That is why the project indexes only columns that real queries filter, join or sort on.


-- ---------- CLEAN UP (removes the whole scratch schema) ----------
DROP SCHEMA perf_demo CASCADE;
