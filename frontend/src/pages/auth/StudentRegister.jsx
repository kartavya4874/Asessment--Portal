import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import AnimatedBackground from '../../components/ui/AnimatedBackground';
import { getErrorDetail } from '../../utils/errorHandler';

export default function StudentRegister() {
    const [form, setForm] = useState({
        name: '', rollNumber: '', email: '', programId: '', specialization: '', year: '', password: '', confirmPassword: '',
    });
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        client.get('/programs').then(res => setPrograms(res.data)).catch(() => { });
    }, []);

    const handleChange = (e) => {
        const updated = { ...form, [e.target.name]: e.target.value };
        if (e.target.name === 'programId') {
            const prog = programs.find(p => p.id === e.target.value);
            setSelectedProgram(prog);
            updated.specialization = '';
            updated.year = '';
        }
        setForm(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.rollNumber || !form.email || !form.programId || !form.specialization || !form.year || !form.password) {
            toast.error('Please fill in all fields'); return;
        }
        if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
        if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

        setLoading(true);
        try {
            const { data } = await client.post('/auth/student/register', {
                name: form.name, rollNumber: form.rollNumber, email: form.email,
                programId: form.programId, specialization: form.specialization,
                year: form.year, password: form.password,
            });
            login(data.token, data.user);
            toast.success('Registered successfully!');
            navigate('/student');
        } catch (err) {
            toast.error(getErrorDetail(err, 'Registration failed'));
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(78,168,222,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '13px 16px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.3s',
    };

    const labelStyle = {
        display: 'block', fontSize: '13px', color: 'var(--text-secondary)',
        marginBottom: '8px', fontWeight: 600,
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
                        width: '100%', maxWidth: '520px', borderRadius: '20px', padding: 'clamp(24px, 5vw, 44px)',
                        position: 'relative', zIndex: 1, background: 'var(--surface)',
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontSize: '44px', marginBottom: '16px', filter: 'drop-shadow(0 4px 15px var(--glow-secondary))' }}
                        >🎓</motion.div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                            <span className="gradient-text">Student Registration</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Join your program</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                                <label style={labelStyle}>Full Name</label>
                                <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" style={inputStyle} />
                            </motion.div>
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                <label style={labelStyle}>Roll Number</label>
                                <input name="rollNumber" value={form.rollNumber} onChange={handleChange} placeholder="e.g., 2024BCS001" style={inputStyle} />
                            </motion.div>
                        </div>
                        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                            <label style={labelStyle}>Email</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@geetauniversity.edu.in" style={inputStyle} />
                        </motion.div>
                        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                            <label style={labelStyle}>Program</label>
                            <select name="programId" value={form.programId} onChange={handleChange} style={inputStyle}>
                                <option value="">Select Program</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </motion.div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
                                <label style={labelStyle}>Specialization</label>
                                <select name="specialization" value={form.specialization} onChange={handleChange} style={inputStyle} disabled={!selectedProgram}>
                                    <option value="">Select Specialization</option>
                                    {selectedProgram?.specializations?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </motion.div>
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                                <label style={labelStyle}>Semester</label>
                                <select name="year" value={form.year} onChange={handleChange} style={inputStyle} disabled={!selectedProgram}>
                                    <option value="">Select Semester</option>
                                    {selectedProgram?.years?.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </motion.div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
                                <label style={labelStyle}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Min 6 chars" style={inputStyle} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', padding: '4px',
                                    }}>{showPassword ? '🙈' : '👁️'}</button>
                                </div>
                            </motion.div>
                            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                                <label style={labelStyle}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" style={inputStyle} />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', padding: '4px',
                                    }}>{showConfirm ? '🙈' : '👁️'}</button>
                                </div>
                            </motion.div>
                        </div>
                        <motion.button
                            type="submit" className="btn-primary" disabled={loading}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.55 }}
                            style={{ marginTop: '8px', opacity: loading ? 0.7 : 1, padding: '14px' }}
                        >
                            {loading ? '⏳ Creating...' : 'Create Account →'}
                        </motion.button>
                    </form>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Already registered? <Link to="/student/login" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Sign In</Link>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                        style={{ textAlign: 'center', marginTop: '12px' }}>
                        <Link to="/" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>← Back to Home</Link>
                    </motion.div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
