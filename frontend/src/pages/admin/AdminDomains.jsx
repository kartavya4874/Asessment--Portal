import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard, SkeletonTable } from '../../components/ui/SkeletonLoader';
import { getErrorDetail } from '../../utils/errorHandler';

export default function AdminDomains() {
    const [domains, setDomains] = useState([]);
    const [students, setStudents] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'enrollments'
    const { user } = useAuth();
    const isSuperAdmin = user?.email === 'admin@geetauniversity.edu.in';

    // Form state for creating a new domain
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', code: '' });

    // Modals
    const [allocationModal, setAllocationModal] = useState(null); // domain object to assign instructors
    const [studentModal, setStudentModal] = useState(null); // student object to manage domain enrollments
    const [savingAllocation, setSavingAllocation] = useState(false);

    // Selected state in modals
    const [selectedInstructors, setSelectedInstructors] = useState([]);

    // Filter/Search states
    const [enrollmentSearch, setEnrollmentSearch] = useState('');
    const [enrollmentFilterDomain, setEnrollmentFilterDomain] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [domainsRes, studentsRes] = await Promise.all([
                client.get('/domains'),
                client.get('/domains/admin/students')
            ]);
            setDomains(domainsRes.data);
            setStudents(studentsRes.data);

            if (user?.email === 'admin@geetauniversity.edu.in') {
                const instructorsRes = await client.get('/auth/instructors');
                setInstructors(instructorsRes.data);
            }
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setForm({ name: '', description: '', code: '' });
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.code || !form.description) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            await client.post('/domains', form);
            toast.success('Subject/Domain track created successfully!');
            resetForm();
            fetchData();
        } catch (err) {
            toast.error(getErrorDetail(err, 'Failed to create track'));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this Subject/Domain track? All students enrolled in it will be opted out.')) return;
        try {
            await client.delete(`/domains/${id}`);
            toast.success('Subject/Domain track deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete track');
        }
    };

    // Instructor Allocation Save
    const saveInstructorAllocation = async () => {
        if (!allocationModal) return;
        setSavingAllocation(true);
        try {
            await client.post(`/domains/${allocationModal.id}/assign-instructors`, {
                instructorIds: selectedInstructors
            });
            toast.success('Instructors allocated successfully!');
            setAllocationModal(null);
            fetchData();
        } catch (err) {
            toast.error('Failed to allocate instructors');
        } finally {
            setSavingAllocation(false);
        }
    };

    // Toggle single student domain enrollment
    const handleStudentDomainToggle = async (studentId, domainId, currentlyEnrolled) => {
        try {
            if (currentlyEnrolled) {
                await client.post('/domains/admin/disenroll', { studentId, domainId });
                toast.success('Student removed from subject/domain');
            } else {
                await client.post('/domains/admin/enroll', { studentId, domainId });
                toast.success('Student enrolled in subject/domain');
            }
            // Update local modal data and refresh roster
            setStudents(prev => prev.map(s => {
                if (s.id === studentId) {
                    const nextEnrolled = currentlyEnrolled
                        ? s.enrolledSubjects.filter(id => id !== domainId)
                        : [...s.enrolledSubjects, domainId];
                    return { ...s, enrolledSubjects: nextEnrolled };
                }
                return s;
            }));
            // Refresh complete data
            const res = await client.get('/domains/admin/students');
            setStudents(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to toggle student enrollment');
        }
    };

    const getDomainName = (id) => domains.find(d => d.id === id)?.name || 'Unknown';
    const getInstructorNames = (ids) => {
        if (!ids || ids.length === 0) return 'None';
        return ids.map(id => instructors.find(i => i.id === id)?.name || 'Instructor').join(', ');
    };

    // Filter students based on search and selected domain
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
            student.rollNumber.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
            student.email.toLowerCase().includes(enrollmentSearch.toLowerCase());
        
        const matchesDomain = enrollmentFilterDomain ? student.enrolledSubjects?.includes(enrollmentFilterDomain) : true;
        return matchesSearch && matchesDomain;
    });

    const inputStyle = {
        width: '100%',
        background: 'rgba(124,108,240,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '13px 16px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.3s',
    };

    return (
        <PageTransition>
            <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">Subject & Domain Tracks</span></h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Manage subjects, instructor allocations, and student enrollments</p>
                    </div>
                    {isSuperAdmin && activeTab === 'manage' && (
                        <motion.button
                            className="btn-primary"
                            onClick={() => { resetForm(); setShowForm(true); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            ➕ Add Track
                        </motion.button>
                    )}
                </div>

                {/* Tabs switcher */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '16px' }}>
                    <button
                        onClick={() => setActiveTab('manage')}
                        style={{
                            padding: '12px 8px',
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'manage' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '15px',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'manage' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        🎯 Manage Tracks
                    </button>
                    <button
                        onClick={() => setActiveTab('enrollments')}
                        style={{
                            padding: '12px 8px',
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'enrollments' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '15px',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'enrollments' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        👥 Student Enrollments ({students.length})
                    </button>
                </div>

                {/* Manage Tab Content */}
                {activeTab === 'manage' && (
                    <div>
                        {/* Create form */}
                        <AnimatePresence>
                            {showForm && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.97 }}
                                    className="card-glow"
                                    style={{ marginBottom: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '28px' }}
                                >
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>➕ Create Subject / Domain Track</h2>
                                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Track Name</label>
                                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Graphic Design, SEO, Web Development" style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Track Code</label>
                                                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., GD-101, SEO-202" style={inputStyle} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Description</label>
                                            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain the focus, objectives, and syllabus..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }}>Create Track</motion.button>
                                            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* List domains */}
                        {loading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : domains.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                                <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎯</div>
                                <h3 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: 700 }}>No Subject/Domain Tracks Yet</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>Create track offerings to let students register and enroll.</p>
                            </div>
                        ) : (
                            <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {domains.map(domain => (
                                    <StaggerItem key={domain.id}>
                                        <motion.div className="card" whileHover={{ y: -4, scale: 1.01 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px',
                                                paddingBottom: '12px', borderBottom: '1px solid var(--border)',
                                            }}>
                                                <div style={{
                                                    width: 38, height: 38, borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '18px', boxShadow: '0 4px 12px var(--glow-primary)',
                                                }}>🎯</div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{domain.name}</h3>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{domain.code}</span>
                                                </div>
                                            </div>

                                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, flex: 1, marginBottom: '16px' }}>
                                                {domain.description}
                                            </p>

                                            <div style={{
                                                padding: '10px 12px',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                marginBottom: '16px'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>👑 Allocated Instructors:</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                    {getInstructorNames(domain.instructors)}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <motion.button
                                                    className="btn-primary"
                                                    onClick={() => window.location.href = `/admin/workspace/${domain.id}`}
                                                    whileHover={{ scale: 1.03 }}
                                                    style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                                                >
                                                    📂 Workspace
                                                </motion.button>
                                                {isSuperAdmin && (
                                                    <>
                                                        <motion.button
                                                            className="btn-secondary"
                                                            onClick={() => {
                                                                setAllocationModal(domain);
                                                                setSelectedInstructors(domain.instructors || []);
                                                            }}
                                                            whileHover={{ scale: 1.03 }}
                                                            style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                                                        >
                                                            👑 Allocations
                                                        </motion.button>
                                                        <motion.button
                                                            className="btn-danger"
                                                            onClick={() => handleDelete(domain.id)}
                                                            whileHover={{ scale: 1.03 }}
                                                            style={{ padding: '10px', fontSize: '13px' }}
                                                        >
                                                            🗑️ Delete
                                                        </motion.button>
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    </StaggerItem>
                                ))}
                            </StaggerContainer>
                        )}
                    </div>
                )}

                {/* Student Enrollments Tab Content */}
                {activeTab === 'enrollments' && (
                    <div>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <input
                                value={enrollmentSearch}
                                onChange={e => setEnrollmentSearch(e.target.value)}
                                placeholder="🔍 Search students by name, roll, or email..."
                                style={{ flex: 1, minWidth: '240px', padding: '10px 14px' }}
                            />
                            <select
                                value={enrollmentFilterDomain}
                                onChange={e => setEnrollmentFilterDomain(e.target.value)}
                                style={{ padding: '10px 14px', minWidth: '180px' }}
                            >
                                <option value="">All Domain Tracks</option>
                                {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        {/* List */}
                        {loading ? (
                            <SkeletonTable rows={8} />
                        ) : filteredStudents.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Enrollments Found</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>No student records match the search or selected filters.</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="table-responsive">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                                {['Roll No', 'Name', 'Email', 'Profile Registered', 'Interest Level', 'Primary Goal', 'Enrolled Tracks', ...(isSuperAdmin ? ['Action'] : [])].map(h => (
                                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map(student => (
                                                <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.rollNumber}</td>
                                                    <td style={{ padding: '12px 16px' }}>{student.name}</td>
                                                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>{student.email}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        {student.domainRegistered ? (
                                                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Yes</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>{student.domainPreferences?.interestLevel || '—'}</td>
                                                    <td style={{ padding: '12px 16px' }}>{student.domainPreferences?.primaryGoal || '—'}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {student.enrolledSubjects?.length > 0 ? (
                                                                student.enrolledSubjects.map(sid => (
                                                                    <span
                                                                        key={sid}
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            padding: '3px 8px',
                                                                            background: 'linear-gradient(135deg, rgba(124,108,240,0.1), rgba(78,168,222,0.08))',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--accent-primary)',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {getDomainName(sid)}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No Enrollments</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <button
                                                            onClick={() => setStudentModal(student)}
                                                            className="btn-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '12px', display: isSuperAdmin ? 'inline-block' : 'none' }}
                                                        >
                                                            📝 Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL 1: Instructor Allocation Modal */}
                <AnimatePresence>
                    {allocationModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="card-glow"
                                style={{
                                    background: 'var(--surface)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    width: '100%',
                                    maxWidth: '460px',
                                    padding: '24px'
                                }}
                            >
                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                                    👑 Allocate Instructors
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Select instructors assigned to <strong>{allocationModal.name}</strong>
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
                                    {instructors.map(inst => {
                                        const isChecked = selectedInstructors.includes(inst.id);
                                        return (
                                            <label
                                                key={inst.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
                                                    cursor: 'pointer', background: isChecked ? 'rgba(124,108,240,0.04)' : 'transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (isChecked) {
                                                            setSelectedInstructors(prev => prev.filter(id => id !== inst.id));
                                                        } else {
                                                            setSelectedInstructors(prev => [...prev, inst.id]);
                                                        }
                                                    }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{inst.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{inst.email}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setAllocationModal(null)}
                                        disabled={savingAllocation}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={saveInstructorAllocation}
                                        disabled={savingAllocation}
                                    >
                                        {savingAllocation ? 'Saving...' : 'Save Allocation'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* MODAL 2: Admin Student Enrollment Management Modal */}
                <AnimatePresence>
                    {studentModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="card-glow"
                                style={{
                                    background: 'var(--surface)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    width: '100%',
                                    maxWidth: '460px',
                                    padding: '24px'
                                }}
                            >
                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                                    🎯 Manage Student Subject / Domain
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Enroll or remove <strong>{studentModal.name}</strong> ({studentModal.rollNumber})
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                    {domains.map(domain => {
                                        const isEnrolled = studentModal.enrolledSubjects?.includes(domain.id);
                                        return (
                                            <div
                                                key={domain.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)',
                                                    background: isEnrolled ? 'rgba(0,210,160,0.03)' : 'transparent',
                                                }}
                                            >
                                                <div>
                                                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', marginRight: '6px' }}>[{domain.code}]</span>
                                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{domain.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleStudentDomainToggle(studentModal.id, domain.id, isEnrolled)}
                                                    className={isEnrolled ? "btn-danger" : "btn-primary"}
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    {isEnrolled ? 'Opt Out' : 'Enroll'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn-primary"
                                        onClick={() => setStudentModal(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
