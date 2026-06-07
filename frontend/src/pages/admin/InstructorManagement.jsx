import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function InstructorManagement() {
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchInstructors();
    }, []);

    const fetchInstructors = async () => {
        try {
            const res = await client.get('/auth/instructors');
            setInstructors(res.data);
        } catch (err) {
            toast.error('Failed to load instructors');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email required');
        if (!editing && !form.password.trim()) return toast.error('Password required for new instructor');

        setSaving(true);
        try {
            if (editing) {
                const payload = { name: form.name, email: form.email };
                if (form.password.trim()) payload.password = form.password;
                await client.put(`/auth/instructors/${editing.id}`, payload);
                toast.success('Instructor updated');
            } else {
                await client.post('/auth/instructors', form);
                toast.success('Instructor created');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', email: '', password: '' });
            fetchInstructors();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (instructor) => {
        setEditing(instructor);
        setForm({ name: instructor.name, email: instructor.email, password: '' });
        setShowModal(true);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete instructor "${name}"? This cannot be undone.`)) return;
        try {
            await client.delete(`/auth/instructors/${id}`);
            toast.success('Instructor deleted');
            fetchInstructors();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const filteredInstructors = instructors.filter(i => {
        const q = searchQuery.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q);
    });

    const superAdmins = filteredInstructors.filter(i => i.adminRole === 'super_admin');
    const regularInstructors = filteredInstructors.filter(i => i.adminRole !== 'super_admin');

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '16px' }} />
                ))}
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800 }}>
                        <span className="gradient-text">👥 Instructor</span> Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        Create and manage instructor accounts
                    </p>
                </div>
                <motion.button
                    className="btn-primary"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '' }); setShowModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    ➕ Add Instructor
                </motion.button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Accounts', value: instructors.length, icon: '👥', color: 'var(--accent-primary)' },
                    { label: 'Super Admins', value: instructors.filter(i => i.adminRole === 'super_admin').length, icon: '👑', color: 'var(--warning)' },
                    { label: 'Instructors', value: instructors.filter(i => i.adminRole !== 'super_admin').length, icon: '🎓', color: 'var(--success)' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} className="card-glow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{stat.label}</div>
                                <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800, color: stat.color, marginTop: '6px' }}>{stat.value}</div>
                            </div>
                            <span style={{ fontSize: '28px' }}>{stat.icon}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="🔍 Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: '360px', marginBottom: '20px' }}
            />

            {/* Super Admins Section */}
            {superAdmins.length > 0 && (
                <>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                        👑 Super Admins
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                        {superAdmins.map((inst, i) => (
                            <motion.div key={inst.id} className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '20px', boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                                    }}>👑</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{inst.name}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{inst.email}</div>
                                    </div>
                                </div>
                                <span className="badge" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>
                                    Super Admin
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}

            {/* Instructors Section */}
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                🎓 Instructors
            </h3>
            {regularInstructors.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Instructors Yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Create your first instructor account to get started
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {regularInstructors.map((inst, i) => (
                        <motion.div key={inst.id} className="card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '18px', color: '#fff', fontWeight: 700,
                                }}>{inst.name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{inst.name}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{inst.email}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Joined {formatDate(inst.createdAt)}
                                </span>
                                <motion.button className="btn-secondary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEdit(inst)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                    ✏️ Edit
                                </motion.button>
                                <motion.button className="btn-danger" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDelete(inst.id, inst.name)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                    🗑️
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
                        }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            className="card-glow"
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '440px' }}
                        >
                            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>
                                <span className="gradient-text">{editing ? 'Edit' : 'Add'}</span> Instructor
                            </h2>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Full Name</label>
                                    <input type="text" placeholder="e.g., Dr. Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email</label>
                                    <input type="email" placeholder="instructor@college.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                        Password {editing && <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(leave blank to keep current)</span>}
                                    </label>
                                    <input type="password" placeholder={editing ? '••••••••' : 'Enter password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} style={{ flex: 1 }}>
                                        {saving ? '⏳ Saving...' : editing ? '✅ Update' : '🚀 Create'}
                                    </motion.button>
                                    <motion.button type="button" className="btn-secondary" onClick={() => { setShowModal(false); setEditing(null); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        Cancel
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
