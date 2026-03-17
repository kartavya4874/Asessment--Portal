import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import AnimatedBackground from '../../components/ui/AnimatedBackground';
import { getErrorDetail } from '../../utils/errorHandler';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) { toast.error('Please enter your email'); return; }
        setLoading(true);
        try {
            await client.post('/auth/forgot-password', { email });
            setSent(true);
            toast.success('If that email is registered, a reset code has been sent.');
            setTimeout(() => navigate('/reset-password', { state: { email } }), 2000);
        } catch (err) {
            toast.error(getErrorDetail(err, 'Something went wrong'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden',
            }}>
                <AnimatedBackground variant="auth" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="card-glow"
                    style={{
                        width: '100%', maxWidth: '440px', borderRadius: '20px', padding: 'clamp(24px, 5vw, 44px)',
                        position: 'relative', zIndex: 1, background: 'var(--surface)',
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: '44px', marginBottom: '16px', filter: 'drop-shadow(0 4px 15px var(--glow-primary))' }}
                        >🔐</motion.div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Forgot Password</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Enter your email and we'll send you a reset code
                        </p>
                    </div>

                    {!sent ? (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="student@geetauniversity.edu.in"
                                    style={{ width: '100%' }}
                                />
                            </motion.div>
                            <motion.button
                                type="submit" className="btn-primary" disabled={loading}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                style={{ marginTop: '8px', opacity: loading ? 0.7 : 1, padding: '14px' }}
                            >
                                {loading ? '⏳ Sending...' : 'Send Reset Code →'}
                            </motion.button>
                        </form>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            style={{ textAlign: 'center', padding: '24px 0' }}>
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{
                                    width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
                                    background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '32px', boxShadow: '0 8px 30px var(--glow-primary)',
                                }}
                            >✉️</motion.div>
                            <p style={{ fontWeight: 700, marginBottom: '8px', fontSize: '16px' }}>Check your inbox!</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                Redirecting to reset page...
                            </p>
                        </motion.div>
                    )}

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Remember your password? <Link to="/student/login" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Sign In</Link>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Home</Link>
                    </motion.div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
