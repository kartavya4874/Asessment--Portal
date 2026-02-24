import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';

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
                email,
                otp,
                newPassword,
            });
            toast.success(data.message || 'Password reset successfully!');
            navigate('/student/login');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 70%)',
            }}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
                    className="glass" style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔑</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Reset Password</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Enter the code from your email and choose a new password
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="student@geetauniversity.edu.in"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reset Code (OTP)</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    letterSpacing: '8px',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <motion.button type="submit" className="btn-primary" disabled={loading}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            style={{ marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </motion.button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Didn't get a code? <Link to="/forgot-password" style={{ fontWeight: 600 }}>Resend</Link>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/student/login" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Login</Link>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
