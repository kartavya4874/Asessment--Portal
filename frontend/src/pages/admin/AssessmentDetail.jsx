import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export default function AssessmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [students, setStudents] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        try {
            await client.put(`/marks/${student.submission.id}`, {
                marks: student.submission.marks || 0,
                feedback: student.submission.feedback || '',
            });
            toast.success(`Marks saved for ${student.name}`);
        } catch (err) { toast.error('Failed to save marks'); }
    };

    const publishMarks = async () => {
        setSaving(true);
        try {
            await client.put(`/marks/publish/${id}`);
            toast.success('Marks published to students!');
        } catch (err) { toast.error('Failed to publish marks'); }
        finally { setSaving(false); }
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
                                <span className={`badge ${statusBadge[assessment.status]}`}>{assessment.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <span>🎓 {getProgramName(assessment.programId)}</span>
                                <span>📅 {format(new Date(assessment.startAt), 'dd MMM yyyy, HH:mm')}</span>
                                <span>⏰ {format(new Date(assessment.deadline), 'dd MMM yyyy, HH:mm')}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <motion.button className="btn-secondary" onClick={exportExcel} whileHover={{ scale: 1.03 }}>📥 Export Excel</motion.button>
                            <motion.button className="btn-primary" onClick={publishMarks} disabled={saving} whileHover={{ scale: 1.03 }}>
                                {saving ? 'Publishing...' : '📢 Publish Marks'}
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {assessment.description && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Description</h3>
                        <div style={{ fontSize: '14px', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: assessment.description }} />
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
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Student Submissions ({students.length})</h3>
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
                                {students.map((student, idx) => (
                                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{student.rollNumber}</td>
                                        <td style={{ padding: '12px 16px' }}>{student.name}</td>
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
                                                onChange={(e) => handleMarksChange(idx, 'marks', e.target.value)}
                                                placeholder="—"
                                                style={{ width: '60px', padding: '6px 8px', fontSize: '13px' }}
                                                disabled={!student.submission?.id}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input
                                                type="text"
                                                value={student.submission?.feedback ?? ''}
                                                onChange={(e) => handleMarksChange(idx, 'feedback', e.target.value)}
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
        </PageTransition>
    );
}
