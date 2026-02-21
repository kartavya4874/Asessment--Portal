import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/ui/PageTransition';

export default function LandingPage() {
    return (
        <PageTransition>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 50%, #0a0a14 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                    width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(108,92,231,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Logo */}
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    style={{ marginBottom: '16px' }}
                >
                    <div style={{
                        width: 80, height: 80, borderRadius: '20px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '40px', boxShadow: '0 20px 60px rgba(108,92,231,0.3)',
                    }}>
                        🧪
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    style={{
                        fontSize: '48px', fontWeight: 800, textAlign: 'center',
                        marginBottom: '12px', lineHeight: 1.1,
                    }}
                >
                    <span className="gradient-text">AI Lab</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>Assessment Portal</span>
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.6 }}
                    style={{
                        fontSize: '18px', color: 'var(--text-secondary)',
                        textAlign: 'center', maxWidth: '500px', lineHeight: 1.6, marginBottom: '48px',
                    }}
                >
                    Geeta University's AI Training Lab — Manage assessments, submit work, and track your progress.
                </motion.p>

                {/* Action Cards */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}
                >
                    <Link to="/admin/login" style={{ textDecoration: 'none' }}>
                        <motion.div
                            className="glass glass-hover"
                            whileHover={{ y: -6, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '260px', padding: '36px 28px', borderRadius: '16px',
                                textAlign: 'center', cursor: 'pointer',
                            }}
                        >
                            <div style={{ fontSize: '42px', marginBottom: '16px' }}>👨‍🏫</div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Trainer</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Create & manage programs, assessments, and grade student submissions
                            </p>
                            <div style={{
                                marginTop: '20px', padding: '10px 20px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'white', fontWeight: 600, fontSize: '14px',
                            }}>
                                Admin Login →
                            </div>
                        </motion.div>
                    </Link>

                    <Link to="/student/login" style={{ textDecoration: 'none' }}>
                        <motion.div
                            className="glass glass-hover"
                            whileHover={{ y: -6, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '260px', padding: '36px 28px', borderRadius: '16px',
                                textAlign: 'center', cursor: 'pointer',
                            }}
                        >
                            <div style={{ fontSize: '42px', marginBottom: '16px' }}>🎓</div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Student</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                View assessments, submit your work, and check your marks & feedback
                            </p>
                            <div style={{
                                marginTop: '20px', padding: '10px 20px', borderRadius: '8px',
                                border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)',
                                fontWeight: 600, fontSize: '14px',
                            }}>
                                Student Login →
                            </div>
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    style={{ position: 'absolute', bottom: '24px', fontSize: '12px', color: 'var(--text-secondary)' }}
                >
                    © {new Date().getFullYear()} Geeta University — AI Training Lab
                </motion.div>
            </div>
        </PageTransition>
    );
}
