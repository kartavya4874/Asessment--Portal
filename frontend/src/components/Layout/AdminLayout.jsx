import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/admin/programs', label: 'Programs', icon: '🎓' },
    { path: '/admin/students', label: 'Students', icon: '👥' },
    { path: '/admin/assessments', label: 'Assessments', icon: '📝' },
    { path: '/admin/export', label: 'Export All', icon: '📥' },
];

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) setCollapsed(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 72 : 264 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="glass"
                style={{
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    zIndex: 50,
                }}
            >
                {/* Logo */}
                <div style={{
                    padding: collapsed ? '20px 16px' : '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minHeight: '72px',
                }}>
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
                            flexShrink: 0,
                            boxShadow: '0 4px 15px var(--glow-primary)',
                        }}
                    >
                        🧪
                    </motion.div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div style={{ fontSize: '15px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                    <span className="gradient-text">AI Lab</span> Portal
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Admin Panel</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: collapsed ? '12px 16px' : '12px 16px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(124,108,240,0.12), rgba(78,168,222,0.08))'
                                    : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.25s',
                                whiteSpace: 'nowrap',
                                position: 'relative',
                                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                boxShadow: isActive ? '0 2px 12px var(--glow-primary)' : 'none',
                            })}
                        >
                            <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            background: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: '1px solid var(--border)',
                            marginBottom: '8px',
                            transition: 'all 0.2s',
                        }}
                    >
                        {collapsed ? '→' : '← Collapse'}
                    </button>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            background: 'var(--surface)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: '1px solid var(--border)',
                            marginBottom: '16px',
                            transition: 'all 0.2s',
                        }}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                        {!collapsed && (theme === 'dark' ? ' Light Mode' : ' Dark Mode')}
                    </button>

                    {/* User section */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: collapsed ? '8px 4px' : '10px 14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(78,168,222,0.04))',
                        border: '1px solid rgba(124,108,240,0.1)',
                    }}>
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0,
                            boxShadow: '0 2px 10px var(--glow-primary)',
                        }}>
                            👤
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ flex: 1, overflow: 'hidden' }}
                                >
                                    <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user?.name}
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--error)',
                                            background: 'none',
                                            padding: 0,
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        Logout
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: collapsed ? 72 : 264,
                transition: 'margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                padding: 'clamp(16px, 3vw, 32px)',
                maxWidth: '100%',
                overflow: 'auto',
            }}>
                <Outlet />
            </main>
        </div>
    );
}
