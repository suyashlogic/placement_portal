export const homePathFor = (role) =>
  ({
    STUDENT: '/student',
    PLACEMENT_OFFICER: '/officer',
    ADMIN: '/admin',
  })[role] || '/login';