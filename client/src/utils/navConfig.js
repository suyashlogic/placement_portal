const staffItems = [
  { to: '/officer/companies', label: 'Companies', icon: 'bi-buildings' },
  { to: '/officer/jobs', label: 'Jobs', icon: 'bi-briefcase' },
  { to: '/officer/drives', label: 'Placement Drives', icon: 'bi-calendar-event' },
  { to: '/officer/applications', label: 'Applications', icon: 'bi-inboxes' },
  { to: '/officer/selection', label: 'Selection', icon: 'bi-diagram-3' },
  { to: '/officer/offers', label: 'Offers', icon: 'bi-envelope-paper' },
  { to: '/officer/placements', label: 'Placements', icon: 'bi-trophy' },
];

export const navItems = {
  STUDENT: [
    { to: '/student', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
    { to: '/student/profile', label: 'My Profile', icon: 'bi-person-circle' },
    { to: '/student/skills', label: 'Skills', icon: 'bi-lightning-charge' },
    { to: '/student/drives', label: 'Placement Drives', icon: 'bi-briefcase' },
    { to: '/student/applications', label: 'My Applications', icon: 'bi-send-check' },
    { to: '/student/offers', label: 'My Offers', icon: 'bi-envelope-paper' },
    { to: '/student/placement', label: 'Placement Status', icon: 'bi-trophy' },
    { to: '/notifications', label: 'Notifications', icon: 'bi-bell' },
  ],
  PLACEMENT_OFFICER: [
    { to: '/officer', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
    ...staffItems,
    { to: '/notifications', label: 'Notifications', icon: 'bi-bell' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
    { to: '/admin/users', label: 'Users', icon: 'bi-people' },
    ...staffItems,
    { to: '/admin/audit', label: 'Audit Log', icon: 'bi-clipboard-data' },
    { to: '/admin/email', label: 'Email', icon: 'bi-envelope-at' },
    { to: '/notifications', label: 'Notifications', icon: 'bi-bell' },
  ],
};
