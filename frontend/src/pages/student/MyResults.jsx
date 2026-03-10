import { useState, useEffect } from 'react';
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

                // Fetch submissions for each assessment
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

    return (
        <PageTransition>
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>My Results</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>View your marks and feedback</p>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                        <p style={{ color: 'var(--text-secondary)' }}>No assessments found.</p>
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
                                    <div className="card" style={{
                                        borderLeftWidth: '3px',
                                        borderLeftColor: hasMarks ? 'var(--accent-primary)' : sub ? 'var(--success)' : 'var(--border)',
                                    }}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            flexWrap: 'wrap', gap: '12px',
                                        }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{assessment.title}</h3>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                                                    <span>📅 {format(new Date(assessment.deadline), 'dd MMM yyyy')}</span>
                                                    <span className={`badge badge-${assessment.status.toLowerCase()}`}>{assessment.status}</span>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                {!sub ? (
                                                    <span className="badge badge-not-submitted">Not Submitted</span>
                                                ) : hasMarks ? (
                                                    <div>
                                                        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-primary)' }}>{sub.marks}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>marks</div>
                                                        {sub.feedback && (
                                                            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px' }}>💬 {sub.feedback}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="badge badge-submitted">Submitted</span>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Marks pending</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandable submission details */}
                                        {hasSubmissionDetails && (
                                            <>
                                                <button
                                                    onClick={() => toggleExpand(assessment.id)}
                                                    style={{
                                                        background: 'none', border: 'none', color: 'var(--accent-primary)',
                                                        fontSize: '12px', cursor: 'pointer', marginTop: '12px',
                                                        display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
                                                    }}
                                                >
                                                    {isExpanded ? '▼' : '▶'} View My Submission
                                                </button>

                                                {isExpanded && (
                                                    <div style={{
                                                        marginTop: '12px', padding: '14px',
                                                        background: 'var(--bg-secondary)', borderRadius: '8px',
                                                        display: 'flex', flexDirection: 'column', gap: '10px',
                                                    }}>
                                                        {sub.files?.length > 0 && (
                                                            <div>
                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>📄 Files</div>
                                                                {sub.files.map((f, i) => (
                                                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                                                                        style={{ display: 'block', fontSize: '13px', marginBottom: '2px', color: 'var(--accent-primary)' }}>
                                                                        {f.name}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {sub.urls?.length > 0 && (
                                                            <div>
                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>🔗 Links</div>
                                                                {sub.urls.map((u, i) => (
                                                                    <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                                                                        style={{ display: 'block', fontSize: '13px', marginBottom: '2px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                                                                        {u}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {sub.textAnswer && (
                                                            <div>
                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>📝 Text Answer</div>
                                                                <p style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                                    {sub.textAnswer}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </StaggerItem>
                            );
                        })}
                    </StaggerContainer>
                )}
            </div>
        </PageTransition>
    );
}
