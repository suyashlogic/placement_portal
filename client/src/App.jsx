import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { homePathFor } from './utils/roleHome';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPlaceholder from './components/DashboardPlaceholder';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Student only */}
      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student" element={<DashboardPlaceholder title="Student Dashboard" />} />
        </Route>
      </Route>

      {/* Officer (admins may also enter) */}
      <Route element={<ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/officer" element={<DashboardPlaceholder title="Placement Officer Dashboard" />} />
        </Route>
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<DashboardPlaceholder title="Admin Dashboard" />} />
        </Route>
      </Route>

      {/* Anything else */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;