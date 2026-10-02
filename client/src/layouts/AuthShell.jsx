import { Outlet } from 'react-router-dom';

function AuthShell() {
  return <div className="auth-shell"><Outlet /></div>;
}
export default AuthShell;