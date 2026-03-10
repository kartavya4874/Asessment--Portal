import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// ─── Direct Imports (removed lazy for instant navigation) ────────
import AdminLayout from './components/Layout/AdminLayout';
import StudentLayout from './components/Layout/StudentLayout';

import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/auth/AdminLogin';
import StudentLogin from './pages/auth/StudentLogin';
import StudentRegister from './pages/auth/StudentRegister';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AdminDashboard from './pages/admin/Dashboard';
import Programs from './pages/admin/Programs';
import Assessments from './pages/admin/Assessments';
import AssessmentForm from './pages/admin/AssessmentForm';
import AssessmentDetail from './pages/admin/AssessmentDetail';
import StudentDetail from './pages/admin/StudentDetail';
import Students from './pages/admin/Students';
import AdminStudentDashboard from './pages/admin/AdminStudentDashboard';
import ExportAll from './pages/admin/ExportAll';
import StudentDashboard from './pages/student/Dashboard';
import AssessmentView from './pages/student/AssessmentView';
import MyResults from './pages/student/MyResults';

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
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--surface)' } },
              error: { iconTheme: { primary: 'var(--error)', secondary: 'var(--surface)' } },
            }}
          />

          <Suspense fallback={<PageLoader />}>
            <AnimatePresence>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/student/login" element={<StudentLogin />} />
                <Route path="/student/register" element={<StudentRegister />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="programs" element={<Programs />} />
                  <Route path="students" element={<Students />} />
                  <Route path="assessments" element={<Assessments />} />
                  <Route path="assessments/new" element={<AssessmentForm />} />
                  <Route path="assessments/:id/edit" element={<AssessmentForm />} />
                  <Route path="assessments/:id" element={<AssessmentDetail />} />
                  <Route path="assessments/:id/student/:studentId" element={<StudentDetail />} />
                  <Route path="students/:id" element={<AdminStudentDashboard />} />
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
    </ThemeProvider>
  );
}
