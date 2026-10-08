import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployerDashboardPage from './pages/EmployerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { AuthProvider } from './context/AuthContext';

// Application routes
function App() {
  // Keep auth state above every route so pages share one signed-in user/session.
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employer-dashboard" element={<EmployerDashboardPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;