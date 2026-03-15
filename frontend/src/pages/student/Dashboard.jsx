import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import CountdownTimer from '../../components/ui/CountdownTimer';

const statusColors = {
    Active: { border: 'var(--success)', bg: 'rgba(0,210,160,0.06)' },
    Upcoming: { border: 'var(--accent-secondary)', bg: 'rgba(78,168,222,0.06)' },
    Closed: { border: 'var(--text-secondary)', bg: 'rgba(139,144,168,0.04)' },
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const [assessments, setAssessments] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const { data: assessmentList } = await client.get('/assessments', {
                    params: { programId: user.programId },
                });
                setAssessments(assessmentList);

                const subsMap = {};
                await Promise.all(assessmentList.map(async (a) => {
                    try {
                        const { data } = await client.get('/submissions/my', {
                            params: { assessmentId: a.id },
                        });
                        if (data.submitted) subsMap[a.id] = data;
                    } catch { /* skip */ }
                }));
                setSubmissions(subsMap);
            } catch { }
            finally { setLoading(false); }
        };
        fetchAll();
    }, [user.programId]);

    const activeAssessments = assessments.filter(a => a.status === 'Active');
    const upcomingAssessments = assessments.filter(a => a.status === 'Upcoming');
    const closedAssessments = assessments.filter(a => a.status === 'Closed');

    const submittedCount = Object.keys(submissions).length;
    let totalMarks = 0;
    let totalMaxMarks = 0;
    let gradedCount = 0;
    assessments.forEach(a => {
        const sub = submissions[a.id];
        if (sub?.marksPublished && sub?.marks != null) {
            totalMarks += sub.marks;
            if (a.maxMarks != null) totalMaxMarks += a.maxMarks;
            gradedCount++;
        }
    });
    const avgPercent = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : null;

    const statusBadge = { Active: 'badge-active', Upcoming: 'badge-upcoming', Closed: 'badge-closed' };

    const renderSection = (title, items, icon) => (
        items.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon} {title} ({items.length})
                </h2>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {items.map(assessment => {
                        const sub = submissions[assessment.id];
                        const hasMarks = sub?.marksPublished && sub?.marks != null;
                        const sc = statusColors[assessment.status] || statusColors.Closed;

                        return (
                            <StaggerItem key={assessment.id}>
                                <motion.div
                                    className="card"
                                    whileHover={{ y: -6, scale: 1.01 }}
                                    style={{
                                        cursor: 'pointer',
                                        borderLeft: `3px solid ${sc.border}`,
                                        background: sc.bg,
                                    }}
                                    onClick={() => navigate(`/student/assessment/${assessment.id}`)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, flex: 1 }}>{assessment.title}</h3>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                            {sub ? (
                                                <span className="badge badge-submitted" style={{ fontSize: '11px' }}>✅ Submitted</span>
                                            ) : assessment.status !== 'Upcoming' ? (
                                                <span className="badge badge-not-submitted" style={{ fontSize: '11px' }}>Not Submitted</span>
                                            ) : null}
                                            <span className={`badge ${statusBadge[assessment.status]}`}>{assessment.status}</span>
                                        </div>
                                    </div>

                                    {assessment.description && (
                                        <p style={{
                                            color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px',
                                            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                        }}>
                                            {assessment.description.replace(/<[^>]+>/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1')}
                                        </p>
                                    )}

                                    {hasMarks && (
                                        <div style={{
                                            padding: '10px 14px',
                                            background: 'linear-gradient(135deg, rgba(124,108,240,0.08), rgba(78,168,222,0.06))',
                                            borderRadius: '10px', marginBottom: '12px',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            border: '1px solid rgba(124,108,240,0.1)',
                                        }}>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                                {sub.marks}{assessment.maxMarks != null ? ` / ${assessment.maxMarks}` : ''}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>marks</span>
                                            {sub.feedback && (
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>💬 {sub.feedback}</span>
                                            )}
                                        </div>
                                    )}

                                    {sub && assessment.status === 'Closed' && !hasMarks && (
                                        <div style={{
                                            padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px',
                                            marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)',
                                            display: 'flex', gap: '12px', flexWrap: 'wrap',
                                        }}>
                                            {sub.files?.length > 0 && <span>📄 {sub.files.length} file{sub.files.length > 1 ? 's' : ''}</span>}
                                            {sub.urls?.length > 0 && <span>🔗 {sub.urls.length} link{sub.urls.length > 1 ? 's' : ''}</span>}
                                            {sub.textAnswer && <span>📝 Text submitted</span>}
                                            <span style={{ marginLeft: 'auto' }}>⏳ Marks pending</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            📅 {format(new Date(assessment.startAt), 'dd MMM')} — {format(new Date(assessment.deadline), 'dd MMM yyyy')}
                                        </div>
                                        {assessment.status !== 'Closed' && (
                                            <CountdownTimer deadline={assessment.deadline} />
                                        )}
                                    </div>

                                    {assessment.attachedFiles?.length > 0 && (
                                        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            📎 {assessment.attachedFiles.length} file{assessment.attachedFiles.length > 1 ? 's' : ''} attached
                                        </div>
                                    )}
                                </motion.div>
                            </StaggerItem>
                        );
                    })}
                </StaggerContainer>
            </div>
        )
    );

    const statItems = [
        { label: 'Total Assessments', value: assessments.length, color: 'var(--accent-primary)', icon: '📝' },
        { label: 'Submitted', value: submittedCount, color: 'var(--success)', icon: '✅' },
        { label: 'Total Marks', value: gradedCount > 0 ? `${totalMarks}${totalMaxMarks > 0 ? ` / ${totalMaxMarks}` : ''}` : '—', color: 'var(--accent-primary)', icon: '🏆' },
        { label: 'Average', value: avgPercent != null ? `${avgPercent}%` : '—', color: avgPercent != null && avgPercent >= 60 ? 'var(--success)' : avgPercent != null ? 'var(--error)' : 'var(--text-secondary)', icon: '📊' },
    ];

    return (
        <PageTransition>
            <div>
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ marginBottom: '28px' }}
                >
                    <h1 style={{ fontSize: '30px', fontWeight: 800 }}>
                        Welcome, <span className="gradient-text">{user?.name}</span> 👋
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        {user?.specialization} • {user?.year}
                    </p>
                </motion.div>

                {/* Stats */}
                {!loading && assessments.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '14px', marginBottom: '32px',
                        }}
                    >
                        {statItems.map((item, i) => (
                            <motion.div
                                key={i}
                                className="card-glow"
                                whileHover={{ y: -4, scale: 1.02 }}
                                style={{
                                    textAlign: 'center', padding: '22px 16px',
                                    background: 'var(--surface)', borderRadius: '14px',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{item.icon}</div>
                                <div className="stat-value" style={{ fontSize: '26px', fontWeight: 800, color: item.color }}>{item.value}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>{item.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '52px', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: 700 }}>No Assessments</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Your program doesn't have any assessments yet.</p>
                    </div>
                ) : (
                    <>
                        {renderSection('Active Assessments', activeAssessments, '🟢')}
                        {renderSection('Upcoming Assessments', upcomingAssessments, '🔵')}
                        {renderSection('Past Assessments', closedAssessments, '⚪')}
                    </>
                )}
            </div>
        </PageTransition>
    );
}
