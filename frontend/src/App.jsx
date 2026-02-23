import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ─── Lazy-loaded layouts ────────────────────────────────
const AdminLayout = lazy(() => import('./components/Layout/AdminLayout'));
const StudentLayout = lazy(() => import('./components/Layout/StudentLayout'));

// ─── Lazy-loaded pages ──────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));
const StudentLogin = lazy(() => import('./pages/auth/StudentLogin'));
const StudentRegister = lazy(() => import('./pages/auth/StudentRegister'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Programs = lazy(() => import('./pages/admin/Programs'));
const Assessments = lazy(() => import('./pages/admin/Assessments'));
const AssessmentForm = lazy(() => import('./pages/admin/AssessmentForm'));
const AssessmentDetail = lazy(() => import('./pages/admin/AssessmentDetail'));
const ExportAll = lazy(() => import('./pages/admin/ExportAll'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const AssessmentView = lazy(() => import('./pages/student/AssessmentView'));
const MyResults = lazy(() => import('./pages/student/MyResults'));

// ─── Loading fallback ───────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0f0f1a',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '3px solid #2d3748',
        borderTopColor: '#6c5ce7',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#16213e',
              color: '#e4e6eb',
              border: '1px solid #2d3748',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00b894', secondary: '#16213e' } },
            error: { iconTheme: { primary: '#ff6b6b', secondary: '#16213e' } },
          }}
        />

        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/student/register" element={<StudentRegister />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="programs" element={<Programs />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="assessments/new" element={<AssessmentForm />} />
                <Route path="assessments/:id/edit" element={<AssessmentForm />} />
                <Route path="assessments/:id" element={<AssessmentDetail />} />
                <Route path="export" element={<ExportAll />} />
              </Route>

              {/* Student Routes */}
              <Route path="/student" element={
                <ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>
              }>
                <Route index element={<StudentDashboard />} />
                <Route path="assessment/:id" element={<AssessmentView />} />
                <Route path="results" element={<MyResults />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
