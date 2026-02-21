import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

export default function Assessments() {
    const [assessments, setAssessments] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [filterProgram, setFilterProgram] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        client.get('/programs').then(res => setPrograms(res.data)).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = filterProgram ? { programId: filterProgram } : {};
        client.get('/assessments', { params })
            .then(res => setAssessments(res.data))
            .catch(() => toast.error('Failed to load assessments'))
            .finally(() => setLoading(false));
    }, [filterProgram]);

    const getStatusBadge = (status) => {
        const classes = { Active: 'badge-active', Upcoming: 'badge-upcoming', Closed: 'badge-closed' };
        return <span className={`badge ${classes[status] || ''}`}>{status}</span>;
    };

    const getProgramName = (id) => programs.find(p => p.id === id)?.name || 'Unknown';

    return (
        <PageTransition>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Assessments</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Create and manage lab assessments</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} style={{ padding: '10px 14px', minWidth: '180px' }}>
                            <option value="">All Programs</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <motion.button className="btn-primary" onClick={() => navigate('/admin/assessments/new')} whileHover={{ scale: 1.03 }}>
                            ➕ New Assessment
                        </motion.button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Assessments Yet</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Create your first assessment to get started.</p>
                    </div>
                ) : (
                    <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {assessments.map(assessment => (
                            <StaggerItem key={assessment.id}>
                                <motion.div
                                    className="card"
                                    whileHover={{ x: 4 }}
                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
                                    onClick={() => navigate(`/admin/assessments/${assessment.id}`)}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{assessment.title}</h3>
                                            {getStatusBadge(assessment.status)}
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <span>🎓 {getProgramName(assessment.programId)}</span>
                                            <span>📅 {format(new Date(assessment.startAt), 'dd MMM yyyy, HH:mm')}</span>
                                            <span>⏰ {format(new Date(assessment.deadline), 'dd MMM yyyy, HH:mm')}</span>
                                            <span>📎 {assessment.attachedFiles?.length || 0} files</span>
                                        </div>
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>→</span>
                                </motion.div>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                )}
            </div>
        </PageTransition>
    );
}
