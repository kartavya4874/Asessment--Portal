import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard, SkeletonTable } from '../../components/ui/SkeletonLoader';
import { getErrorDetail } from '../../utils/errorHandler';

export default function StudentDetail() {
    const { id: assessmentId, studentId } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [currentSubmission, setCurrentSubmission] = useState(null);
    const [history, setHistory] = useState([]);
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable marks/feedback for current submission
    const [marks, setMarks] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [assessmentRes, studentsRes, historyRes] = await Promise.all([
                    client.get(`/assessments/${assessmentId}`),
                    client.get(`/submissions/students/${assessmentId}`),
                    client.get(`/submissions/student/${studentId}/history`),
                ]);

                setAssessment(assessmentRes.data);

                // Find this student from the students list
                const studentData = studentsRes.data.find(s => s.id === studentId);
                if (studentData) {
                    setStudent(studentData);
                    if (studentData.submission) {
                        setCurrentSubmission(studentData.submission);
                        setMarks(studentData.submission.marks ?? '');
                        setFeedback(studentData.submission.feedback ?? '');
                    }
                }

                // Filter history to exclude the current assessment
                setHistory(historyRes.data.filter(h => h.assessmentId !== assessmentId));
            } catch (err) {
                toast.error('Failed to load student details');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [assessmentId, studentId]);

    const handleSaveMark = async () => {
        if (!currentSubmission?.id) return;
        const marksVal = marks === '' ? null : parseFloat(marks);
        if (assessment.maxMarks != null && marksVal != null && marksVal > assessment.maxMarks) {
            toast.error(`Marks (${marksVal}) cannot exceed max (${assessment.maxMarks})`);
            return;
        }
        setSaving(true);
        try {
            await client.put(`/marks/${currentSubmission.id}`, {
                marks: marksVal || 0,
                feedback: feedback || '',
            });
            toast.success('Marks saved!');
        } catch (err) {
            toast.error(getErrorDetail(err, 'Failed to save marks'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageTransition><div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><SkeletonCard /><SkeletonTable rows={4} /></div></PageTransition>;

    if (!student) return (
        <PageTransition>
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--error)' }}>Student not found in this assessment.</p>
                <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: '16px' }}>← Go Back</button>
            </div>
        </PageTransition>
    );

    return (
        <PageTransition>
            <div style={{ maxWidth: '900px' }}>
                {/* Back button */}
                <button onClick={() => navigate(`/admin/assessments/${assessmentId}`)}
                    style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', cursor: 'pointer', border: 'none' }}>
                    ← Back to {assessment?.title || 'Assessment'}
                </button>

                {/* Student Profile Card */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                    width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff'
                                }}>
                                    {student.name?.charAt(0)?.toUpperCase()}
                                </span>
                                {student.name}
                            </h1>
                            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                <span>🆔 {student.rollNumber}</span>
                                <span>📧 {student.email}</span>
                                <span>📚 {student.specialization}</span>
                                <span>📅 {student.year}</span>
                            </div>
                        </div>
                        <span className={`badge badge-${student.submissionStatus === 'Submitted' ? 'submitted' : student.submissionStatus === 'Late' ? 'late' : 'not-submitted'}`} style={{ fontSize: '13px' }}>
                            {student.submissionStatus}
                        </span>
                    </div>
                </div>

                {/* Current Assessment Submission */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📝 Current Submission
                        <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}>— {assessment?.title}</span>
                    </h2>

                    {currentSubmission ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Submitted time */}
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                🕐 Submitted: {format(new Date(currentSubmission.submittedAt), 'dd MMM yyyy, HH:mm')}
                            </p>

                            {/* Files */}
                            {currentSubmission.files?.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>📄 Files</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {currentSubmission.files.map((f, i) => (
                                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                                className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                📄 {f.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* URLs */}
                            {currentSubmission.urls?.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>🔗 Links</h4>
                                    {currentSubmission.urls.map((u, i) => (
                                        <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                                            style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                                            {u}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Text Answer */}
                            {currentSubmission.textAnswer && (
                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>📝 Text Answer</h4>
                                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                        {currentSubmission.textAnswer}
                                    </div>
                                </div>
                            )}

                            {/* Marks & Feedback inline editor */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>✏️ Grade This Submission</h4>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Marks</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="number" value={marks}
                                                onChange={e => setMarks(e.target.value)}
                                                placeholder="—" min="0"
                                                max={assessment?.maxMarks ?? undefined}
                                                style={{ width: '80px', padding: '8px 10px', fontSize: '14px' }}
                                            />
                                            {assessment?.maxMarks != null && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>/ {assessment.maxMarks}</span>}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Feedback</label>
                                        <input
                                            type="text" value={feedback}
                                            onChange={e => setFeedback(e.target.value)}
                                            placeholder="Enter feedback..."
                                            style={{ width: '100%', padding: '8px 10px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <motion.button
                                        className="btn-primary"
                                        onClick={handleSaveMark}
                                        disabled={saving}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        style={{ padding: '8px 20px', fontSize: '14px' }}
                                    >
                                        {saving ? '⏳ Saving...' : '💾 Save Marks'}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📭</div>
                            <p>No submission for this assessment yet.</p>
                        </div>
                    )}
                </div>

                {/* Past Submissions History */}
                <div className="card">
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>📚 Submission History</h2>

                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            <p>No past submissions from other assessments.</p>
                        </div>
                    ) : (
                        <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {history.map((sub, idx) => (
                                <StaggerItem key={sub.id || idx}>
                                    <div style={{
                                        border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        flexWrap: 'wrap', gap: '12px', background: 'var(--bg-secondary)',
                                    }}>
                                        <div>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{sub.assessmentTitle}</h4>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                <span>🕐 {format(new Date(sub.submittedAt), 'dd MMM yyyy, HH:mm')}</span>
                                                {sub.files?.length > 0 && <span>📄 {sub.files.length} file{sub.files.length > 1 ? 's' : ''}</span>}
                                                {sub.urls?.length > 0 && <span>🔗 {sub.urls.length} link{sub.urls.length > 1 ? 's' : ''}</span>}
                                                {sub.textAnswer && <span>📝 Text</span>}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            {sub.marksPublished && sub.marks != null ? (
                                                <div>
                                                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                                        {sub.marks}{sub.maxMarks != null ? ` / ${sub.maxMarks}` : ''}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>marks</div>
                                                </div>
                                            ) : sub.marks != null ? (
                                                <div>
                                                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                                                        {sub.marks}{sub.maxMarks != null ? ` / ${sub.maxMarks}` : ''}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>marks (not published)</div>
                                                </div>
                                            ) : (
                                                <span className="badge badge-submitted">Submitted</span>
                                            )}
                                        </div>
                                    </div>
                                </StaggerItem>
                            ))}
                        </StaggerContainer>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
