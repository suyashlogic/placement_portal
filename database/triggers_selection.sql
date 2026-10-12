-- =====================================================
-- Phase 7 triggers: selection rounds drive the application status.
-- Run after triggers.sql (Phase 6). Safe to re-run.
--
--   round added             -> SHORTLISTED application becomes INTERVIEW
--   result FAILED / ABSENT  -> application becomes REJECTED
--   result PASSED           -> stays INTERVIEW (the app marks it SELECTED if it was the final round)
-- =====================================================

-- 1. Validate a new round BEFORE it is inserted
CREATE OR REPLACE FUNCTION validate_selection_insert() RETURNS TRIGGER AS $$
DECLARE
  v_status      TEXT;
  v_max         INT;
  v_prev_result TEXT;
BEGIN
  SELECT application_status INTO v_status FROM applications WHERE application_id = NEW.application_id;

  IF v_status NOT IN ('SHORTLISTED', 'INTERVIEW') THEN
    RAISE EXCEPTION 'Rounds can only be added for shortlisted candidates (this application is %)', v_status;
  END IF;

  IF NEW.result <> 'PENDING' THEN
    RAISE EXCEPTION 'A new round must start as PENDING';
  END IF;

  SELECT COALESCE(MAX(round_number), 0) INTO v_max
    FROM selection_process WHERE application_id = NEW.application_id;

  IF NEW.round_number <> v_max + 1 THEN
    RAISE EXCEPTION 'Rounds must be numbered in order (the next round is %)', v_max + 1;
  END IF;

  IF v_max > 0 THEN
    SELECT result INTO v_prev_result
      FROM selection_process WHERE application_id = NEW.application_id AND round_number = v_max;
    IF v_prev_result <> 'PASSED' THEN
      RAISE EXCEPTION 'Round % must be passed before round % can be added', v_max, NEW.round_number;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_selection_validate_insert ON selection_process;
CREATE TRIGGER trg_selection_validate_insert
  BEFORE INSERT ON selection_process
  FOR EACH ROW EXECUTE FUNCTION validate_selection_insert();

-- 2. After a round exists, move a SHORTLISTED application into the INTERVIEW stage
CREATE OR REPLACE FUNCTION advance_application_on_round() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT application_status FROM applications WHERE application_id = NEW.application_id) = 'SHORTLISTED' THEN
    -- the history trigger reads this setting, so the history row explains why
    PERFORM set_config('app.remarks', format('Round %s scheduled: %s', NEW.round_number, NEW.round_name), true);
    UPDATE applications SET application_status = 'INTERVIEW' WHERE application_id = NEW.application_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_selection_advance ON selection_process;
CREATE TRIGGER trg_selection_advance
  AFTER INSERT ON selection_process
  FOR EACH ROW EXECUTE FUNCTION advance_application_on_round();

-- 3. Protect recorded results
CREATE OR REPLACE FUNCTION validate_selection_update() RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NEW.application_id <> OLD.application_id OR NEW.round_number <> OLD.round_number THEN
    RAISE EXCEPTION 'A round cannot be moved to another application or renumbered';
  END IF;

  IF NEW.result IS DISTINCT FROM OLD.result THEN
    IF OLD.result <> 'PENDING' THEN
      RAISE EXCEPTION 'A recorded result cannot be changed';
    END IF;
    SELECT application_status INTO v_status FROM applications WHERE application_id = NEW.application_id;
    IF v_status <> 'INTERVIEW' THEN
      RAISE EXCEPTION 'Results can only be recorded while the application is in the interview stage (it is %)', v_status;
    END IF;
  ELSIF OLD.result <> 'PENDING' AND (
        NEW.round_name   IS DISTINCT FROM OLD.round_name
     OR NEW.round_type   IS DISTINCT FROM OLD.round_type
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.location     IS DISTINCT FROM OLD.location) THEN
    RAISE EXCEPTION 'A completed round cannot be edited';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_selection_validate_update ON selection_process;
CREATE TRIGGER trg_selection_validate_update
  BEFORE UPDATE ON selection_process
  FOR EACH ROW EXECUTE FUNCTION validate_selection_update();

-- 4. A failed or missed round rejects the application
CREATE OR REPLACE FUNCTION reject_application_on_failed_round() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result IN ('FAILED', 'ABSENT') THEN
    PERFORM set_config('app.remarks',
      format('Round %s (%s): %s', NEW.round_number, NEW.round_name, NEW.result), true);
    UPDATE applications SET application_status = 'REJECTED' WHERE application_id = NEW.application_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_selection_reject ON selection_process;
CREATE TRIGGER trg_selection_reject
  AFTER UPDATE OF result ON selection_process
  FOR EACH ROW WHEN (OLD.result IS DISTINCT FROM NEW.result)
  EXECUTE FUNCTION reject_application_on_failed_round();
