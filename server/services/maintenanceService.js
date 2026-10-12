import { query } from '../config/db.js';

// These call the stored PROCEDURES from database/procedures.sql. A procedure that COMMITs inside itself
// must be called at top level, so they use the plain pool query, never a transaction block.
// INOUT parameters come back as a one-row result.

export const closeExpiredDrives = async () => {
  const result = await query('CALL close_expired_drives(0)');
  return result.rows[0].p_closed;
};

export const expireStaleOffers = async (days) => {
  const result = await query('CALL expire_stale_offers($1::int, 0)', [days]);
  return result.rows[0].p_expired;
};
