import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

const iconBg = [
    'linear-gradient(135deg, #7c6cf0, #9b8cf8)',
    'linear-gradient(135deg, #4ea8de, #72c5f0)',
    'linear-gradient(135deg, #00d2a0, #34e8c0)',
    'linear-gradient(135deg, #4ea8de, #7c6cf0)',
    'linear-gradient(135deg, #ff5c8a, #ff8cb0)',
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [progs, assessments] = await Promise.all([
                    client.get('/programs'),
                    client.get('/assessments'),
                ]);
                const activeCount = assessments.data.filter(a => a.status === 'Active').length;
                const upcomingCount = assessments.data.filter(a => a.status === 'Upcoming').length;
                const closedCount = assessments.data.filter(a => a.status === 'Closed').length;

                setStats({
                    programs: progs.data.length,
                    totalAssessments: assessments.data.length,
                    active: activeCount,
                    upcoming: upcomingCount,
                    closed: closedCount,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = stats ? [
        { label: 'Programs', value: stats.programs, icon: '🎓', color: 'var(--accent-primary)', link: '/admin/programs' },
        { label: 'Total Assessments', value: stats.totalAssessments, icon: '📝', color: 'var(--accent-secondary)', link: '/admin/assessments' },
        { label: 'Active', value: stats.active, icon: '🟢', color: 'var(--success)', link: '/admin/assessments?status=Active' },
        { label: 'Upcoming', value: stats.upcoming, icon: '🔵', color: 'var(--accent-secondary)', link: '/admin/assessments?status=Upcoming' },
        { label: 'Closed', value: stats.closed, icon: '🔴', color: 'var(--error)', link: '/admin/assessments?status=Closed' },
    ] : [];

    return (
        <PageTransition>
            <div>
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ marginBottom: '8px' }}
                >
                    <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
                        <span className="gradient-text">Dashboard</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overview of your AI Lab Assessment Portal</p>
                </motion.div>

                <div style={{ marginTop: '28px' }}>
                    {loading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : (
                        <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {statCards.map((card, i) => (
                                <StaggerItem key={i}>
                                    <motion.div
                                        className="card-glow"
                                        whileHover={{ y: -6, scale: 1.03 }}
                                        onClick={() => navigate(card.link)}
                                        style={{
                                            textAlign: 'center', padding: '28px 20px',
                                            background: 'var(--surface)', borderRadius: '16px',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{
                                            width: 52, height: 52, borderRadius: '14px',
                                            background: iconBg[i],
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '24px', margin: '0 auto 14px',
                                            boxShadow: `0 6px 20px ${card.color}33`,
                                        }}>
                                            {card.icon}
                                        </div>
                                        <div className="stat-value" style={{ fontSize: '36px', fontWeight: 800, color: card.color, marginBottom: '4px' }}>
                                            {card.value}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</div>
                                    </motion.div>
                                </StaggerItem>
                            ))}
                        </StaggerContainer>
                    )}
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{ marginTop: '40px' }}
                >
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>⚡ Quick Actions</h2>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <motion.button
                            onClick={() => navigate('/admin/programs')}
                            className="btn-primary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            ➕ Create Program
                        </motion.button>
                        <motion.button
                            onClick={() => navigate('/admin/assessments')}
                            className="btn-secondary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            📝 New Assessment
                        </motion.button>
                        <motion.button
                            onClick={() => navigate('/admin/export')}
                            className="btn-secondary"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            📥 Export Reports
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </PageTransition>
    );
}
