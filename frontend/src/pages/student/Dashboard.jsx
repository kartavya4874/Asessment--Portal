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

export default function StudentDashboard() {
    const { user } = useAuth();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        client.get('/assessments', { params: { programId: user.programId } })
            .then(res => setAssessments(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [user.programId]);

    const activeAssessments = assessments.filter(a => a.status === 'Active');
    const upcomingAssessments = assessments.filter(a => a.status === 'Upcoming');
    const closedAssessments = assessments.filter(a => a.status === 'Closed');

    const statusBadge = { Active: 'badge-active', Upcoming: 'badge-upcoming', Closed: 'badge-closed' };

    const renderSection = (title, items, icon) => (
        items.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon} {title} ({items.length})
                </h2>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {items.map(assessment => (
                        <StaggerItem key={assessment.id}>
                            <motion.div
                                className="card"
                                whileHover={{ y: -4, scale: 1.01 }}
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/student/assessment/${assessment.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, flex: 1 }}>{assessment.title}</h3>
                                    <span className={`badge ${statusBadge[assessment.status]}`}>{assessment.status}</span>
                                </div>

                                {assessment.description && (
                                    <p style={{
                                        color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px',
                                        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                    }}>
                                        {assessment.description.replace(/<[^>]+>/g, '')}
                                    </p>
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
                    ))}
                </StaggerContainer>
            </div>
        )
    );

    return (
        <PageTransition>
            <div>
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Welcome, {user?.name} 👋</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        {user?.specialization} • {user?.year}
                    </p>
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Assessments</h3>
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
