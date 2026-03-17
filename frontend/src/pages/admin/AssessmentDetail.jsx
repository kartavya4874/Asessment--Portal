import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import formatDescription from '../../utils/formatDescription';
import { getErrorDetail } from '../../utils/errorHandler';

export default function AssessmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [selectedCopyPrograms, setSelectedCopyPrograms] = useState([]);
    const [tableSearch, setTableSearch] = useState('');
    const [sortBy, setSortBy] = useState('rollNumber');
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [aRes, sRes, pRes] = await Promise.all([
                    client.get(`/assessments/${id}`),
                    client.get(`/submissions/students/${id}`),
                    client.get('/programs'),
                ]);
                setAssessment(aRes.data);
                setStudents(sRes.data);
                setPrograms(pRes.data);
            } catch (err) { toast.error('Failed to load data'); }
            finally { setLoading(false); }
        };
        fetch();
    }, [id]);

    const handleMarksChange = (studentIdx, field, value) => {
        const updated = [...students];
        if (!updated[studentIdx].submission) {
            updated[studentIdx].submission = { marks: null, feedback: '' };
        }
        updated[studentIdx].submission[field] = field === 'marks' ? (value === '' ? null : parseFloat(value)) : value;
        setStudents(updated);
    };

    const saveSingleMark = async (student) => {
        if (!student.submission?.id) { toast.error('No submission to grade'); return; }
        const marks = student.submission.marks;
        if (assessment.maxMarks != null && marks != null && marks > assessment.maxMarks) {
            toast.error(`Marks (${marks}) cannot exceed max marks (${assessment.maxMarks})`);
            return;
        }
        try {
            await client.put(`/marks/${student.submission.id}`, {
                marks: marks || 0,
                feedback: student.submission.feedback || '',
            });
            toast.success(`Marks saved for ${student.name}`);
        } catch (err) { toast.error(getErrorDetail(err, 'Failed to save marks')); }
    };

    const handleBulkSave = async () => {
        const updates = students
            .filter(s => s.submission?.id)
            .map(s => ({
                submissionId: s.submission.id,
                marks: s.submission.marks,
                feedback: s.submission.feedback,
            }));

        // Validate against maxMarks
        if (assessment.maxMarks != null) {
            const overflow = updates.filter(u => u.marks != null && u.marks > assessment.maxMarks);
            if (overflow.length > 0) {
                toast.error(`${overflow.length} student(s) have marks exceeding max marks (${assessment.maxMarks})`);
                return;
            }
        }

        if (updates.length === 0) {
            toast.error('No submissions to grade');
            return;
        }

        setSaving(true);
        try {
            await client.put('/marks/bulk', { updates });
            toast.success(`Updated ${updates.length} submissions!`);
        } catch (err) {
            toast.error('Bulk save failed');
        } finally {
            setSaving(false);
        }
    };

    const publishMarks = async () => {
        setSaving(true);
        try {
            await client.put(`/marks/publish/${id}`);
            toast.success('Marks published to students!');
        } catch (err) { toast.error('Failed to publish marks'); }
        finally { setSaving(false); }
    };

    const toggleLock = async () => {
        setSaving(true);
        try {
            const endpoint = assessment.isLocked ? `/assessments/${id}/unlock` : `/assessments/${id}/lock`;
            const { data } = await client.post(endpoint);
            setAssessment(data);
            toast.success(assessment.isLocked ? 'Assessment unlocked!' : 'Assessment locked!');
        } catch (err) {
            toast.error(getErrorDetail(err, 'Failed to toggle lock'));
        } finally {
            setSaving(false);
        }
    };

    const exportExcel = async () => {
        try {
            const response = await client.get(
                `/export/program/${assessment.programId}/assessment/${id}`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${assessment.title}_report.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Excel downloaded!');
        } catch (err) { toast.error('Export failed'); }
    };

    const deleteAssessment = async () => {
        setSaving(true);
        try {
            await client.delete(`/assessments/${id}`);
            toast.success('Assessment deleted!');
            navigate('/admin/assessments');
        } catch (err) {
            toast.error(getErrorDetail(err, 'Failed to delete'));
        } finally {
            setSaving(false);
            setShowDeleteConfirm(false);
        }
    };

    const copyToPrograms = async () => {
        if (selectedCopyPrograms.length === 0) {
            toast.error('Select at least one program');
            return;
        }
        setCopying(true);
        try {
            const { data } = await client.post(`/assessments/${id}/copy`, {
                targetProgramIds: selectedCopyPrograms,
            });
            toast.success(`Copied to ${data.length} program(s)!`);
            setShowCopyModal(false);
            setSelectedCopyPrograms([]);
        } catch (err) {
            toast.error(getErrorDetail(err, 'Copy failed'));
        } finally {
            setCopying(false);
        }
    };

    const toggleCopyProgram = (pid) => {
        setSelectedCopyPrograms(prev =>
            prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
        );
    };

    const getProgramName = (pid) => programs.find(p => p.id === pid)?.name || 'Unknown';

    if (loading) return <PageTransition><SkeletonTable rows={8} /></PageTransition>;

    const statusBadge = { Active: 'badge-active', Upcoming: 'badge-upcoming', Closed: 'badge-closed' };

    return (
        <PageTransition>
            <div>
                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <button onClick={() => navigate('/admin/assessments')} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ← Back to Assessments
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{assessment.title}</h1>
                                {assessment.isLocked && <span style={{ fontSize: '20px' }}>🔒</span>}
                                <span className={`badge ${statusBadge[assessment.status]}`}>{assessment.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                <span>🎓 {getProgramName(assessment.programId)}</span>
                                <span>📅 {format(new Date(assessment.startAt), 'dd MMM yyyy, HH:mm')}</span>
                                <span>⏰ {format(new Date(assessment.deadline), 'dd MMM yyyy, HH:mm')}</span>
                                {assessment.maxMarks != null && <span>📝 Max Marks: {assessment.maxMarks}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <motion.button
                                className="btn-secondary"
                                onClick={() => navigate(`/admin/assessments/${id}/edit`)}
                                disabled={assessment.isLocked}
                                whileHover={!assessment.isLocked ? { scale: 1.03 } : {}}
                                style={{ opacity: assessment.isLocked ? 0.5 : 1 }}
                            >
                                ✏️ Edit
                            </motion.button>
                            <motion.button
                                className="btn-secondary"
                                onClick={toggleLock}
                                disabled={saving}
                                whileHover={{ scale: 1.03 }}
                                style={{ borderColor: assessment.isLocked ? 'var(--urgent)' : 'inherit' }}
                            >
                                {assessment.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                            </motion.button>
                            <motion.button className="btn-secondary" onClick={() => setShowCopyModal(true)} whileHover={{ scale: 1.03 }}>📋 Copy To Programs</motion.button>
                            <motion.button className="btn-secondary" onClick={exportExcel} whileHover={{ scale: 1.03 }}>📥 Export Excel</motion.button>
                            <motion.button
                                className="btn-secondary"
                                onClick={handleBulkSave}
                                disabled={saving}
                                whileHover={{ scale: 1.03 }}
                            >
                                {saving ? 'Saving...' : '💾 Bulk Save Marks'}
                            </motion.button>
                            <motion.button className="btn-primary" onClick={publishMarks} disabled={saving} whileHover={{ scale: 1.03 }}>
                                {saving ? 'Publishing...' : '📢 Publish Marks'}
                            </motion.button>
                            <motion.button
                                className="btn-secondary"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={saving || assessment.isLocked}
                                whileHover={{ scale: 1.03 }}
                                style={{ borderColor: 'var(--error)', color: 'var(--error)', opacity: assessment.isLocked ? 0.4 : 1 }}
                            >
                                🗑️ Delete
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {assessment.description && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Description</h3>
                        <div style={{ fontSize: '14px', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: formatDescription(assessment.description) }} />
                    </div>
                )}

                {/* Attached Files */}
                {assessment.attachedFiles?.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Attached Files</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {assessment.attachedFiles.map((f, i) => (
                                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                    style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    📄 {f.name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Students Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Student Submissions ({students.length})</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                value={tableSearch}
                                onChange={e => setTableSearch(e.target.value)}
                                placeholder="🔍 Search name or roll..."
                                style={{ padding: '7px 12px', fontSize: '13px', minWidth: '180px' }}
                            />
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '7px 12px', fontSize: '13px' }}>
                                <option value="rollNumber">Sort: Roll No</option>
                                <option value="year">Sort: Year/Sem</option>
                                <option value="name">Sort: Name</option>
                                <option value="status">Sort: Status</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    {['Roll No', 'Name', 'Specialization', 'Status', 'Files', 'Text', 'URLs', 'Marks', 'Feedback', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students
                                    .map((student, idx) => ({ ...student, _origIdx: idx }))
                                    .filter(s => {
                                        if (!tableSearch.trim()) return true;
                                        const q = tableSearch.toLowerCase();
                                        return s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                                    })
                                    .sort((a, b) => {
                                        if (sortBy === 'rollNumber') return (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true });
                                        if (sortBy === 'year') return (a.year || '').localeCompare(b.year || '', undefined, { numeric: true }) || (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true });
                                        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
                                        if (sortBy === 'status') { const order = { 'Submitted': 0, 'Late': 1, 'Not Submitted': 2 }; return (order[a.submissionStatus] ?? 3) - (order[b.submissionStatus] ?? 3); }
                                        return 0;
                                    })
                                    .map((student) => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.rollNumber}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <a
                                                    onClick={() => navigate(`/admin/assessments/${id}/student/${student.id}`)}
                                                    style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}
                                                    title="View student details &amp; history"
                                                >
                                                    {student.name} →
                                                </a>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{student.specialization}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className={`badge badge-${student.submissionStatus === 'Submitted' ? 'submitted' : student.submissionStatus === 'Late' ? 'late' : 'not-submitted'}`}>
                                                    {student.submissionStatus}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {student.submission?.files?.map((f, i) => (
                                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>📄 {f.name}</a>
                                                )) || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {student.submission?.textAnswer || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {student.submission?.urls?.map((u, i) => (
                                                    <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '12px', marginBottom: '2px' }}>🔗 Link {i + 1}</a>
                                                )) || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <input
                                                    type="number"
                                                    value={student.submission?.marks ?? ''}
                                                    onChange={(e) => handleMarksChange(student._origIdx, 'marks', e.target.value)}
                                                    placeholder="—"
                                                    min="0"
                                                    max={assessment.maxMarks ?? undefined}
                                                    style={{ width: '70px', padding: '6px 8px', fontSize: '13px' }}
                                                    disabled={!student.submission?.id}
                                                />
                                                {assessment.maxMarks != null && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>/ {assessment.maxMarks}</span>}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <input
                                                    type="text"
                                                    value={student.submission?.feedback ?? ''}
                                                    onChange={(e) => handleMarksChange(student._origIdx, 'feedback', e.target.value)}
                                                    placeholder="Feedback"
                                                    style={{ width: '120px', padding: '6px 8px', fontSize: '13px' }}
                                                    disabled={!student.submission?.id}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => saveSingleMark(student)}
                                                    disabled={!student.submission?.id}
                                                    style={{ padding: '6px 12px', fontSize: '12px', opacity: student.submission?.id ? 1 : 0.4 }}
                                                >
                                                    💾
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    {students.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No students enrolled in this program yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowDeleteConfirm(false)}>
                    <motion.div
                        className="card"
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={{ maxWidth: '420px', width: '90%', textAlign: 'center' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Delete Assessment?</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                            This will permanently delete <strong>{assessment.title}</strong> and cannot be undone. Existing submissions will be orphaned.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <motion.button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} whileHover={{ scale: 1.03 }}>
                                Cancel
                            </motion.button>
                            <motion.button
                                className="btn-primary"
                                onClick={deleteAssessment}
                                disabled={saving}
                                whileHover={{ scale: 1.03 }}
                                style={{ background: 'var(--error)' }}
                            >
                                {saving ? 'Deleting...' : '🗑️ Yes, Delete'}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Copy to Programs Modal */}
            {showCopyModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowCopyModal(false)}>
                    <motion.div
                        className="card"
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={{ maxWidth: '500px', width: '90%' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>📋 Copy Assessment</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            Copy <strong>{assessment.title}</strong> to other programs. Select the target programs:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                            {programs.filter(p => p.id !== assessment.programId).length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No other programs available.</p>
                            ) : (
                                programs.filter(p => p.id !== assessment.programId).map(program => (
                                    <label key={program.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                        background: selectedCopyPrograms.includes(program.id) ? 'var(--bg-secondary)' : 'transparent',
                                        borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)',
                                        transition: 'background 0.15s',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCopyPrograms.includes(program.id)}
                                            onChange={() => toggleCopyProgram(program.id)}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{program.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <motion.button className="btn-secondary" onClick={() => { setShowCopyModal(false); setSelectedCopyPrograms([]); }} whileHover={{ scale: 1.03 }}>
                                Cancel
                            </motion.button>
                            <motion.button
                                className="btn-primary"
                                onClick={copyToPrograms}
                                disabled={copying || selectedCopyPrograms.length === 0}
                                whileHover={{ scale: 1.03 }}
                                style={{ opacity: selectedCopyPrograms.length === 0 ? 0.5 : 1 }}
                            >
                                {copying ? '⏳ Copying...' : `📋 Copy to ${selectedCopyPrograms.length} Program${selectedCopyPrograms.length !== 1 ? 's' : ''}`}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </PageTransition>
    );
}
