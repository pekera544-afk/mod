import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPwa from './pages/admin/AdminPwa';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRooms from './pages/admin/AdminRooms';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminEvents from './pages/admin/AdminEvents';
import AdminAuditLog from './pages/admin/AdminAuditLog';

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gold-DEFAULT">Yükleniyor...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="rooms/:id" element={<RoomPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
      <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminDashboard />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="pwa" element={<AdminPwa />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
      </Route>
    </Routes>
  );
}
