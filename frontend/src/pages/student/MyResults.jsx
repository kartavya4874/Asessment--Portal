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

                            return (
                                <StaggerItem key={assessment.id}>
                                    <div className="card" style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        flexWrap: 'wrap', gap: '12px',
                                        borderLeftWidth: '3px',
                                        borderLeftColor: hasMarks ? 'var(--accent-primary)' : sub ? 'var(--success)' : 'var(--border)',
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
                                </StaggerItem>
                            );
                        })}
                    </StaggerContainer>
                )}
            </div>
        </PageTransition>
    );
}
