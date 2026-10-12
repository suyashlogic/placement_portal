-- =====================================================
-- Phase 8 triggers: offers and placements.
-- Run after triggers.sql and triggers_selection.sql. Safe to re-run.
--
-- Rules enforced here (not only in the app):
--   * an offer can only be made to a SELECTED application   -> application becomes OFFERED
--   * a student may hold ONE open offer at a time, and none once placed
--   * an offer decision is final (PENDING -> ACCEPTED / REJECTED / EXPIRED)
--   * REJECTED or EXPIRED offer                              -> application becomes REJECTED
--   * a placement needs an ACCEPTED offer on an OFFERED application -> application becomes PLACED
--   * ONE placement per student, across every drive
--
-- pg_advisory_xact_lock(7001, student_id) makes all offer/placement checks for one student
-- take turns. Without it, two simultaneous transactions could each check "no placement yet"
-- and both succeed. The lock is released automatically at COMMIT or ROLLBACK.
-- =====================================================

-- ---------- OFFERS ----------
CREATE OR REPLACE FUNCTION validate_offer_insert() RETURNS TRIGGER AS $$
DECLARE
  v_student_id INT;
  v_status     TEXT;
BEGIN
  SELECT student_id INTO v_student_id FROM applications WHERE application_id = NEW.application_id;
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  PERFORM pg_advisory_xact_lock(7001, v_student_id);   -- one offer/placement decision per student at a time

  -- Read AFTER the lock, so we see anything a competing transaction just committed
  SELECT application_status INTO v_status FROM applications WHERE application_id = NEW.application_id;
  IF v_status <> 'SELECTED' THEN
    RAISE EXCEPTION 'An offer can only be made to a selected candidate (this application is %)', v_status;
  END IF;

  IF NEW.status <> 'PENDING' THEN
    RAISE EXCEPTION 'A new offer must start as PENDING';
  END IF;

  IF EXISTS (SELECT 1 FROM placements pl
               JOIN offers o ON o.offer_id = pl.offer_id
               JOIN applications a ON a.application_id = o.application_id
              WHERE a.student_id = v_student_id AND pl.placement_status <> 'CANCELLED') THEN
    RAISE EXCEPTION 'This student has already been placed';
  END IF;

  IF EXISTS (SELECT 1 FROM offers o
               JOIN applications a ON a.application_id = o.application_id
              WHERE a.student_id = v_student_id AND o.status IN ('PENDING', 'ACCEPTED')) THEN
    RAISE EXCEPTION 'This student already holds an open offer';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_validate_insert ON offers;
CREATE TRIGGER trg_offers_validate_insert
  BEFORE INSERT ON offers
  FOR EACH ROW EXECUTE FUNCTION validate_offer_insert();

CREATE OR REPLACE FUNCTION advance_application_on_offer() RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('app.remarks', 'Offer created', true);
  UPDATE applications SET application_status = 'OFFERED' WHERE application_id = NEW.application_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_advance ON offers;
CREATE TRIGGER trg_offers_advance
  AFTER INSERT ON offers
  FOR EACH ROW EXECUTE FUNCTION advance_application_on_offer();

CREATE OR REPLACE FUNCTION validate_offer_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_id <> OLD.application_id THEN
    RAISE EXCEPTION 'An offer cannot be moved to another application';
  END IF;

  IF NEW.status <> OLD.status THEN
    IF OLD.status <> 'PENDING' THEN
      RAISE EXCEPTION 'This offer is already %, so it cannot change', lower(OLD.status);
    END IF;
  ELSIF OLD.status <> 'PENDING' AND (
        NEW.package_lpa  IS DISTINCT FROM OLD.package_lpa
     OR NEW.joining_date IS DISTINCT FROM OLD.joining_date
     OR NEW.offer_date   IS DISTINCT FROM OLD.offer_date) THEN
    RAISE EXCEPTION 'Only a pending offer can be edited';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_validate_update ON offers;
CREATE TRIGGER trg_offers_validate_update
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION validate_offer_update();

-- A declined or expired offer closes the application
CREATE OR REPLACE FUNCTION close_application_on_offer_end() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('REJECTED', 'EXPIRED') THEN
    PERFORM set_config('app.remarks',
      CASE NEW.status WHEN 'REJECTED' THEN 'Offer rejected' ELSE 'Offer expired' END, true);
    UPDATE applications SET application_status = 'REJECTED'
     WHERE application_id = NEW.application_id AND application_status = 'OFFERED';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_offers_close_application ON offers;
CREATE TRIGGER trg_offers_close_application
  AFTER UPDATE OF status ON offers
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION close_application_on_offer_end();

-- ---------- PLACEMENTS ----------
CREATE OR REPLACE FUNCTION validate_placement_insert() RETURNS TRIGGER AS $$
DECLARE
  v_student_id    INT;
  v_offer_status  TEXT;
  v_app_status    TEXT;
BEGIN
  SELECT a.student_id INTO v_student_id
    FROM offers o JOIN applications a ON a.application_id = o.application_id
   WHERE o.offer_id = NEW.offer_id;
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  PERFORM pg_advisory_xact_lock(7001, v_student_id);

  SELECT o.status, a.application_status INTO v_offer_status, v_app_status
    FROM offers o JOIN applications a ON a.application_id = o.application_id
   WHERE o.offer_id = NEW.offer_id;

  IF v_offer_status <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'A placement can only be recorded for an accepted offer (this offer is %)', lower(v_offer_status);
  END IF;
  IF v_app_status <> 'OFFERED' THEN
    RAISE EXCEPTION 'The application is not in the offered stage (it is %)', v_app_status;
  END IF;

  -- The rule that the Phase 2 normalisation moved out of the table design:
  -- one placement per student, whatever drive or company it came from.
  IF EXISTS (SELECT 1 FROM placements pl
               JOIN offers o ON o.offer_id = pl.offer_id
               JOIN applications a ON a.application_id = o.application_id
              WHERE a.student_id = v_student_id AND pl.placement_status <> 'CANCELLED') THEN
    RAISE EXCEPTION 'This student already has a placement';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_placements_validate_insert ON placements;
CREATE TRIGGER trg_placements_validate_insert
  BEFORE INSERT ON placements
  FOR EACH ROW EXECUTE FUNCTION validate_placement_insert();

CREATE OR REPLACE FUNCTION advance_application_on_placement() RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('app.remarks', 'Placement confirmed', true);
  UPDATE applications SET application_status = 'PLACED'
   WHERE application_id = (SELECT application_id FROM offers WHERE offer_id = NEW.offer_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_placements_advance ON placements;
CREATE TRIGGER trg_placements_advance
  AFTER INSERT ON placements
  FOR EACH ROW EXECUTE FUNCTION advance_application_on_placement();

CREATE OR REPLACE FUNCTION validate_placement_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.offer_id <> OLD.offer_id THEN
    RAISE EXCEPTION 'A placement cannot be moved to another offer';
  END IF;
  IF NEW.placement_status <> OLD.placement_status
     AND NOT (OLD.placement_status = 'CONFIRMED' AND NEW.placement_status = 'JOINED') THEN
    RAISE EXCEPTION 'Invalid placement status change: % cannot become %',
      OLD.placement_status, NEW.placement_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_placements_validate_update ON placements;
CREATE TRIGGER trg_placements_validate_update
  BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION validate_placement_update();
