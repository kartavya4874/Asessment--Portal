import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';

export default function StudentLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

    return (
        <PageTransition>
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px', background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 70%)',
            }}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
                    className="glass" style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Student Login</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>AI Lab Assessment Portal</p>
                    </div>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@geetauniversity.edu.in" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%' }} />
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                            <Link to="/forgot-password" style={{ fontSize: '12px', color: '#6c5ce7', fontWeight: 600 }}>Forgot Password?</Link>
                        </div>
                        <motion.button type="submit" className="btn-primary" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </motion.button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Don't have an account? <Link to="/student/register" style={{ fontWeight: 600 }}>Register</Link>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Home</Link>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
