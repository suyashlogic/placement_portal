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
import StudentDriveDetails from './pages/student/StudentDriveDetails';
import Companies from './pages/officer/Companies';
import Jobs from './pages/officer/Jobs';
import Drives from './pages/officer/Drives';
import DriveForm from './pages/officer/DriveForm';
import DriveEligibleStudents from './pages/officer/DriveEligibleStudents';
import Users from './pages/admin/Users';

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

      {/* Students */}
      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/skills" element={<StudentSkills />} />
          <Route path="/student/drives" element={<StudentDrives />} />
          <Route path="/student/drives/:id" element={<StudentDriveDetails />} />
        </Route>
      </Route>

      {/* Officers (admins may also enter) */}
      <Route element={<ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/officer" element={<DashboardPlaceholder title="Placement Officer Dashboard" />} />
          <Route path="/officer/companies" element={<Companies />} />
          <Route path="/officer/jobs" element={<Jobs />} />
          <Route path="/officer/drives" element={<Drives />} />
          <Route path="/officer/drives/new" element={<DriveForm />} />
          <Route path="/officer/drives/:id/edit" element={<DriveForm />} />
          <Route path="/officer/drives/:id/students" element={<DriveEligibleStudents />} />
        </Route>
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<DashboardPlaceholder title="Admin Dashboard" />} />
          <Route path="/admin/users" element={<Users />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default App;
