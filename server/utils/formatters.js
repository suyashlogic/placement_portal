// Wording helpers for notifications and emails (kept out of the services' business logic)
const TZ = 'Asia/Kolkata';

export const formatWhen = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }) : null;

export const formatPackageRange = (min, max) =>
  Number(min) === Number(max) ? `₹${Number(min)} LPA` : `₹${Number(min)} – ${Number(max)} LPA`;
