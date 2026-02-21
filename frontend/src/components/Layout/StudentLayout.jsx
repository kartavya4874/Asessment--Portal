import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Top Nav */}
            <header style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                padding: '0 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '64px',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                    }}>
                        🧪
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>AI Lab Portal</span>

                    <nav style={{ display: 'flex', gap: '4px', marginLeft: '24px' }}>
                        <NavLink
                            to="/student"
                            end
                            style={({ isActive }) => ({
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'rgba(108, 92, 231, 0.12)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            })}
                        >
                            📝 Assessments
                        </NavLink>
                        <NavLink
                            to="/student/results"
                            style={({ isActive }) => ({
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'rgba(108, 92, 231, 0.12)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            })}
                        >
                            📊 My Results
                        </NavLink>
                    </nav>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.rollNumber}</div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Content */}
            <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                <Outlet />
            </main>
        </div>
    );
}
