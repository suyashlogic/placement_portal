CREATE OR REPLACE FUNCTION check_student_eligibility(p_student_id INT, p_drive_id INT)
RETURNS TABLE (is_eligible BOOLEAN, reason TEXT) AS $$
DECLARE
  v_student students%ROWTYPE;
  v_rule    drive_eligibility%ROWTYPE;
  v_job_id  INT;
  v_depts   TEXT;
  v_missing TEXT;
BEGIN
  SELECT * INTO v_student FROM students WHERE student_id = p_student_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student not found'::TEXT; RETURN;
  END IF;

  SELECT job_id INTO v_job_id FROM placement_drives WHERE drive_id = p_drive_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Drive not found'::TEXT; RETURN;
  END IF;

  -- 1. CGPA and graduation year
  SELECT * INTO v_rule FROM drive_eligibility WHERE drive_id = p_drive_id;
  IF FOUND THEN
    IF v_student.cgpa < v_rule.min_cgpa THEN
      RETURN QUERY SELECT FALSE,
        format('Minimum CGPA %s required (yours is %s)', v_rule.min_cgpa, v_student.cgpa);
      RETURN;
    END IF;
    IF v_rule.graduation_year IS NOT NULL AND v_student.graduation_year <> v_rule.graduation_year THEN
      RETURN QUERY SELECT FALSE,
        format('Only for the class of %s', v_rule.graduation_year);
      RETURN;
    END IF;
  END IF;

  -- 2. Department (no rows = every department is allowed)
  SELECT string_agg(d.department_code, ', ' ORDER BY d.department_code) INTO v_depts
    FROM drive_eligible_departments ed
    JOIN departments d ON d.department_id = ed.department_id
   WHERE ed.drive_id = p_drive_id;

  IF v_depts IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM drive_eligible_departments
        WHERE drive_id = p_drive_id AND department_id = v_student.department_id) THEN
    RETURN QUERY SELECT FALSE, format('Open to %s only', v_depts);
    RETURN;
  END IF;

  -- 3. Skills: every job skill needs proficiency >= required level
  SELECT string_agg(k.skill_name || ' (level ' || js.required_level || '+)', ', ' ORDER BY k.skill_name)
    INTO v_missing
    FROM job_skills js
    JOIN skills k ON k.skill_id = js.skill_id
    LEFT JOIN student_skills ss ON ss.skill_id = js.skill_id AND ss.student_id = p_student_id
   WHERE js.job_id = v_job_id
     AND COALESCE(ss.proficiency_level, 0) < js.required_level;

  IF v_missing IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Skills needed: ' || v_missing;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'You meet all requirements'::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;