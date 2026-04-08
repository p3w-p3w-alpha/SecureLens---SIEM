import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dock from './components/Dock';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import SimulatorPage from './pages/SimulatorPage';
import AlertsPage from './pages/AlertsPage';
import AlertDetailPage from './pages/AlertDetailPage';
import IntelPage from './pages/IntelPage';
import ChatPanel from './components/ChatPanel';
import HuntPage from './pages/HuntPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import IngestPage from './pages/IngestPage';
import AdminPage from './pages/AdminPage';
import AdminRoute from './components/AdminRoute';
import Stars from './components/Stars';
import CinematicWipe from './components/CinematicWipe';
import { motion, AnimatePresence } from 'framer-motion';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  return (
    <div className="flex min-h-screen relative">
      <Stars />
      <Dock />
      <main className={`flex-1 min-h-screen transition-all duration-200 ${isAuthenticated && !isPublicPage ? 'pb-20' : ''}`}>
        <CinematicWipe locationKey={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
            <Route path="/alerts/:id" element={<ProtectedRoute><AlertDetailPage /></ProtectedRoute>} />
            <Route path="/intel" element={<ProtectedRoute><IntelPage /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
            <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />
            <Route path="/hunt" element={<ProtectedRoute><HuntPage /></ProtectedRoute>} />
            <Route path="/ingest" element={<ProtectedRoute><IngestPage /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          </Routes>
        </CinematicWipe>
      </main>
      <ChatPanel />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
