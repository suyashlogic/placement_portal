import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { homePathFor } from './utils/roleHome';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPlaceholder from './components/DashboardPlaceholder';
import DashboardLayout from './layouts/DashboardLayout';
import AuthShell from './layouts/AuthShell';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentSkills from './pages/student/StudentSkills';
import StudentDrives from './pages/student/StudentDrives';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<AuthShell />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/skills" element={<StudentSkills />} />
          <Route path="/student/drives" element={<StudentDrives />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/officer" element={<DashboardPlaceholder title="Placement Officer Dashboard" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<DashboardPlaceholder title="Admin Dashboard" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;