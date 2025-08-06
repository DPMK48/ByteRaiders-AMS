import "./styles/globals.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './components/Login';
import { QRScanner } from './components/QRScanner';
import { AdminDashboard } from './components/AdminDashboard';
import { Toaster } from './components/ui/sonner';
import type React from "react";

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles: string[] }) {
  const { user, isInitialized } = useAuth();

  // Show nothing or a loader until we've checked localStorage
  if (!isInitialized) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}


function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login onLoginSuccess={() => { /* handle login */ }} />} />


      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute roles={['staff', 'student']}>
            <QRScanner />
          </ProtectedRoute>
        }
      />

      {/* Default route */}
      <Route path="*" element={<NavigateToRoleDashboard />} />
    </Routes>
  );
}

// This helper redirects based on current role
function NavigateToRoleDashboard() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/attendance" replace />;
}


export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="nascomsoft-theme">
      <Router>
        <AuthProvider>
          <div className="min-h-screen font-sans antialiased">
            <AppContent />
            <Toaster 
              position="top-right"
              expand={false}
              richColors
              closeButton
            />
          </div>
      </AuthProvider>
        </Router>
    </ThemeProvider>
  );
}
