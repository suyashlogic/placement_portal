export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatPackage = (min, max) =>
  Number(min) === Number(max) ? `₹${Number(min)} LPA` : `₹${Number(min)} – ${Number(max)} LPA`;