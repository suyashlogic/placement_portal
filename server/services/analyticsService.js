import { query } from '../config/db.js';

// Every number comes from PostgreSQL (the functions and views built in Phases 10 and 11).
// Nothing here calculates a statistic: this file only renames columns to camelCase and turns
// NUMERIC / BIGINT values (which node-postgres returns as strings) into real numbers for the charts.

export const getOverview = async () => {
  const result = await query(
    `SELECT total_students AS "totalStudents", total_companies AS "totalCompanies",
            active_drives AS "activeDrives", total_applications AS "totalApplications",
            shortlisted_students AS "shortlistedStudents", selected_students AS "selectedStudents",
            placed_students AS "placedStudents", COALESCE(placement_rate, 0)::float8 AS "placementRate"
       FROM get_overview_statistics()`
  );
  return result.rows[0];
};

export const getDepartmentPlacement = async (year) => {
  const result = await query(
    `SELECT department_code AS "departmentCode", department_name AS "departmentName",
            total_students AS "totalStudents", placed_students AS "placedStudents",
            COALESCE(placement_rate, 0)::float8 AS "placementRate",
            avg_package_lpa::float8 AS "avgPackageLpa"
       FROM calculate_department_placement_rate($1::int)`,
    [year]
  );
  return result.rows;
};

export const getCompanyHiring = async (limit) => {
  const result = await query(
    `SELECT company_id AS "companyId", company_name AS "companyName", industry,
            jobs::int AS "jobs", drives::int AS "drives", applications::int AS "applications",
            offers::int AS "offers", students_hired::int AS "studentsHired",
            avg_package_lpa::float8 AS "avgPackageLpa", highest_package_lpa::float8 AS "highestPackageLpa"
       FROM get_company_hiring_statistics()
      LIMIT $1::int`,
    [limit]
  );
  return result.rows;
};

export const getPackageStatistics = async (bucket) => {
  const [stats, distribution] = await Promise.all([
    query(
      `SELECT students_placed AS "studentsPlaced", avg_package_lpa::float8 AS "avgPackageLpa",
              median_package_lpa::float8 AS "medianPackageLpa", highest_package_lpa::float8 AS "highestPackageLpa",
              lowest_package_lpa::float8 AS "lowestPackageLpa"
         FROM get_package_statistics()`
    ),
    query(
      `SELECT range_start AS "rangeStart", range_end AS "rangeEnd", students
         FROM get_package_distribution($1::int)`,
      [bucket]
    ),
  ]);
  return { statistics: stats.rows[0], distribution: distribution.rows };
};

export const getDriveSelection = async (driveId) => {
  const result = await query(
    `SELECT drive_id AS "driveId", drive_title AS "driveTitle", company_name AS "companyName",
            applications, shortlisted, selected, offered, COALESCE(selection_ratio, 0)::float8 AS "selectionRatio"
       FROM calculate_drive_selection_ratio($1::int)`,
    [driveId]
  );
  return result.rows;
};

export const getFunnel = async (driveId) => {
  const result = await query('SELECT * FROM get_application_funnel($1::int)', [driveId]);
  return result.rows[0];
};

// month arrives as a DATE; TO_CHAR keeps it a plain "2026-10" string so no time zone can move it
export const getPlacementTrends = async (months) => {
  const result = await query(
    `SELECT TO_CHAR(month, 'YYYY-MM') AS month, placements,
            avg_package_lpa::float8 AS "avgPackageLpa", cumulative_placements AS "cumulativePlacements"
       FROM get_placement_trends($1::int)`,
    [months]
  );
  return result.rows;
};

export const getStatusBreakdown = async (studentId = null) => {
  const result = await query('SELECT status, applications FROM get_application_status_breakdown($1::int)', [studentId]);
  return result.rows;
};

// ---------------------------------------------------------------------------
// Dashboards: a handful of small queries combined into one response per role
// ---------------------------------------------------------------------------
const getOfferCounts = async () => {
  const result = await query(
    `SELECT COUNT(*) FILTER (WHERE status = 'PENDING')::int  AS pending,
            COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted,
            COUNT(*) FILTER (WHERE status = 'ACCEPTED'
                              AND NOT EXISTS (SELECT 1 FROM placements pl WHERE pl.offer_id = offers.offer_id))::int AS "awaitingPlacement",
            COUNT(*)::int AS total
       FROM offers`
  );
  return result.rows[0];
};

