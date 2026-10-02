import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { navItems } from '../utils/navConfig';

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const items = navItems[user.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <i className="bi bi-mortarboard-fill"></i><span>Placement Portal</span>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className="sidebar-link" onClick={() => setOpen(false)}>
              <i className={`bi ${item.icon}`}></i>{item.label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-link" onClick={handleLogout}>
          <i className="bi bi-box-arrow-left"></i>Logout
        </button>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)}></div>}

      <div className="app-main">
        <header className="topbar">
          <button className="btn btn-light d-lg-none" onClick={() => setOpen(true)} aria-label="Open menu">
            <i className="bi bi-list"></i>
          </button>
          <div className="ms-auto d-flex align-items-center gap-2">
            <div className="text-end d-none d-sm-block">
              <div className="fw-semibold small">{user.fullName}</div>
              <div className="text-muted small">{user.role.replace('_', ' ')}</div>
            </div>
            <div className="avatar">{initials}</div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
export default DashboardLayout;