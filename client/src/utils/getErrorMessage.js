export const getErrorMessage = (err) =>
  err.response?.data?.message || 'Cannot reach the server. Please try again.';