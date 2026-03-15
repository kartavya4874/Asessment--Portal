import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import client from '../../api/client';
import PageTransition from '../../components/ui/PageTransition';
import { StaggerContainer, StaggerItem } from '../../components/ui/PageTransition';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';

const statusColors = {
    Active: { border: 'var(--success)', bg: 'rgba(0,210,160,0.05)' },
    Upcoming: { border: 'var(--accent-secondary)', bg: 'rgba(78,168,222,0.05)' },
    Closed: { border: 'var(--text-secondary)', bg: 'rgba(139,144,168,0.04)' },
};

export default function Assessments() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Parse initial status from URL query parameters
    const getInitialStatus = () => {
        const params = new URLSearchParams(location.search);
        return params.get('status') || '';
    };

    const [assessments, setAssessments] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [filterProgram, setFilterProgram] = useState('');
    const [filterStatus, setFilterStatus] = useState(getInitialStatus());
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Update filter if URL changes directly
    useEffect(() => {
        const queryStatus = new URLSearchParams(location.search).get('status');
        if (queryStatus !== null && queryStatus !== filterStatus) {
            setFilterStatus(queryStatus);
        }
    }, [location.search]);

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

    const inputStyle = {
        padding: '12px 16px',
        background: 'rgba(124,108,240,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        fontSize: '14px',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.3s',
    };

    return (
        <PageTransition>
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">Assessments</span></h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Create and manage lab assessments</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="🔍 Search assessments..."
                            style={{ ...inputStyle, minWidth: '200px' }}
                        />
                        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} style={{ ...inputStyle, minWidth: '180px' }}>
                            <option value="">All Programs</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={filterStatus} onChange={(e) => {
                            setFilterStatus(e.target.value);
                            // Update URL to reflect selected status or remove parameter if empty
                            const searchParams = new URLSearchParams(location.search);
                            if (e.target.value) {
                                searchParams.set('status', e.target.value);
                            } else {
                                searchParams.delete('status');
                            }
                            navigate({ search: searchParams.toString() }, { replace: true });
                        }} style={{ ...inputStyle, minWidth: '150px' }}>
                            <option value="">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Closed">Closed</option>
                        </select>
                        <motion.button className="btn-primary" onClick={() => navigate('/admin/assessments/new')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
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
                        <div style={{ fontSize: '52px', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: 700 }}>No Assessments Yet</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Create your first assessment to get started.</p>
                    </div>
                ) : (
                    <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {assessments.filter(a => {
                            if (filterStatus && a.status !== filterStatus) return false;
                            if (!search.trim()) return true;
                            const q = search.toLowerCase();
                            return a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q);
                        }).map(assessment => {
                            const sc = statusColors[assessment.status] || statusColors.Closed;
                            return (
                                <StaggerItem key={assessment.id}>
                                    <motion.div
                                        className="card"
                                        whileHover={{ x: 4, scale: 1.005 }}
                                        style={{
                                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                                            borderLeft: `3px solid ${sc.border}`,
                                            background: sc.bg,
                                        }}
                                        onClick={() => navigate(`/admin/assessments/${assessment.id}`)}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{assessment.title}</h3>
                                                {assessment.isLocked && <span>🔒</span>}
                                                {getStatusBadge(assessment.status)}
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                                <span>🎓 {getProgramName(assessment.programId)}</span>
                                                <span>📅 {format(new Date(assessment.startAt), 'dd MMM yyyy, HH:mm')}</span>
                                                <span>⏰ {format(new Date(assessment.deadline), 'dd MMM yyyy, HH:mm')}</span>
                                                <span>📎 {assessment.attachedFiles?.length || 0} files</span>
                                            </div>
                                        </div>
                                        <span style={{ color: 'var(--accent-primary)', fontSize: '20px', fontWeight: 600 }}>→</span>
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
