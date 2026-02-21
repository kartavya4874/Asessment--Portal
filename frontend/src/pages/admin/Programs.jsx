import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function Programs() {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProgram, setEditingProgram] = useState(null);
    const [form, setForm] = useState({ name: '', years: '', specializations: '' });

    const fetchPrograms = async () => {
        try {
            const { data } = await client.get('/programs');
            setPrograms(data);
        } catch (err) { toast.error('Failed to load programs'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPrograms(); }, []);

    const resetForm = () => {
        setForm({ name: '', years: '', specializations: '' });
        setEditingProgram(null);
        setShowForm(false);
    };

    const handleEdit = (program) => {
        setEditingProgram(program);
        setForm({
            name: program.name,
            years: program.years.join(', '),
            specializations: program.specializations.join(', '),
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name) { toast.error('Program name is required'); return; }

        const payload = {
            name: form.name.trim(),
            years: form.years.split(',').map(s => s.trim()).filter(Boolean),
            specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
        };

        try {
            if (editingProgram) {
                await client.put(`/programs/${editingProgram.id}`, payload);
                toast.success('Program updated!');
            } else {
                await client.post('/programs', payload);
                toast.success('Program created!');
            }
            resetForm();
            fetchPrograms();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this program? This cannot be undone.')) return;
        try {
            await client.delete(`/programs/${id}`);
            toast.success('Program deleted');
            fetchPrograms();
        } catch (err) { toast.error('Failed to delete'); }
    };

    return (
        <PageTransition>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Programs</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Manage academic programs</p>
                    </div>
                    <motion.button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        ➕ Add Program
                    </motion.button>
                </div>

                {/* Form Modal */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="card"
                            style={{ marginBottom: '24px' }}
                        >
                            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                                {editingProgram ? 'Edit Program' : 'Create Program'}
                            </h2>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Program Name</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., B.Tech, MCA, MBA" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Years/Semesters (comma-separated)</label>
                                    <input value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} placeholder="e.g., 1st Year, 2nd Year, 3rd Year, 4th Year" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Specializations (comma-separated)</label>
                                    <input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} placeholder="e.g., CSE-AI, Data Science, Cybersecurity" style={{ width: '100%' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }}>
                                        {editingProgram ? 'Update' : 'Create'}
                                    </motion.button>
                                    <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Programs List */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : programs.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Programs Yet</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Create your first program to get started.</p>
                    </div>
                ) : (
                    <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {programs.map(program => (
                            <StaggerItem key={program.id}>
                                <motion.div className="card" whileHover={{ y: -2 }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{program.name}</h3>

                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Years</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {program.years.map(y => (
                                                <span key={y} style={{ padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>{y}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specializations</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {program.specializations.map(s => (
                                                <span key={s} style={{ padding: '4px 10px', background: 'rgba(108,92,231,0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-primary)' }}>{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-secondary" onClick={() => handleEdit(program)} style={{ flex: 1, padding: '8px', fontSize: '13px' }}>✏️ Edit</button>
                                        <button className="btn-danger" onClick={() => handleDelete(program.id)} style={{ padding: '8px 16px', fontSize: '13px' }}>🗑️</button>
                                    </div>
                                </motion.div>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                )}
            </div>
        </PageTransition>
    );
}
