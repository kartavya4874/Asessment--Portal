import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';

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
            // Navigate to reset page with the email pre-filled
            setTimeout(() => navigate('/reset-password', { state: { email } }), 2000);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Something went wrong');
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
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Forgot Password</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Enter your email and we'll send you a reset code
                        </p>
                    </div>

                    {!sent ? (
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
                            <motion.button type="submit" className="btn-primary" disabled={loading}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{ marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </motion.button>
                        </form>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: 'center', padding: '24px 0' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px',
                                background: 'rgba(108, 92, 231, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '28px',
                            }}>✉️</div>
                            <p style={{ fontWeight: 600, marginBottom: '8px' }}>Check your inbox!</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                Redirecting to reset page...
                            </p>
                        </motion.div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Remember your password? <Link to="/student/login" style={{ fontWeight: 600 }}>Sign In</Link>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Home</Link>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
