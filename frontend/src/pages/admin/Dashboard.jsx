import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function AdminDashboard() {
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
        { label: 'Programs', value: stats.programs, icon: '🎓', color: 'var(--accent-primary)' },
        { label: 'Total Assessments', value: stats.totalAssessments, icon: '📝', color: 'var(--accent-secondary)' },
        { label: 'Active', value: stats.active, icon: '🟢', color: 'var(--success)' },
        { label: 'Upcoming', value: stats.upcoming, icon: '🔵', color: 'var(--accent-secondary)' },
        { label: 'Closed', value: stats.closed, icon: '🔴', color: 'var(--error)' },
    ] : [];

    return (
        <PageTransition>
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Overview of your AI Lab Assessment Portal</p>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                        {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                        {statCards.map((card, i) => (
                            <StaggerItem key={i}>
                                <motion.div className="card" whileHover={{ y: -4, scale: 1.02 }} style={{ textAlign: 'center', padding: '28px 20px' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{card.icon}</div>
                                    <div style={{ fontSize: '36px', fontWeight: 800, color: card.color, marginBottom: '4px' }}>{card.value}</div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</div>
                                </motion.div>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                )}

                <div style={{ marginTop: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h2>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <motion.a href="/admin/programs" className="btn-primary" whileHover={{ scale: 1.03 }} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            ➕ Create Program
                        </motion.a>
                        <motion.a href="/admin/assessments" className="btn-secondary" whileHover={{ scale: 1.03 }} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            📝 New Assessment
                        </motion.a>
                        <motion.a href="/admin/export" className="btn-secondary" whileHover={{ scale: 1.03 }} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            📥 Export Reports
                        </motion.a>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
