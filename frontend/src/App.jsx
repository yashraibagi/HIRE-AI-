import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute, AuthRoute } from './components/PrivateRoute';

// Pages
import LandingPage from './pages/Landing';
import RoleSelect from './pages/RoleSelect';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import HRDashboard from './pages/HRDashboard';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      {/* Role Selection - public onboarding step */}
      <Route path="/role-select" element={<RoleSelect />} />

      {/* Auth Routes - Protected: must have role state */}
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />

      {/* Student Dashboard - Protected: must be logged in with student role */}
      <Route
        path="/student"
        element={
          <PrivateRoute requiredRole="student">
            <StudentDashboard />
          </PrivateRoute>
        }
      />

      {/* Recruiter Dashboard - Protected: must be logged in with recruiter role */}
      <Route
        path="/recruiter"
        element={
          <PrivateRoute requiredRole="recruiter">
            <HRDashboard />
          </PrivateRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-800 selection:text-zinc-100">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}