const staffItems = [
  { to: '/officer/companies', label: 'Companies', icon: 'bi-buildings' },
  { to: '/officer/jobs', label: 'Jobs', icon: 'bi-briefcase' },
  { to: '/officer/drives', label: 'Placement Drives', icon: 'bi-calendar-event' },
  { to: '/officer/applications', label: 'Applications', icon: 'bi-inboxes' },
];

export const navItems = {
  STUDENT: [
    { to: '/student', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
    { to: '/student/profile', label: 'My Profile', icon: 'bi-person-circle' },
    { to: '/student/skills', label: 'Skills', icon: 'bi-lightning-charge' },
    { to: '/student/drives', label: 'Placement Drives', icon: 'bi-briefcase' },
    { to: '/student/applications', label: 'My Applications', icon: 'bi-send-check' },
  ],
  PLACEMENT_OFFICER: [
    { to: '/officer', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
    ...staffItems,
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
    { to: '/admin/users', label: 'Users', icon: 'bi-people' },
    ...staffItems,
  ],
};
