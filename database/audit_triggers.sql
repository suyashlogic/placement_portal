-- =====================================================
-- Phase 10: database-level audit trail. Safe to re-run.
--
-- Two audit layers exist on purpose:
--   * APPLICATION audit (Phases 3-9): services write business events such as OFFER_CREATE.
--   * DATABASE audit (this file): triggers write the exact old/new VALUES of sensitive rows.
--     They fire for ANY writer: the app, pgAdmin, a script, a future service that forgot to audit.
--
-- Who did it: services call set_config('app.user_id', ...) inside their transaction (Phase 6).
-- If it is not set, the row is recorded with no user (for example a maintenance procedure).
-- =====================================================

-- Generic trigger function. Arguments: (1) primary-key column name, (2) optional column that holds the
-- owning user's id, used as the actor when no actor was declared (a student editing their own row).
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS TRIGGER AS $$
DECLARE
  v_pk      TEXT  := TG_ARGV[0];
  v_actor   INT   := NULLIF(current_setting('app.user_id', true), '')::INT;
  v_row     JSONB;
  v_changes JSONB;
BEGIN
  IF v_actor IS NULL AND TG_NARGS > 1 THEN
    v_actor := (to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END) ->> TG_ARGV[1])::INT;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Only the columns that really changed, as {"old": ..., "new": ...}. updated_at alone is noise.
    SELECT jsonb_object_agg(n.key,
             CASE WHEN n.key = 'password_hash' THEN jsonb_build_object('changed', true)   -- never store secrets
                  ELSE jsonb_build_object('old', o.value, 'new', n.value) END)
      INTO v_changes
      FROM jsonb_each(to_jsonb(NEW)) n
      JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
     WHERE n.value IS DISTINCT FROM o.value AND n.key <> 'updated_at';

    IF v_changes IS NULL THEN RETURN NEW; END IF;      -- nothing meaningful changed: no audit row
    v_row := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW);
    v_changes := v_row - 'password_hash';
  ELSE
    v_row := to_jsonb(OLD);
    v_changes := v_row - 'password_hash';
  END IF;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor, 'DB_' || TG_OP || '_' || upper(TG_TABLE_NAME), TG_TABLE_NAME,
          (v_row ->> v_pk)::INT, jsonb_build_object('changes', v_changes));

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- students: only the academic fields that decide eligibility (a CGPA edit can change who may apply)
DROP TRIGGER IF EXISTS trg_audit_students_update ON students;
CREATE TRIGGER trg_audit_students_update
  AFTER UPDATE ON students FOR EACH ROW
  WHEN (OLD.cgpa IS DISTINCT FROM NEW.cgpa OR OLD.department_id IS DISTINCT FROM NEW.department_id
     OR OLD.graduation_year IS DISTINCT FROM NEW.graduation_year OR OLD.roll_number IS DISTINCT FROM NEW.roll_number)
  EXECUTE FUNCTION audit_row_change('student_id', 'user_id');

DROP TRIGGER IF EXISTS trg_audit_students_delete ON students;
CREATE TRIGGER trg_audit_students_delete
  AFTER DELETE ON students FOR EACH ROW EXECUTE FUNCTION audit_row_change('student_id', 'user_id');

-- users: account creation, role / active / e-mail / password changes (password values are never stored)
DROP TRIGGER IF EXISTS trg_audit_users_insert ON users;
CREATE TRIGGER trg_audit_users_insert
  AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION audit_row_change('user_id');

DROP TRIGGER IF EXISTS trg_audit_users_update ON users;
CREATE TRIGGER trg_audit_users_update
  AFTER UPDATE ON users FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active
     OR OLD.email IS DISTINCT FROM NEW.email OR OLD.password_hash IS DISTINCT FROM NEW.password_hash)
  EXECUTE FUNCTION audit_row_change('user_id');

DROP TRIGGER IF EXISTS trg_audit_users_delete ON users;
CREATE TRIGGER trg_audit_users_delete
  AFTER DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_row_change('user_id');

-- placement drives and their eligibility rules
DROP TRIGGER IF EXISTS trg_audit_drives_insert ON placement_drives;
CREATE TRIGGER trg_audit_drives_insert
  AFTER INSERT ON placement_drives FOR EACH ROW EXECUTE FUNCTION audit_row_change('drive_id');

DROP TRIGGER IF EXISTS trg_audit_drives_update ON placement_drives;
CREATE TRIGGER trg_audit_drives_update
  AFTER UPDATE ON placement_drives FOR EACH ROW EXECUTE FUNCTION audit_row_change('drive_id');

DROP TRIGGER IF EXISTS trg_audit_drives_delete ON placement_drives;
CREATE TRIGGER trg_audit_drives_delete
  AFTER DELETE ON placement_drives FOR EACH ROW EXECUTE FUNCTION audit_row_change('drive_id');

DROP TRIGGER IF EXISTS trg_audit_eligibility_change ON drive_eligibility;
CREATE TRIGGER trg_audit_eligibility_change
  AFTER INSERT OR UPDATE OR DELETE ON drive_eligibility FOR EACH ROW EXECUTE FUNCTION audit_row_change('drive_id');

-- The audit trail itself must not be editable or deletable.
-- One exception: when a user account is deleted, PostgreSQL itself sets audit_logs.user_id to NULL
-- (ON DELETE SET NULL). That single-column change is allowed so history survives deleted users.
CREATE OR REPLACE FUNCTION protect_audit_logs() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NULL
     AND (to_jsonb(NEW) - 'user_id') = (to_jsonb(OLD) - 'user_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Audit records cannot be % ', CASE TG_OP WHEN 'UPDATE' THEN 'modified' ELSE 'deleted' END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_protect ON audit_logs;
CREATE TRIGGER trg_audit_logs_protect
  BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION protect_audit_logs();
