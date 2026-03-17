import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import AnimatedBackground from '../../components/ui/AnimatedBackground';

export default function StudentLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill in all fields'); return; }
        setLoading(true);
        try {
            const { data } = await client.post('/auth/student/login', { email, password });
            login(data.token, data.user);
            toast.success('Welcome back!');
            navigate('/student');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(78,168,222,0.04)',
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
                            style={{
                                fontSize: '44px', marginBottom: '16px',
                                filter: 'drop-shadow(0 4px 15px var(--glow-secondary))',
                            }}
                        >🎓</motion.div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Student Login</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>AI Lab Assessment Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@geetauniversity.edu.in" style={inputStyle} />
                        </motion.div>
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', padding: '4px',
                                }}>{showPassword ? '🙈' : '👁️'}</button>
                            </div>
                        </motion.div>
                        <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                            <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>Forgot Password?</Link>
                        </div>
                        <motion.button
                            type="submit" className="btn-primary" disabled={loading}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            style={{ marginTop: '8px', opacity: loading ? 0.7 : 1, padding: '14px' }}
                        >
                            {loading ? '⏳ Signing in...' : 'Sign In →'}
                        </motion.button>
                    </form>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                        style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}
                    >
                        Don't have an account?{' '}
                        <Link to="/student/register" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Register</Link>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        style={{ textAlign: 'center', marginTop: '12px' }}
                    >
                        <Link to="/" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Home</Link>
                    </motion.div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
