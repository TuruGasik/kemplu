import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Analytics } from './pages/Analytics';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { RideDetail } from './pages/RideDetail';
import { RideHistory } from './pages/RideHistory';
import { TermsOfService } from './pages/TermsOfService';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/analytics" element={<ProtectedRoute page="analytics" />} />
        <Route path="/rides" element={<ProtectedRoute page="rides" />} />
        <Route path="/rides/:activityId" element={<ProtectedRoute page="ride-detail" />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ page = 'dashboard' }: { page?: 'dashboard' | 'rides' | 'ride-detail' | 'analytics' }) {
  const token = localStorage.getItem('kemplu_session_token');
  const demoMode = localStorage.getItem('kemplu_demo_mode') === 'true';
  if (token === 'mock-session-token' && !demoMode) {
    localStorage.removeItem('kemplu_session_token');
    return <Navigate to="/login" replace />;
  }
  if (!token) return <Navigate to="/login" replace />;
  if (page === 'rides') return <RideHistory />;
  if (page === 'ride-detail') return <RideDetail />;
  if (page === 'analytics') return <Analytics />;
  return <Dashboard />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
