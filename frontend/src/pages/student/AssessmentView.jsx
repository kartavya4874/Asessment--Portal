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
import formatDescription from '../../utils/formatDescription';

export default function AssessmentView() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    const [files, setFiles] = useState([]);
    const [urls, setUrls] = useState('');
    const [textAnswer, setTextAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [assessmentError, setAssessmentError] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                // Fetch assessment first, if this fails, the page can't load
                const aRes = await client.get(`/assessments/${id}`);
                setAssessment(aRes.data);
                
                // Fetch submission separately so it doesn't break assessment loading
                try {
                    const sRes = await client.get(`/submissions/my`, { params: { assessmentId: id } });
                    if (sRes.data.submitted) {
                        setSubmission(sRes.data);
                        setUrls(sRes.data.urls?.join(', ') || '');
                        setTextAnswer(sRes.data.textAnswer || '');
                    }
                } catch (sErr) {
                    console.error("Failed to load submission:", sErr);
                }
            } catch (err) { 
                console.error("Failed to load assessment:", err);
                setAssessmentError(true);
                toast.error('Failed to load assessment'); 
            }
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

            const { data } = await client.post('/submissions', formData);

            setSubmission(data);
             // Update the URLs and textAnswer states with latest data from DB to stay in sync
            if (data.urls) setUrls(data.urls.join(', '));
            if (data.textAnswer) setTextAnswer(data.textAnswer);
            
            toast.success(submission ? 'Submission updated!' : 'Submitted successfully!');
        } catch (err) {
            console.error("Submission error details:", err.response?.data);
            let errorMsg = 'Submission failed';
            const detail = err.response?.data?.detail;
            if (detail) {
                if (Array.isArray(detail)) {
                    errorMsg = detail[0].msg || 'Validation error';
                } else if (typeof detail === 'string') {
                    errorMsg = detail;
                }
            }
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <PageTransition><div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><SkeletonCard /><SkeletonCard /></div></PageTransition>;

    if (assessmentError || !assessment) {
        return (
            <PageTransition>
                <div style={{ maxWidth: '800px' }}>
                    <motion.button onClick={() => navigate('/student')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>← Back to Dashboard</motion.button>
                    <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
                        <h2 style={{ fontSize: '20px', color: 'var(--error)' }}>Failed to load assessment</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Please verify the assessment exists or try again later.</p>
                    </div>
                </div>
            </PageTransition>
        );
    }

    const isActive = assessment.status === 'Active';
    const isClosed = assessment.status === 'Closed';

    const inputStyle = {
        width: '100%',
        background: 'rgba(124,108,240,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px 16px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.3s',
    };

    return (
        <PageTransition>
            <div style={{ maxWidth: '800px' }}>
                <motion.button
                    onClick={() => navigate('/student')}
                    whileHover={{ x: -4 }}
                    style={{ background: 'none', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', cursor: 'pointer', border: 'none', fontWeight: 600 }}
                >
                    ← Back to Dashboard
                </motion.button>

                {/* Assessment Info */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="card"
                    style={{
                        marginBottom: '20px',
                        borderTop: '3px solid',
                        borderImage: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid)) 1',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>{assessment.title}</h1>
                            <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                {assessment.startAt && <span>📅 Start: {format(new Date(assessment.startAt), 'dd MMM yyyy, HH:mm')}</span>}
                                {assessment.deadline && <span>⏰ Deadline: {format(new Date(assessment.deadline), 'dd MMM yyyy, HH:mm')}</span>}
                                {assessment.maxMarks != null && <span>📝 Max Marks: {assessment.maxMarks}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span className={`badge badge-${assessment.status.toLowerCase()}`}>{assessment.status}</span>
                            {!isClosed && <CountdownTimer deadline={assessment.deadline} />}
                        </div>
                    </div>

                    {assessment.description && (
                        <div style={{
                            padding: '18px', background: 'var(--bg-secondary)', borderRadius: '12px',
                            fontSize: '14px', lineHeight: 1.7, marginBottom: '16px',
                            border: '1px solid var(--border)',
                        }}
                            dangerouslySetInnerHTML={{ __html: formatDescription(assessment.description) }}
                        />
                    )}

                    {assessment.attachedFiles?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 600 }}>📎 Attached Files</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {assessment.attachedFiles.map((f, i) => (
                                    <motion.a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                        className="btn-secondary" whileHover={{ scale: 1.03 }}
                                        style={{ padding: '10px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        📄 {f.name}
                                    </motion.a>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Submission Status */}
                {submission && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="card"
                        style={{
                            marginBottom: '20px',
                            borderLeft: '3px solid var(--success)',
                            background: 'rgba(0,210,160,0.04)',
                        }}
                    >
                        <h3 style={{ fontSize: '14px', color: 'var(--success)', marginBottom: '8px', fontWeight: 700 }}>✅ Previously Submitted</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Last submitted: {submission.submittedAt ? format(new Date(submission.submittedAt), 'dd MMM yyyy, HH:mm') : 'Recently'}
                        </p>
                        {submission.files?.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>📄 Uploaded Files</div>
                                {submission.files.map((f, i) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--accent-primary)' }}>
                                        {f.name}
                                    </a>
                                ))}
                            </div>
                        )}
                        {submission.urls?.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>🔗 Submitted Links</div>
                                {submission.urls.map((u, i) => (
                                    <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                                        {u}
                                    </a>
                                ))}
                            </div>
                        )}
                        {submission.textAnswer && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>📝 Text Answer</div>
                                <p style={{
                                    fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                                    padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)',
                                }}>
                                    {submission.textAnswer}
                                </p>
                            </div>
                        )}
                        {isActive && <p style={{ fontSize: '12px', color: 'var(--accent-secondary)', marginTop: '10px' }}>You can re-submit below to update your work.</p>}
                    </motion.div>
                )}

                {/* Marks */}
                {submission?.marksPublished && submission.marks != null && (
                    <motion.div
                        initial={{ y: 20, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="card"
                        style={{
                            marginBottom: '20px',
                            borderLeft: '3px solid var(--accent-primary)',
                            background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(78,168,222,0.04))',
                        }}
                    >
                        <h3 style={{ fontSize: '14px', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 700 }}>📊 Your Results</h3>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {submission.marks}{assessment.maxMarks != null ? ` / ${assessment.maxMarks}` : ''} <span style={{ fontSize: '16px', fontWeight: 500 }}>marks</span>
                        </div>
                        {submission.feedback && (
                            <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-secondary)', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>💬 {submission.feedback}</p>
                        )}
                    </motion.div>
                )}

                {/* Submission Form */}
                {isActive && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="card"
                    >
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                            {submission ? '🔄 Update Submission' : '📤 Submit Your Work'}
                        </h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <FileUpload label="Upload Files" onFilesSelected={setFiles} />

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>URLs (GitHub, Google Drive, etc.)</label>
                                <input
                                    value={urls}
                                    onChange={(e) => setUrls(e.target.value)}
                                    placeholder="https://github.com/..., https://drive.google.com/..."
                                    style={inputStyle}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Separate multiple URLs with commas</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Text Answer / Notes</label>
                                <textarea
                                    value={textAnswer}
                                    onChange={(e) => setTextAnswer(e.target.value)}
                                    placeholder="Write your answer, notes, or description here..."
                                    rows={6}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>

                            <motion.button
                                type="submit" className="btn-primary" disabled={submitting}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{ opacity: submitting ? 0.7 : 1, padding: '14px' }}
                            >
                                {submitting ? '⏳ Submitting...' : submission ? '🔄 Update Submission' : '📤 Submit'}
                            </motion.button>
                        </form>
                    </motion.div>
                )}

                {isClosed && !submission && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="card"
                        style={{ textAlign: 'center', padding: '40px', borderLeft: '3px solid var(--error)' }}
                    >
                        <p style={{ color: 'var(--error)', fontSize: '16px', fontWeight: 600 }}>⏹ This assessment is closed. Submission is no longer possible.</p>
                    </motion.div>
                )}
            </div>
        </PageTransition>
    );
}
