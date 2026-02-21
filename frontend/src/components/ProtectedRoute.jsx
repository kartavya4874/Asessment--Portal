import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (role && user?.role !== role) {
        return <Navigate to="/" replace />;
    }

    return children;
}
