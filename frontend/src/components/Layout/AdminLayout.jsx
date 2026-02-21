import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/admin/programs', label: 'Programs', icon: '🎓' },
    { path: '/admin/assessments', label: 'Assessments', icon: '📝' },
    { path: '/admin/export', label: 'Export All', icon: '📥' },
];

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 68 : 260 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{
                    background: 'var(--bg-secondary)',
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
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                    }}>
                        🧪
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>AI Lab Portal</div>
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
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'rgba(108, 92, 231, 0.12)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
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
                            borderRadius: '8px',
                            background: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: '1px solid var(--border)',
                            marginBottom: '8px',
                        }}
                    >
                        {collapsed ? '→' : '← Collapse'}
                    </button>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: collapsed ? '8px 4px' : '8px 12px',
                        borderRadius: '10px',
                        background: 'var(--surface)',
                    }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0,
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
                marginLeft: collapsed ? 68 : 260,
                transition: 'margin-left 0.3s ease-in-out',
                padding: '32px',
                maxWidth: '100%',
                overflow: 'auto',
            }}>
                <Outlet />
            </main>
        </div>
    );
}
