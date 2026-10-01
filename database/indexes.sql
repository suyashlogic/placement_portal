-- =====================================================
-- Indexes. PK and UNIQUE columns are already indexed automatically:
--   users(lower(email)), students(user_id, roll_number), companies(company_name),
--   applications(student_id, drive_id), selection_process(application_id, round_number),
--   offers(application_id), placements(offer_id)
-- =====================================================

-- Students: filter by department; "eligible students" filters year + CGPA together
CREATE INDEX idx_students_department  ON students (department_id);
CREATE INDEX idx_students_eligibility ON students (graduation_year, cgpa);

-- Jobs belong to a company (FK; used by company pages and hiring reports)
CREATE INDEX idx_jobs_company ON jobs (company_id);

-- Junction tables: the PK covers lookups by student/job. These cover the reverse
-- direction ("which students have skill X?").
CREATE INDEX idx_student_skills_skill ON student_skills (skill_id);
CREATE INDEX idx_job_skills_skill     ON job_skills (skill_id);

-- Drives: join to job; list "open drives whose deadline has not passed"
CREATE INDEX idx_drives_job             ON placement_drives (job_id);
CREATE INDEX idx_drives_status_deadline ON placement_drives (status, registration_deadline);
CREATE INDEX idx_drive_depts_department ON drive_eligible_departments (department_id);

-- Applications: student_id is already covered by the UNIQUE (student_id, drive_id)
-- index because student_id is its FIRST column. Drive and status need their own.
CREATE INDEX idx_applications_drive  ON applications (drive_id);
CREATE INDEX idx_applications_status ON applications (application_status);

CREATE INDEX idx_status_history_application
  ON application_status_history (application_id, changed_at);

CREATE INDEX idx_offers_status ON offers (status);

-- "Show my unread notifications, newest first"
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);

-- Audit log: newest first, filter by entity, filter by user
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_entity  ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_user    ON audit_logs (user_id);