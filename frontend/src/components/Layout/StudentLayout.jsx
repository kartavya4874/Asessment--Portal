import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Top Nav */}
            <header className="glass" style={{
                borderBottom: '1px solid var(--border)',
                padding: '0 clamp(12px, 3vw, 32px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '60px',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                flexWrap: 'wrap',
                gap: '8px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid), var(--gradient-end))',
                            backgroundSize: '200% 200%',
                            animation: 'gradient-shift 4s ease infinite',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: '0 4px 15px var(--glow-primary)',
                        }}
                    >
                        🧪
                    </motion.div>
                    <span style={{ fontWeight: 800, fontSize: '16px' }}>
                        <span className="gradient-text">AI Lab</span> Portal
                    </span>

                    <nav style={{ display: 'flex', gap: '4px', marginLeft: '24px' }}>
                        <NavLink
                            to="/student"
                            end
                            style={({ isActive }) => ({
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(124,108,240,0.12), rgba(78,168,222,0.08))'
                                    : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.25s',
                                boxShadow: isActive ? '0 2px 12px var(--glow-primary)' : 'none',
                                position: 'relative',
                            })}
                        >
                            📝 Assessments
                        </NavLink>
                        <NavLink
                            to="/student/results"
                            style={({ isActive }) => ({
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(124,108,240,0.12), rgba(78,168,222,0.08))'
                                    : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.25s',
                                boxShadow: isActive ? '0 2px 12px var(--glow-primary)' : 'none',
                            })}
                        >
                            📊 My Results
                        </NavLink>
                    </nav>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Theme Toggle */}
                    <motion.button
                        onClick={toggleTheme}
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'var(--surface)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s',
                        }}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </motion.button>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '6px 14px 6px 6px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(78,168,222,0.04))',
                        border: '1px solid rgba(124,108,240,0.1)',
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', boxShadow: '0 2px 8px var(--glow-primary)',
                        }}>🎓</div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.rollNumber}</div>
                        </div>
                    </div>

                    <motion.button
                        onClick={handleLogout}
                        className="btn-secondary"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ padding: '8px 18px', fontSize: '13px' }}
                    >
                        Logout
                    </motion.button>
                </div>
            </header>

            {/* Content */}
            <main style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: '1200px', margin: '0 auto' }}>
                <Outlet />
            </main>
        </div>
    );
}
