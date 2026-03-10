import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export default function Students() {
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [filterProgram, setFilterProgram] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({ name: '', rollNumber: '', email: '', programId: '', specialization: '', year: '', password: '' });

    useEffect(() => {
        client.get('/programs').then(res => setPrograms(res.data)).catch(() => { });
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterProgram) params.programId = filterProgram;
            if (search.trim()) params.search = search.trim();
            const { data } = await client.get('/students', { params });
            setStudents(data);
        } catch { toast.error('Failed to load students'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const debounce = setTimeout(fetchStudents, 300);
        return () => clearTimeout(debounce);
    }, [filterProgram, search]);

    const getProgramName = (id) => programs.find(p => p.id === id)?.name || 'Unknown';
    const getProgram = (id) => programs.find(p => p.id === id);

    const openAddModal = () => {
        setEditingStudent(null);
        setForm({ name: '', rollNumber: '', email: '', programId: '', specialization: '', year: '', password: '' });
        setShowModal(true);
    };

    const openEditModal = (student) => {
        setEditingStudent(student);
        setForm({
            name: student.name,
            rollNumber: student.rollNumber,
            email: student.email,
            programId: student.programId,
            specialization: student.specialization,
            year: student.year,
            password: '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.rollNumber || !form.email || !form.programId || !form.specialization || !form.year) {
            toast.error('Please fill all required fields');
            return;
        }
        if (!editingStudent && !form.password) {
            toast.error('Password is required for new students');
            return;
        }

        setSaving(true);
        try {
            if (editingStudent) {
                const updateData = {
                    name: form.name,
                    rollNumber: form.rollNumber,
                    email: form.email,
                    programId: form.programId,
                    specialization: form.specialization,
                    year: form.year,
                };
                await client.put(`/students/${editingStudent.id}`, updateData);
                toast.success('Student updated!');
            } else {
                await client.post('/students', form);
                toast.success('Student created!');
            }
            setShowModal(false);
            fetchStudents();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (studentId) => {
        setSaving(true);
        try {
            await client.delete(`/students/${studentId}`);
            toast.success('Student removed');
            setShowDeleteConfirm(null);
            fetchStudents();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete');
        } finally {
            setSaving(false);
        }
    };

    const selectedProgram = getProgram(form.programId);

    return (
        <PageTransition>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Students</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Manage student accounts</p>
                    </div>
                    <motion.button className="btn-primary" onClick={openAddModal} whileHover={{ scale: 1.03 }}>
                        ➕ Add Student
                    </motion.button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Search by name, roll number, or email..."
                        style={{ flex: 1, minWidth: '240px', padding: '10px 14px' }}
                    />
                    <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} style={{ padding: '10px 14px', minWidth: '180px' }}>
                        <option value="">All Programs</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {/* Stats */}
                {!loading && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Showing {students.length} student{students.length !== 1 ? 's' : ''}
                        {filterProgram ? ` in ${getProgramName(filterProgram)}` : ''}
                        {search ? ` matching "${search}"` : ''}
                    </div>
                )}

                {/* Table */}
                {loading ? <SkeletonTable rows={8} /> : students.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Students Found</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {search ? 'Try a different search.' : 'Add a student to get started.'}
                        </p>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        {['Roll No', 'Name', 'Email', 'Program', 'Specialization', 'Year', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.rollNumber}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <a
                                                    style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}
                                                    onClick={() => navigate(`/admin/students/${student.id}`)}
                                                    title="View student dashboard"
                                                >
                                                    {student.name} →
                                                </a>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>{student.email}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: '12px', padding: '3px 8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                                    {getProgramName(student.programId)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{student.specialization}</td>
                                            <td style={{ padding: '12px 16px' }}>{student.year}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button className="btn-secondary" onClick={() => openEditModal(student)} style={{ padding: '5px 10px', fontSize: '12px' }}>✏️</button>
                                                    <button className="btn-secondary" onClick={() => setShowDeleteConfirm(student)} style={{ padding: '5px 10px', fontSize: '12px', borderColor: 'var(--error)', color: 'var(--error)' }}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Add/Edit Modal */}
                <AnimatePresence>
                    {showModal && (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        }} onClick={() => setShowModal(false)}>
                            <motion.div
                                className="card"
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                style={{ maxWidth: '520px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                                    {editingStudent ? '✏️ Edit Student' : '➕ Add Student'}
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name *</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={{ width: '100%' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Roll Number *</label>
                                            <input value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} placeholder="e.g. 2201001" style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Email *</label>
                                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="student@email.com" style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Program *</label>
                                        <select value={form.programId} onChange={e => setForm({ ...form, programId: e.target.value, specialization: '', year: '' })} style={{ width: '100%' }}>
                                            <option value="">Select Program</option>
                                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    {selectedProgram && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Specialization *</label>
                                                <select value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} style={{ width: '100%' }}>
                                                    <option value="">Select</option>
                                                    {selectedProgram.specializations?.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Year/Semester *</label>
                                                <select value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} style={{ width: '100%' }}>
                                                    <option value="">Select</option>
                                                    {selectedProgram.years?.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    {!editingStudent && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Password *</label>
                                            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Set password" style={{ width: '100%' }} />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                    <motion.button className="btn-secondary" onClick={() => setShowModal(false)} whileHover={{ scale: 1.03 }}>Cancel</motion.button>
                                    <motion.button className="btn-primary" onClick={handleSave} disabled={saving} whileHover={{ scale: 1.03 }}>
                                        {saving ? '⏳ Saving...' : editingStudent ? '💾 Update' : '➕ Create'}
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        }} onClick={() => setShowDeleteConfirm(null)}>
                            <motion.div
                                className="card"
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                style={{ maxWidth: '420px', width: '90%', textAlign: 'center' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Remove Student?</h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                    This will permanently remove <strong>{showDeleteConfirm.name}</strong> ({showDeleteConfirm.rollNumber}) and all their submissions.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <motion.button className="btn-secondary" onClick={() => setShowDeleteConfirm(null)} whileHover={{ scale: 1.03 }}>Cancel</motion.button>
                                    <motion.button className="btn-primary" onClick={() => handleDelete(showDeleteConfirm.id)} disabled={saving} whileHover={{ scale: 1.03 }} style={{ background: 'var(--error)' }}>
                                        {saving ? 'Removing...' : '🗑️ Yes, Remove'}
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
