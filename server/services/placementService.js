import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { httpError } from '../utils/httpError.js';
import { setActor, writeAudit, notify, emailAfterCommit } from '../utils/txHelpers.js';
import { OFFER_COLS, lockOffer } from './offerService.js';

const PLACEMENT_COLS = `placement_id AS "placementId", offer_id AS "offerId",
  TO_CHAR(placement_date, 'YYYY-MM-DD') AS "placementDate", final_package_lpa AS "finalPackageLpa",
  TO_CHAR(joining_date, 'YYYY-MM-DD') AS "joiningDate", placement_status AS "status",
  application_id AS "applicationId", student_id AS "studentId", student_name AS "studentName",
  roll_number AS "rollNumber", department_code AS "departmentCode", cgpa,
  company_name AS "companyName", job_title AS "jobTitle", drive_title AS "driveTitle"`;

// Staff overview: confirmed placements, plus accepted offers still waiting to be confirmed
export const listPlacementsOverview = async () => {
  const [placements, awaiting] = await Promise.all([
    query(`SELECT ${PLACEMENT_COLS} FROM placement_summary_view ORDER BY placement_date DESC, placement_id DESC`),
    query(`SELECT ${OFFER_COLS} FROM offer_details_view
            WHERE status = 'ACCEPTED' AND placement_id IS NULL ORDER BY created_at`),
  ]);
  return { placements: placements.rows, awaiting: awaiting.rows };
};

export const getMyPlacement = async (studentId) => {
  const result = await query(
    `SELECT ${PLACEMENT_COLS} FROM placement_summary_view
      WHERE student_id = $1 AND placement_status <> 'CANCELLED' LIMIT 1`, [studentId]);
  return result.rows[0] || null;
};

export const confirmPlacement = (userId, d) =>
  withTransaction(async (client) => {
    await setActor(client, userId, 'Placement confirmed');

    const offer = await lockOffer(client, d.offerId);
    if (!offer) return null;

    // Package and joining date default to the offer's. The final package can differ after negotiation.
    // The BEFORE INSERT trigger checks: accepted offer, application OFFERED, no other placement for
    // this student. The AFTER INSERT trigger moves the application to PLACED.
    const inserted = await client.query(
      `INSERT INTO placements (offer_id, placement_date, final_package_lpa, joining_date)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), COALESCE($3::numeric, $4::numeric), COALESCE($5::date, $6::date))
       RETURNING placement_id AS "placementId"`,
      [d.offerId, d.placementDate, d.finalPackageLpa, offer.packageLpa, d.joiningDate, offer.joiningDate]
    );
    const { placementId } = inserted.rows[0];

    await notify(client, offer.studentUserId, 'Placement confirmed',
      `Congratulations! Your placement with ${offer.companyName} has been confirmed.`);
    emailAfterCommit(client, 'placementConfirmed', offer.studentUserId, {
      companyName: offer.companyName, jobTitle: offer.jobTitle,
      finalPackageLpa: d.finalPackageLpa ?? offer.packageLpa,
      joiningDate: d.joiningDate || offer.joiningDate,
    });
    await writeAudit(client, userId, 'PLACEMENT_CONFIRM', 'placement', placementId, { offerId: d.offerId });
    return { placementId };
  });

export const markJoined = (userId, placementId) =>
  withTransaction(async (client) => {
    await setActor(client, userId);
    const found = await client.query(
      `SELECT pl.placement_id, pl.placement_status AS status,
              su.user_id AS "studentUserId", c.company_name AS "companyName"
         FROM placements pl
         JOIN offers o           ON o.offer_id = pl.offer_id
         JOIN applications a     ON a.application_id = o.application_id
         JOIN students s         ON s.student_id = a.student_id
         JOIN users su           ON su.user_id = s.user_id
         JOIN placement_drives p ON p.drive_id = a.drive_id
         JOIN jobs j             ON j.job_id = p.job_id
         JOIN companies c        ON c.company_id = j.company_id
        WHERE pl.placement_id = $1
          FOR UPDATE OF pl`,
      [placementId]
    );
    const placement = found.rows[0];
    if (!placement) return null;
    if (placement.status !== 'CONFIRMED') {
      throw httpError(409, `This placement is already ${placement.status.toLowerCase()}`);
    }

    // The BEFORE UPDATE trigger allows only CONFIRMED -> JOINED
    await client.query("UPDATE placements SET placement_status = 'JOINED' WHERE placement_id = $1", [placementId]);
    await notify(client, placement.studentUserId, 'Joining recorded',
      `Your joining at ${placement.companyName} has been recorded. Best wishes!`);
    await writeAudit(client, userId, 'PLACEMENT_JOINED', 'placement', placementId);
    return { placementId, status: 'JOINED' };
  });
