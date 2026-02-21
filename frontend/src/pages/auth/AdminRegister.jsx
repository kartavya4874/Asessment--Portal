import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';

export default function AdminRegister() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            toast.error('Please fill in all fields');
            return;
        }
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const { data } = await client.post('/auth/admin/register', {
                name: form.name,
                email: form.email,
                password: form.password,
            });
            login(data.token, data.user);
            toast.success('Account created successfully!');
            navigate('/admin');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 70%)',
            }}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="glass"
                    style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '40px' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧪</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Admin Register</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create your trainer account</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Full Name</label>
                            <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="trainer@geetauniversity.edu.in" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Confirm Password</label>
                            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" style={{ width: '100%' }} />
                        </div>
                        <motion.button type="submit" className="btn-primary" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Creating...' : 'Create Account'}
                        </motion.button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Already have an account? <Link to="/admin/login" style={{ fontWeight: 600 }}>Sign In</Link>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Home</Link>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
