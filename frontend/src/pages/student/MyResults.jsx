import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function MyResults() {
    const { user } = useAuth();
    const [assessments, setAssessments] = useState([]);
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data: assessmentList } = await client.get('/assessments', {
                    params: { programId: user.programId },
                });
                setAssessments(assessmentList);

                const resultsMap = {};
                for (const assessment of assessmentList) {
                    try {
                        const { data } = await client.get('/submissions/my', {
                            params: { assessmentId: assessment.id },
                        });
                        if (data.submitted) resultsMap[assessment.id] = data;
                    } catch (err) { /* skip */ }
                }
                setResults(resultsMap);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetch();
    }, [user.programId]);

    // Summary stats
    let totalMarks = 0, totalMaxMarks = 0, gradedCount = 0;
    assessments.forEach(a => {
        const sub = results[a.id];
        if (sub?.marksPublished && sub?.marks != null) {
            totalMarks += sub.marks;
            if (a.maxMarks != null) totalMaxMarks += a.maxMarks;
            gradedCount++;
        }
    });
    const avgPercent = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : null;

    return (
        <PageTransition>
            <div>
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
                        <span className="gradient-text">My Results</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>View your marks and feedback</p>
                </motion.div>

                {/* Summary bar */}
                {!loading && gradedCount > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="card"
                        style={{
                            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px',
                            flexWrap: 'wrap', padding: '20px 28px',
                            background: 'linear-gradient(135deg, rgba(124,108,240,0.06), rgba(78,168,222,0.04))',
                            borderLeft: '3px solid var(--accent-primary)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>🏆</span>
                            <div>
                                <div className="stat-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                    {totalMarks}{totalMaxMarks > 0 ? ` / ${totalMaxMarks}` : ''}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Marks</div>
                            </div>
                        </div>
                        {avgPercent != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>📊</span>
                                <div>
                                    <div className="stat-value" style={{
                                        fontSize: '22px', fontWeight: 800,
                                        color: avgPercent >= 60 ? 'var(--success)' : 'var(--error)',
                                    }}>
                                        {avgPercent}%
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Average</div>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>✅</span>
                            <div>
                                <div className="stat-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>
                                    {gradedCount}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Graded</div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '52px', marginBottom: '16px' }}>📊</div>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No assessments found.</p>
                    </div>
                ) : (
                    <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {assessments.map(assessment => {
                            const sub = results[assessment.id];
                            const hasMarks = sub?.marksPublished && sub?.marks != null;
                            const isExpanded = expanded[assessment.id];
                            const hasSubmissionDetails = sub && (sub.files?.length > 0 || sub.urls?.length > 0 || sub.textAnswer);

                            return (
                                <StaggerItem key={assessment.id}>
                                    <motion.div
                                        className="card"
                                        whileHover={{ x: 2 }}
                                        style={{
                                            borderLeft: '3px solid',
                                            borderLeftColor: hasMarks ? 'var(--accent-primary)' : sub ? 'var(--success)' : 'var(--border)',
                                            background: hasMarks ? 'rgba(124,108,240,0.03)' : sub ? 'rgba(0,210,160,0.02)' : 'var(--surface)',
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            flexWrap: 'wrap', gap: '12px',
                                        }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{assessment.title}</h3>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                    <span>📅 {format(new Date(assessment.deadline), 'dd MMM yyyy')}</span>
                                                    <span className={`badge badge-${assessment.status.toLowerCase()}`}>{assessment.status}</span>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                {!sub ? (
                                                    <span className="badge badge-not-submitted">Not Submitted</span>
                                                ) : hasMarks ? (
                                                    <div>
                                                        <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)' }}>{sub.marks}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                            {assessment.maxMarks != null ? `out of ${assessment.maxMarks}` : 'marks'}
                                                        </div>
                                                        {sub.feedback && (
                                                            <div style={{
                                                                marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)',
                                                                maxWidth: '200px', padding: '6px 10px', background: 'var(--bg-secondary)',
                                                                borderRadius: '6px', border: '1px solid var(--border)',
                                                            }}>💬 {sub.feedback}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="badge badge-submitted">Submitted</span>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>⏳ Marks pending</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandable submission details */}
                                        {hasSubmissionDetails && (
                                            <>
                                                <motion.button
                                                    onClick={() => toggleExpand(assessment.id)}
                                                    whileHover={{ x: 4 }}
                                                    style={{
                                                        background: 'none', border: 'none', color: 'var(--accent-primary)',
                                                        fontSize: '12px', cursor: 'pointer', marginTop: '14px',
                                                        display: 'flex', alignItems: 'center', gap: '6px', padding: 0, fontWeight: 600,
                                                    }}
                                                >
                                                    <motion.span
                                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >▶</motion.span>
                                                    View My Submission
                                                </motion.button>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            style={{ overflow: 'hidden' }}
                                                        >
                                                            <div style={{
                                                                marginTop: '14px', padding: '16px',
                                                                background: 'var(--bg-secondary)', borderRadius: '10px',
                                                                display: 'flex', flexDirection: 'column', gap: '12px',
                                                                border: '1px solid var(--border)',
                                                            }}>
                                                                {sub.files?.length > 0 && (
                                                                    <div>
                                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>📄 Files</div>
                                                                        {sub.files.map((f, i) => (
                                                                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                                                                style={{ display: 'block', fontSize: '13px', marginBottom: '3px', color: 'var(--accent-primary)' }}>
                                                                                {f.name}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {sub.urls?.length > 0 && (
                                                                    <div>
                                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>🔗 Links</div>
                                                                        {sub.urls.map((u, i) => (
                                                                            <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                                                                                style={{ display: 'block', fontSize: '13px', marginBottom: '3px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                                                                                {u}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {sub.textAnswer && (
                                                                    <div>
                                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>📝 Text Answer</div>
                                                                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                                            {sub.textAnswer}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </motion.div>
                                </StaggerItem>
                            );
                        })}
                    </StaggerContainer>
                )}
            </div>
        </PageTransition>
    );
}
