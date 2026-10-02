export const getDriveState = (drive) => {
  if (drive.hasApplied) return { label: 'Already Applied', tone: 'primary', icon: 'bi-check2-circle' };
  if (drive.registrationClosed) return { label: 'Registration Closed', tone: 'secondary', icon: 'bi-lock' };
  if (drive.isEligible) return { label: 'Eligible', tone: 'success', icon: 'bi-patch-check' };
  return { label: 'Not Eligible', tone: 'danger', icon: 'bi-x-octagon' };
};