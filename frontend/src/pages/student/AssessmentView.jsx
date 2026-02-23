import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import FileUpload from '../../components/ui/FileUpload';
import CountdownTimer from '../../components/ui/CountdownTimer';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function AssessmentView() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    // Submission form
    const [files, setFiles] = useState([]);
    const [urls, setUrls] = useState('');
    const [textAnswer, setTextAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [aRes, sRes] = await Promise.all([
                    client.get(`/assessments/${id}`),
                    client.get(`/submissions/my`, { params: { assessmentId: id } }),
                ]);
                setAssessment(aRes.data);
                if (sRes.data.submitted) {
                    setSubmission(sRes.data);
                    setUrls(sRes.data.urls?.join(', ') || '');
                    setTextAnswer(sRes.data.textAnswer || '');
                }
            } catch (err) { toast.error('Failed to load assessment'); }
            finally { setLoading(false); }
        };
        fetch();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!files.length && !urls.trim() && !textAnswer.trim()) {
            toast.error('Please provide at least one submission item');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('assessmentId', id);
            formData.append('urls', urls);
            formData.append('textAnswer', textAnswer);
            files.forEach(f => formData.append('files', f));

            const { data } = await client.post('/submissions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSubmission(data);
            toast.success(submission ? 'Submission updated!' : 'Submitted successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <PageTransition><div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><SkeletonCard /><SkeletonCard /></div></PageTransition>;

    const isActive = assessment.status === 'Active';
    const isClosed = assessment.status === 'Closed';

    return (
        <PageTransition>
            <div style={{ maxWidth: '800px' }}>
                <button onClick={() => navigate('/student')} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', cursor: 'pointer', border: 'none' }}>
                    ← Back to Dashboard
                </button>

                {/* Assessment Info */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{assessment.title}</h1>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                <span>📅 Start: {format(new Date(assessment.startAt), 'dd MMM yyyy, HH:mm')}</span>
                                <span>⏰ Deadline: {format(new Date(assessment.deadline), 'dd MMM yyyy, HH:mm')}</span>
                                {assessment.maxMarks != null && <span>📝 Max Marks: {assessment.maxMarks}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span className={`badge badge-${assessment.status.toLowerCase()}`}>{assessment.status}</span>
                            {!isClosed && <CountdownTimer deadline={assessment.deadline} />}
                        </div>
                    </div>

                    {assessment.description && (
                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}
                            dangerouslySetInnerHTML={{ __html: assessment.description }}
                        />
                    )}

                    {assessment.attachedFiles?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>📎 Attached Files</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {assessment.attachedFiles.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        📄 {f.name}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Submission Status */}
                {submission && (
                    <div className="card" style={{ marginBottom: '20px', borderLeftWidth: '3px', borderLeftColor: 'var(--success)' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--success)', marginBottom: '8px' }}>✅ Previously Submitted</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Last submitted: {format(new Date(submission.submittedAt), 'dd MMM yyyy, HH:mm')}
                        </p>
                        {submission.files?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                {submission.files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>📄 {f.name}</a>
                                ))}
                            </div>
                        )}
                        {isActive && <p style={{ fontSize: '12px', color: 'var(--accent-secondary)', marginTop: '8px' }}>You can re-submit below to update your work.</p>}
                    </div>
                )}

                {/* Marks */}
                {submission?.marksPublished && submission.marks != null && (
                    <div className="card" style={{ marginBottom: '20px', borderLeftWidth: '3px', borderLeftColor: 'var(--accent-primary)' }}>
                        <h3 style={{ fontSize: '14px', color: 'var(--accent-primary)', marginBottom: '8px' }}>📊 Your Results</h3>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {submission.marks}{assessment.maxMarks != null ? ` / ${assessment.maxMarks}` : ''} marks
                        </div>
                        {submission.feedback && (
                            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>💬 {submission.feedback}</p>
                        )}
                    </div>
                )}

                {/* Submission Form */}
                {isActive && (
                    <div className="card">
                        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
                            {submission ? '🔄 Update Submission' : '📤 Submit Your Work'}
                        </h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <FileUpload label="Upload Files" onFilesSelected={setFiles} />

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>URLs (GitHub, Google Drive, etc.)</label>
                                <input
                                    value={urls}
                                    onChange={(e) => setUrls(e.target.value)}
                                    placeholder="https://github.com/..., https://drive.google.com/..."
                                    style={{ width: '100%' }}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Separate multiple URLs with commas</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Text Answer / Notes</label>
                                <textarea
                                    value={textAnswer}
                                    onChange={(e) => setTextAnswer(e.target.value)}
                                    placeholder="Write your answer, notes, or description here..."
                                    rows={6}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>

                            <motion.button type="submit" className="btn-primary" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ opacity: submitting ? 0.7 : 1 }}>
                                {submitting ? '⏳ Submitting...' : submission ? '🔄 Update Submission' : '📤 Submit'}
                            </motion.button>
                        </form>
                    </div>
                )}

                {isClosed && !submission && (
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--error)', fontSize: '16px' }}>⏹ This assessment is closed. Submission is no longer possible.</p>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
