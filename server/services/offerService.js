import { query } from '../config/db.js';
import { withTransaction } from '../utils/withTransaction.js';
import { httpError } from '../utils/httpError.js';
import { setActor, writeAudit, notify, emailAfterCommit } from '../utils/txHelpers.js';

// DATE columns are formatted in SQL so they reach React as plain "YYYY-MM-DD" text
export const OFFER_COLS = `offer_id AS "offerId", application_id AS "applicationId",
  TO_CHAR(offer_date, 'YYYY-MM-DD') AS "offerDate", package_lpa AS "packageLpa",
  TO_CHAR(joining_date, 'YYYY-MM-DD') AS "joiningDate", status, remarks,
  created_at AS "createdAt", student_id AS "studentId", student_name AS "studentName",
  roll_number AS "rollNumber", department_code AS "departmentCode", drive_id AS "driveId",
  drive_title AS "driveTitle", company_name AS "companyName", job_title AS "jobTitle",
  placement_id AS "placementId"`;

export const listOffersForStudent = async (studentId) => {
  const result = await query(
    `SELECT ${OFFER_COLS} FROM offer_details_view
      WHERE student_id = $1 ORDER BY created_at DESC, offer_id DESC`, [studentId]);
  return result.rows;
};

export const listOffersForStaff = async (status) => {
  const result = await query(
    `SELECT ${OFFER_COLS} FROM offer_details_view
      WHERE ($1::text IS NULL OR status = $1::text)
      ORDER BY created_at DESC, offer_id DESC LIMIT 200`, [status]);
  return result.rows;
};

// Selected candidates who have no offer yet (an offer moves them to OFFERED)
export const listOfferCandidates = async () => {
  const result = await query(
    `SELECT application_id AS "applicationId", student_name AS "studentName",
            roll_number AS "rollNumber", department_code AS "departmentCode",
            drive_title AS "driveTitle", company_name AS "companyName", job_title AS "jobTitle",
            min_package_lpa AS "minPackageLpa", max_package_lpa AS "maxPackageLpa"
       FROM student_application_view
      WHERE application_status = 'SELECTED' ORDER BY student_name`);
  return result.rows;
};

// Locks the offer's APPLICATION first, then the offer. Every offer/placement function uses
// this same order, so two transactions can never wait on each other in a circle (deadlock).
// studentId (optional) makes a student's own offer the only one they can reach.
export const lockOffer = async (client, offerId, studentId = null) => {
  const ref = await client.query(
    `SELECT o.application_id FROM offers o JOIN applications a ON a.application_id = o.application_id
      WHERE o.offer_id = $1 AND ($2::int IS NULL OR a.student_id = $2::int)`,
    [offerId, studentId]
  );
  if (!ref.rows[0]) return null;

  await client.query('SELECT 1 FROM applications WHERE application_id = $1 FOR UPDATE', [ref.rows[0].application_id]);

  const result = await client.query(
    `SELECT o.offer_id AS "offerId", o.status, o.package_lpa AS "packageLpa",
            TO_CHAR(o.joining_date, 'YYYY-MM-DD') AS "joiningDate",
            a.application_id AS "applicationId", a.student_id AS "studentId",
            su.user_id AS "studentUserId", su.full_name AS "studentName",
            p.drive_title AS "driveTitle", c.company_name AS "companyName", j.job_title AS "jobTitle"
       FROM offers o
       JOIN applications a     ON a.application_id = o.application_id
       JOIN students s         ON s.student_id = a.student_id
       JOIN users su           ON su.user_id = s.user_id
       JOIN placement_drives p ON p.drive_id = a.drive_id
       JOIN jobs j             ON j.job_id = p.job_id
       JOIN companies c        ON c.company_id = j.company_id
      WHERE o.offer_id = $1
        FOR UPDATE OF o`,
    [offerId]
  );
  return result.rows[0];
};