const getRecentApplications = async () => {
  const result = await query(
    `SELECT application_id AS "applicationId", student_name AS "studentName", roll_number AS "rollNumber",
            drive_title AS "driveTitle", company_name AS "companyName",
            application_status AS status, application_date AS "applicationDate"
       FROM student_application_view
      ORDER BY application_date DESC, application_id DESC
      LIMIT 8`
  );
  return result.rows;
};

const getUpcomingDrives = async () => {
  const result = await query(
    `SELECT p.drive_id AS "driveId", p.drive_title AS "driveTitle", c.company_name AS "companyName",
            p.status, p.drive_date AS "driveDate", p.registration_deadline AS "registrationDeadline",
            (SELECT COUNT(*)::int FROM applications a WHERE a.drive_id = p.drive_id) AS applications
       FROM placement_drives p
       JOIN jobs j      ON j.job_id = p.job_id
       JOIN companies c ON c.company_id = j.company_id
      WHERE p.status IN ('OPEN', 'DRAFT') AND p.drive_date >= NOW()
      ORDER BY p.drive_date
      LIMIT 5`
  );
  return result.rows;
};

export const getStaffDashboard = async () => {
  const [overview, offers, recentApplications, upcomingDrives] = await Promise.all([
    getOverview(), getOfferCounts(), getRecentApplications(), getUpcomingDrives(),
  ]);
  return { overview, offers, recentApplications, upcomingDrives };
};

export const getAdminDashboard = async () => {
  const [staff, system, activity] = await Promise.all([
    getStaffDashboard(),
    query(
      `SELECT (SELECT COUNT(*)::int FROM departments)                                           AS departments,
              (SELECT COUNT(*)::int FROM jobs)                                                  AS jobs,
              (SELECT COUNT(*)::int FROM placement_drives)                                      AS drives,
              (SELECT COUNT(*)::int FROM placements WHERE placement_status <> 'CANCELLED')      AS placements,
              (SELECT COUNT(*) FILTER (WHERE role = 'STUDENT')::int           FROM users)       AS students,
              (SELECT COUNT(*) FILTER (WHERE role = 'PLACEMENT_OFFICER')::int FROM users)       AS officers,
              (SELECT COUNT(*) FILTER (WHERE role = 'ADMIN')::int             FROM users)       AS admins,
              (SELECT COUNT(*) FILTER (WHERE NOT is_active)::int              FROM users)       AS "inactiveUsers"`
    ),
    query(
      `SELECT l.audit_id AS "auditId", l.created_at AS "createdAt", l.action, l.entity_type AS "entityType",
              l.entity_id AS "entityId", u.full_name AS "userName"
         FROM audit_logs l LEFT JOIN users u ON u.user_id = l.user_id
        ORDER BY l.created_at DESC, l.audit_id DESC LIMIT 8`
    ),
  ]);
  return { ...staff, system: system.rows[0], recentActivity: activity.rows };
};

// The student's own insights. studentId always comes from the session, never from the request.
export const getStudentInsights = async (studentId) => {
  const [stats, breakdown, interviews, offers] = await Promise.all([
    query(
      `SELECT total_applications AS "totalApplications", in_progress AS "inProgress", shortlisted,
              selected, rejected, withdrawn, offers_received AS "offersReceived", is_placed AS "isPlaced"
         FROM get_student_application_statistics($1::int)`,
      [studentId]
    ),
    getStatusBreakdown(studentId),
    query(
      `SELECT sp.selection_id AS "selectionId", sp.round_number AS "roundNumber", sp.round_name AS "roundName",
              sp.round_type AS "roundType", sp.scheduled_at AS "scheduledAt", sp.location,
              a.application_id AS "applicationId", p.drive_title AS "driveTitle", c.company_name AS "companyName"
         FROM selection_process sp
         JOIN applications a     ON a.application_id = sp.application_id
         JOIN placement_drives p ON p.drive_id = a.drive_id
         JOIN jobs j             ON j.job_id = p.job_id
         JOIN companies c        ON c.company_id = j.company_id
        WHERE a.student_id = $1 AND sp.result = 'PENDING' AND a.application_status = 'INTERVIEW'
        ORDER BY sp.scheduled_at NULLS LAST, sp.selection_id
        LIMIT 5`,
      [studentId]
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending, COUNT(*)::int AS total
         FROM offer_details_view WHERE student_id = $1`,
      [studentId]
    ),
  ]);
  return { statistics: stats.rows[0], breakdown, upcomingInterviews: interviews.rows, offers: offers.rows[0] };
};
