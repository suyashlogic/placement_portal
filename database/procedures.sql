-- =====================================================
-- Phase 10: stored PROCEDURES (CALL ...). Safe to re-run.
-- A procedure differs from a function in one important way: it may COMMIT inside itself.
-- Call them at top level (not inside BEGIN ... COMMIT) from pgAdmin or the server.
-- =====================================================

-- Close every OPEN drive whose registration deadline has passed. One UPDATE, so one implicit transaction.
-- (The status trigger and the audit trigger both fire for each drive.)
CREATE OR REPLACE PROCEDURE close_expired_drives(INOUT p_closed INT DEFAULT 0)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE placement_drives SET status = 'CLOSED'
   WHERE status = 'OPEN' AND registration_deadline < NOW();
  GET DIAGNOSTICS p_closed = ROW_COUNT;
END;
$$;

-- Expire PENDING offers older than p_days. This commits after EACH offer, so a failure on one offer
-- cannot undo the ones already expired, and locks are never held for long. For each offer:
--   offer -> EXPIRED  ->  trigger closes the application  ->  history + audit rows  ->  student notification
CREATE OR REPLACE PROCEDURE expire_stale_offers(p_days INT, INOUT p_expired INT DEFAULT 0)
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'p_days must be at least 1';
  END IF;

  FOR r IN
    SELECT o.offer_id, s.user_id AS student_user_id, c.company_name
      FROM offers o
      JOIN applications a     ON a.application_id = o.application_id
      JOIN students s         ON s.student_id = a.student_id
      JOIN placement_drives p ON p.drive_id = a.drive_id
      JOIN jobs j             ON j.job_id = p.job_id
      JOIN companies c        ON c.company_id = j.company_id
     WHERE o.status = 'PENDING' AND o.created_at < NOW() - make_interval(days => p_days)
     ORDER BY o.offer_id
  LOOP
    -- transaction-local settings are cleared by every COMMIT, so set them inside the loop
    PERFORM set_config('app.remarks', format('Offer expired automatically after %s days', p_days), true);
    UPDATE offers SET status = 'EXPIRED' WHERE offer_id = r.offer_id AND status = 'PENDING';

    IF FOUND THEN
      INSERT INTO notifications (user_id, title, message)
      VALUES (r.student_user_id, 'Offer expired',
              format('Your offer from %s expired because it was not answered within %s days.', r.company_name, p_days));
      p_expired := p_expired + 1;
    END IF;
    COMMIT;
  END LOOP;
END;
$$;
