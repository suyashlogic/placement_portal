-- =====================================================
-- Placement Cell Management Portal: schema (PostgreSQL)
-- DEV ONLY: drops everything first so the script is re-runnable
-- =====================================================

DROP TABLE IF EXISTS
  audit_logs, notifications, placements, offers, selection_process,
  application_status_history, applications, drive_eligible_departments,
  drive_eligibility, placement_drives, job_skills, jobs, companies,
  student_skills, skills, students, departments, users
CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ---------- Authentication ----------
CREATE TABLE users (
  user_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          VARCHAR(20)  NOT NULL
                CHECK (role IN ('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Case-insensitive uniqueness: Test@x.com and test@x.com are the same account
CREATE UNIQUE INDEX uq_users_email ON users (LOWER(email));

-- ---------- Departments & students ----------
CREATE TABLE departments (
  department_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  department_code VARCHAR(10)  NOT NULL UNIQUE
);

CREATE TABLE students (
  student_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE
                  REFERENCES users(user_id) ON DELETE CASCADE,       -- 1:1 with users
  department_id   INT NOT NULL
                  REFERENCES departments(department_id)
                  ON DELETE RESTRICT ON UPDATE CASCADE,
  roll_number     VARCHAR(30)  NOT NULL UNIQUE,
  phone           VARCHAR(15)  CHECK (phone ~ '^[0-9+ -]{10,15}$'),
  date_of_birth   DATE,
  cgpa            NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (cgpa BETWEEN 0 AND 10),
  graduation_year SMALLINT     NOT NULL CHECK (graduation_year BETWEEN 2000 AND 2100),
  resume_path     VARCHAR(500),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- Skills ----------
CREATE TABLE skills (
  skill_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  skill_name VARCHAR(80) NOT NULL UNIQUE
);

-- Associative table: resolves the M:N between students and skills
CREATE TABLE student_skills (
  student_id        INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  skill_id          INT NOT NULL REFERENCES skills(skill_id)     ON DELETE RESTRICT,
  proficiency_level SMALLINT NOT NULL CHECK (proficiency_level BETWEEN 1 AND 5),
  PRIMARY KEY (student_id, skill_id)   -- composite key: a student has each skill once
);

-- ---------- Companies & jobs ----------
CREATE TABLE companies (
  company_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_name   VARCHAR(150) NOT NULL UNIQUE,
  industry       VARCHAR(100),
  location       VARCHAR(150),
  website        VARCHAR(255),
  description    TEXT,
  contact_person VARCHAR(100),
  contact_email  VARCHAR(255),
  status         VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
  job_id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id       INT NOT NULL REFERENCES companies(company_id) ON DELETE RESTRICT,
  job_title        VARCHAR(150) NOT NULL,
  job_description  TEXT,
  job_location     VARCHAR(150),
  employment_type  VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME'
                   CHECK (employment_type IN ('FULL_TIME', 'INTERNSHIP', 'CONTRACT')),
  min_package_lpa  NUMERIC(6,2) NOT NULL CHECK (min_package_lpa > 0),
  max_package_lpa  NUMERIC(6,2) NOT NULL,
  job_status       VARCHAR(10) NOT NULL DEFAULT 'OPEN'
                   CHECK (job_status IN ('OPEN', 'CLOSED')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_job_package_range CHECK (max_package_lpa >= min_package_lpa)
);

CREATE TABLE job_skills (
  job_id         INT NOT NULL REFERENCES jobs(job_id)     ON DELETE CASCADE,
  skill_id       INT NOT NULL REFERENCES skills(skill_id) ON DELETE RESTRICT,
  required_level SMALLINT NOT NULL CHECK (required_level BETWEEN 1 AND 5),
  PRIMARY KEY (job_id, skill_id)
);

-- ---------- Placement drives & eligibility ----------
CREATE TABLE placement_drives (
  drive_id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id                 INT NOT NULL REFERENCES jobs(job_id) ON DELETE RESTRICT,
  drive_title            VARCHAR(200) NOT NULL,
  description            TEXT,
  registration_open_date TIMESTAMPTZ NOT NULL,
  registration_deadline  TIMESTAMPTZ NOT NULL,
  drive_date             TIMESTAMPTZ NOT NULL,
  status                 VARCHAR(10) NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT','OPEN','CLOSED','COMPLETED','CANCELLED')),
  created_by             INT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- registration opens, then closes, then the drive happens
  CONSTRAINT chk_drive_dates CHECK (
    registration_open_date < registration_deadline
    AND registration_deadline <= drive_date
  )
);

-- 1:1 with a drive. Skill requirements come from job_skills (approved change #4).
CREATE TABLE drive_eligibility (
  drive_id        INT PRIMARY KEY REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  min_cgpa        NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (min_cgpa BETWEEN 0 AND 10),
  graduation_year SMALLINT CHECK (graduation_year BETWEEN 2000 AND 2100)  -- NULL = any year
);

-- Allowed departments. No rows for a drive = all departments allowed.
CREATE TABLE drive_eligible_departments (
  drive_id      INT NOT NULL REFERENCES placement_drives(drive_id) ON DELETE CASCADE,
  department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  PRIMARY KEY (drive_id, department_id)
);

-- ---------- Applications & selection ----------
CREATE TABLE applications (
  application_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id         INT NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  drive_id           INT NOT NULL REFERENCES placement_drives(drive_id) ON DELETE RESTRICT,
  application_status VARCHAR(15) NOT NULL DEFAULT 'APPLIED'
                     CHECK (application_status IN (
                       'APPLIED','UNDER_REVIEW','SHORTLISTED','INTERVIEW',
                       'SELECTED','REJECTED','OFFERED','PLACED','WITHDRAWN')),
  application_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The database itself blocks duplicate applications
  CONSTRAINT uq_one_application_per_drive UNIQUE (student_id, drive_id)
);

CREATE TABLE application_status_history (
  history_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  old_status     VARCHAR(15),                 -- NULL for the first entry
  new_status     VARCHAR(15) NOT NULL,
  changed_by     INT REFERENCES users(user_id) ON DELETE SET NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remarks        TEXT
);

CREATE TABLE selection_process (
  selection_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  round_number   SMALLINT NOT NULL CHECK (round_number >= 1),
  round_name     VARCHAR(100) NOT NULL,
  round_type     VARCHAR(20) NOT NULL
                 CHECK (round_type IN ('APTITUDE','CODING','TECHNICAL','HR','GROUP_DISCUSSION')),
  scheduled_at   TIMESTAMPTZ,
  location       VARCHAR(255),                -- room or meeting link
  result         VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                 CHECK (result IN ('PENDING','PASSED','FAILED','ABSENT')),
  remarks        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_round_per_application UNIQUE (application_id, round_number)
);

-- ---------- Offers & placements ----------
CREATE TABLE offers (
  offer_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id INT NOT NULL UNIQUE                -- 1:1 with application
                 REFERENCES applications(application_id) ON DELETE RESTRICT,
  offer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  package_lpa    NUMERIC(6,2) NOT NULL CHECK (package_lpa > 0),
  joining_date   DATE,
  status         VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','ACCEPTED','REJECTED','EXPIRED')),
  remarks        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student, company and job are NOT stored here: they are reachable via
-- offer -> application -> student / drive -> job -> company (approved change #3)
CREATE TABLE placements (
  placement_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id          INT NOT NULL UNIQUE
                    REFERENCES offers(offer_id) ON DELETE RESTRICT,
  placement_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  final_package_lpa NUMERIC(6,2) NOT NULL CHECK (final_package_lpa > 0),
  joining_date      DATE,
  placement_status  VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED'
                    CHECK (placement_status IN ('CONFIRMED','JOINED','CANCELLED')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Notifications & audit ----------
CREATE TABLE notifications (
  notification_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title           VARCHAR(150) NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  audit_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INT REFERENCES users(user_id) ON DELETE SET NULL,  -- keep the log if the user is deleted
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   INT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- First PL/pgSQL: keep updated_at accurate automatically
-- =====================================================
CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to every table that has an updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','students','companies','jobs','placement_drives',
    'applications','selection_process','offers','placements'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;