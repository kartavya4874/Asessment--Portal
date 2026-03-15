import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import AnimatedBackground from '../../components/ui/AnimatedBackground';

export default function ResetPassword() {
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !otp || !newPassword || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const { data } = await client.post('/auth/reset-password', {
                email, otp, newPassword,
            });
            toast.success(data.message || 'Password reset successfully!');
            navigate('/student/login');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(124,108,240,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 16px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.3s',
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
                        >🔑</motion.div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Reset Password</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Enter the code from your email and choose a new password
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@geetauniversity.edu.in" style={inputStyle} />
                        </motion.div>
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Reset Code (OTP)</label>
                            <input
                                type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit code" maxLength={6}
                                style={{
                                    ...inputStyle,
                                    textAlign: 'center', fontSize: '24px', fontWeight: 700,
                                    letterSpacing: '8px',
                                    background: 'rgba(124,108,240,0.06)',
                                }}
                            />
                        </motion.div>
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                        </motion.div>
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                        </motion.div>
                        <motion.button
                            type="submit" className="btn-primary" disabled={loading}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            style={{ marginTop: '8px', opacity: loading ? 0.7 : 1, padding: '14px' }}
                        >
                            {loading ? '⏳ Resetting...' : 'Reset Password →'}
                        </motion.button>
                    </form>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Didn't get a code? <Link to="/forgot-password" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Resend</Link>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                        style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/student/login" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Login</Link>
                    </motion.div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