export const createOffer = (userId, d) =>
  withTransaction(async (client) => {
    await setActor(client, userId);

    const found = await client.query(
      `SELECT a.application_id, s.user_id AS "studentUserId",
              p.drive_title AS "driveTitle", c.company_name AS "companyName"
         FROM applications a
         JOIN students s         ON s.student_id = a.student_id
         JOIN placement_drives p ON p.drive_id = a.drive_id
         JOIN jobs j             ON j.job_id = p.job_id
         JOIN companies c        ON c.company_id = j.company_id
        WHERE a.application_id = $1
          FOR UPDATE OF a`,
      [d.applicationId]
    );
    const app = found.rows[0];
    if (!app) return null;

    // The BEFORE INSERT trigger checks: SELECTED, not placed, no other open offer.
    // The AFTER INSERT trigger moves the application to OFFERED.
    const inserted = await client.query(
      `INSERT INTO offers (application_id, package_lpa, joining_date, remarks)
       VALUES ($1, $2, $3, $4) RETURNING offer_id AS "offerId"`,
      [d.applicationId, d.packageLpa, d.joiningDate, d.remarks]
    );
    const { offerId } = inserted.rows[0];

    await notify(client, app.studentUserId, 'You have received an offer',
      `${app.companyName} offered you ₹${d.packageLpa} LPA (${app.driveTitle}). Please accept or reject it.`);
    emailAfterCommit(client, 'offerCreated', app.studentUserId, {
      companyName: app.companyName, driveTitle: app.driveTitle, packageLpa: d.packageLpa,
      joiningDate: d.joiningDate, remarks: d.remarks, updated: false,
    });
    await writeAudit(client, userId, 'OFFER_CREATE', 'offer', offerId, { applicationId: d.applicationId });
    return { offerId };
  });

export const updateOffer = (userId, offerId, d) =>
  withTransaction(async (client) => {
    const offer = await lockOffer(client, offerId);
    if (!offer) return null;
    if (offer.status !== 'PENDING') throw httpError(409, 'Only a pending offer can be edited');

    await client.query(
      'UPDATE offers SET package_lpa = $1, joining_date = $2, remarks = $3 WHERE offer_id = $4',
      [d.packageLpa, d.joiningDate, d.remarks, offerId]
    );
    await notify(client, offer.studentUserId, 'Offer updated',
      `Your offer from ${offer.companyName} was updated to ₹${d.packageLpa} LPA.`);
    emailAfterCommit(client, 'offerCreated', offer.studentUserId, {
      companyName: offer.companyName, driveTitle: offer.driveTitle, packageLpa: d.packageLpa,
      joiningDate: d.joiningDate, remarks: d.remarks, updated: true,
    });
    await writeAudit(client, userId, 'OFFER_UPDATE', 'offer', offerId);
    return { offerId };
  });

// A student accepts or rejects THEIR OWN offer
export const decideOffer = (studentId, userId, offerId, decision) =>
  withTransaction(async (client) => {
    await setActor(client, userId, decision === 'ACCEPT' ? 'Offer accepted by student' : 'Offer rejected by student');

    const offer = await lockOffer(client, offerId, studentId);
    if (!offer) return null;                       // someone else's offer looks like "not found"
    if (offer.status !== 'PENDING') throw httpError(409, `This offer is already ${offer.status.toLowerCase()}`);

    const status = decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    // On REJECTED the trigger also closes the application
    await client.query('UPDATE offers SET status = $1 WHERE offer_id = $2', [status, offerId]);

    // One INSERT ... SELECT tells every active officer and admin
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       SELECT user_id, $1, $2 FROM users
        WHERE role IN ('PLACEMENT_OFFICER', 'ADMIN') AND is_active`,
      [status === 'ACCEPTED' ? 'Offer accepted' : 'Offer rejected',
       `${offer.studentName} ${status === 'ACCEPTED' ? 'accepted' : 'rejected'} the offer from ${offer.companyName}.`]
    );
    await writeAudit(client, userId, decision === 'ACCEPT' ? 'OFFER_ACCEPT' : 'OFFER_REJECT', 'offer', offerId);
    return { offerId, status };
  });

export const expireOffer = (userId, offerId) =>
  withTransaction(async (client) => {
    await setActor(client, userId, 'Offer expired');
    const offer = await lockOffer(client, offerId);
    if (!offer) return null;
    if (offer.status !== 'PENDING') throw httpError(409, 'Only a pending offer can be marked as expired');

    await client.query("UPDATE offers SET status = 'EXPIRED' WHERE offer_id = $1", [offerId]);
    await notify(client, offer.studentUserId, 'Offer expired',
      `Your offer from ${offer.companyName} has expired and the application is closed.`);
    emailAfterCommit(client, 'offerClosed', offer.studentUserId, { companyName: offer.companyName });
    await writeAudit(client, userId, 'OFFER_EXPIRE', 'offer', offerId);
    return { offerId, status: 'EXPIRED' };
  });
