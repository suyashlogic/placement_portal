export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

export const formatPackage = (min, max) =>
  Number(min) === Number(max) ? `₹${Number(min)} LPA` : `₹${Number(min)} – ${Number(max)} LPA`;

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the user's local time
export const toDateTimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ...and the server wants an unambiguous ISO timestamp
export const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : '');
