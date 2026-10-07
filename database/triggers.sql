-- =====================================================
-- Phase 6 triggers: the database enforces application rules itself.
-- Run AFTER schema.sql (schema.sql drops tables, which drops their triggers).
-- Safe to re-run.
-- =====================================================

-- 1. INSERT guard: no application may exist for a closed drive or an ineligible student,
--    no matter which program or SQL console inserted it (defence in depth).
CREATE OR REPLACE FUNCTION validate_application_insert() RETURNS TRIGGER AS $$
DECLARE
  v_drive placement_drives%ROWTYPE;
  v_elig  RECORD;
BEGIN
  SELECT * INTO v_drive FROM placement_drives WHERE drive_id = NEW.drive_id;

  IF v_drive.status IS DISTINCT FROM 'OPEN'
     OR NOW() < v_drive.registration_open_date
     OR NOW() > v_drive.registration_deadline THEN
    RAISE EXCEPTION 'Registration is closed for this drive';
  END IF;

  SELECT * INTO v_elig FROM check_student_eligibility(NEW.student_id, NEW.drive_id);
  IF NOT v_elig.is_eligible THEN
    RAISE EXCEPTION '%', v_elig.reason;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_validate_insert ON applications;
CREATE TRIGGER trg_applications_validate_insert
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION validate_application_insert();

-- 2. UPDATE guard: only legal status transitions (the lifecycle state machine).
CREATE OR REPLACE FUNCTION validate_application_status_change() RETURNS TRIGGER AS $$
DECLARE
  v_allowed TEXT[];
BEGIN
  IF NEW.student_id <> OLD.student_id OR NEW.drive_id <> OLD.drive_id THEN
    RAISE EXCEPTION 'An application cannot be moved to another student or drive';
  END IF;

  IF NEW.application_status = OLD.application_status THEN
    RETURN NEW;
  END IF;

  v_allowed := CASE OLD.application_status
    WHEN 'APPLIED'      THEN ARRAY['UNDER_REVIEW', 'REJECTED', 'WITHDRAWN']
    WHEN 'UNDER_REVIEW' THEN ARRAY['SHORTLISTED', 'REJECTED', 'WITHDRAWN']
    WHEN 'SHORTLISTED'  THEN ARRAY['INTERVIEW', 'REJECTED', 'WITHDRAWN']
    WHEN 'INTERVIEW'    THEN ARRAY['SELECTED', 'REJECTED']
    WHEN 'SELECTED'     THEN ARRAY['OFFERED', 'REJECTED']
    WHEN 'OFFERED'      THEN ARRAY['PLACED', 'REJECTED']
    ELSE ARRAY[]::TEXT[]            -- PLACED, REJECTED, WITHDRAWN are final
  END;

  IF NOT (NEW.application_status = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status change: % cannot become %',
      OLD.application_status, NEW.application_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_validate_status ON applications;
CREATE TRIGGER trg_applications_validate_status
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION validate_application_status_change();

-- 3. History: every new application and every status change is recorded automatically.
--    The app tells the trigger WHO made the change through transaction-local settings:
--      SELECT set_config('app.user_id', '5', true);   -- "true" = until COMMIT/ROLLBACK
CREATE OR REPLACE FUNCTION log_application_status() RETURNS TRIGGER AS $$
DECLARE
  v_user    INT  := NULLIF(current_setting('app.user_id', true), '')::INT;
  v_remarks TEXT := NULLIF(current_setting('app.remarks', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, remarks)
    VALUES (NEW.application_id, NULL, NEW.application_status, v_user,
            COALESCE(v_remarks, 'Application submitted'));
  ELSIF NEW.application_status <> OLD.application_status THEN
    INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, remarks)
    VALUES (NEW.application_id, OLD.application_status, NEW.application_status, v_user, v_remarks);
  END IF;
  RETURN NULL;   -- AFTER trigger: return value is ignored
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_history ON applications;
CREATE TRIGGER trg_applications_history
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status();
