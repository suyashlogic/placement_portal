const tones = {
  OPEN: 'success', DRAFT: 'secondary', CLOSED: 'secondary', COMPLETED: 'info', CANCELLED: 'danger',
  APPLIED: 'primary', UNDER_REVIEW: 'info', SHORTLISTED: 'info', INTERVIEW: 'warning',
  SELECTED: 'success', OFFERED: 'success', PLACED: 'success', REJECTED: 'danger', WITHDRAWN: 'secondary',
  PENDING: 'warning', PASSED: 'success', FAILED: 'danger', ABSENT: 'secondary',
  ACCEPTED: 'success', EXPIRED: 'secondary',
};

function StatusBadge({ status }) {
  const tone = tones[status] || 'secondary';
  return (
    <span className={`badge rounded-pill bg-${tone}-subtle text-${tone}-emphasis`}>
      {status.replace('_', ' ')}
    </span>
  );
}
export default StatusBadge;