import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function AttendanceSessionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('present'); // 'present' | 'late' | 'absent'
    const [searchQuery, setSearchQuery] = useState('');
    const [programs, setPrograms] = useState([]);
    const [domains, setDomains] = useState([]);

    useEffect(() => {
        fetchSession();
        client.get('/programs').then(res => setPrograms(res.data)).catch(() => {});
        client.get('/domains').then(res => setDomains(res.data)).catch(() => {});
    }, [id]);

    const fetchSession = async () => {
        try {
            const res = await client.get(`/attendance/sessions/${id}`);
            setSession(res.data);
        } catch (err) {
            toast.error('Failed to load session');
            navigate('/admin/attendance');
        } finally {
            setLoading(false);
        }
    };

    const handleEnd = async () => {
        if (!window.confirm('End this session?')) return;
        try {
            await client.put(`/attendance/sessions/${id}/end`);
            toast.success('Session ended');
            fetchSession();
        } catch (err) {
            toast.error('Failed to end session');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getProgramName = (id) => programs.find(p => p.id === id)?.name || id;
    const getDomainName = (id) => domains.find(d => d.id === id)?.name || id;

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
                <div className="skeleton" style={{ height: '400px', borderRadius: '16px' }} />
            </div>
        );
    }

    if (!session) return null;

    const presentRecords = session.records?.filter(r => r.status === 'present') || [];
    const lateRecords = session.records?.filter(r => r.status === 'late') || [];
    const absentStudents = session.absentStudents || [];

    const filteredRecords = (tab === 'present' ? presentRecords : tab === 'late' ? lateRecords : absentStudents)
        .filter(r => {
            const name = (r.studentName || r.name || '').toLowerCase();
            const roll = (r.rollNumber || '').toLowerCase();
            const q = searchQuery.toLowerCase();
            return name.includes(q) || roll.includes(q);
        });

    const totalAttended = session.presentCount + session.lateCount;
    const attendancePercentage = session.totalStudents > 0
        ? ((totalAttended / session.totalStudents) * 100).toFixed(1)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Back Button */}
            <motion.button
                onClick={() => navigate('/admin/attendance')}
                className="btn-secondary"
                whileHover={{ scale: 1.02, x: -4 }}
                whileTap={{ scale: 0.98 }}
                style={{ marginBottom: '20px', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                ← Back to Sessions
            </motion.button>

            {/* Session Header */}
            <div className="card-glow" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800 }}>
                                {session.title}
                            </h1>
                            {session.isActive ? (
                                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="glow-dot" style={{ width: 6, height: 6 }}></span> Live
                                </span>
                            ) : (
                                <span className="badge badge-closed">Ended</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '14px', flexWrap: 'wrap' }}>
                            <span>📅 {formatDate(session.date)}</span>
                            <span>🕐 Started: {formatTime(session.sessionStart)}</span>
                            {session.sessionEnd && <span>🏁 Ended: {formatTime(session.sessionEnd)}</span>}
                        </div>
                        {(session.programId || session.domainId) && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                                {session.programId && (
                                    <span style={{ background: 'rgba(124,108,240,0.1)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                        🎓 Program: {getProgramName(session.programId)}
                                    </span>
                                )}
                                {session.domainId && (
                                    <span style={{ background: 'rgba(78,168,222,0.1)', color: 'var(--accent-secondary)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                        🌐 Subject/Domain: {getDomainName(session.domainId)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <motion.button
                            className="btn-secondary"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={async () => {
                                try {
                                    toast.loading('Generating Excel...', { id: 'export-session' });
                                    const res = await client.get(`/attendance/admin/export/session/${id}`, { responseType: 'blob' });
                                    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Attendance_${session.title}.xlsx`.replace(/ /g, '_');
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                    toast.success('Excel downloaded!', { id: 'export-session' });
                                } catch (err) {
                                    let msg = 'Export failed';
                                    try {
                                        if (err.response?.data instanceof Blob) {
                                            const text = await err.response.data.text();
                                            const parsed = JSON.parse(text);
                                            msg = parsed.detail || msg;
                                        } else {
                                            msg = err.response?.data?.detail || msg;
                                        }
                                    } catch (e) { /* ignore */ }
                                    toast.error(msg, { id: 'export-session' });
                                }
                            }}
                            style={{ padding: '10px 18px', fontSize: '13px' }}
                        >
                            📥 Export Excel
                        </motion.button>
                        {session.isActive && (
                            <>
                                <motion.button
                                    className="btn-primary"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate(`/admin/attendance/${id}/qr`)}
                                    style={{ padding: '10px 18px', fontSize: '13px' }}
                                >
                                    📱 Show QR
                                </motion.button>
                                <motion.button
                                    className="btn-danger"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleEnd}
                                    style={{ padding: '10px 18px', fontSize: '13px' }}
                                >
                                    ⏹️ End Session
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginTop: '20px' }}>
                    {[
                        { label: 'Present', value: session.presentCount, icon: '✅', color: 'var(--success)' },
                        { label: 'Late', value: session.lateCount, icon: '⏰', color: 'var(--warning)' },
                        { label: 'Absent', value: session.absentCount, icon: '❌', color: 'var(--error)' },
                        { label: 'Total', value: session.totalStudents, icon: '👥', color: 'var(--accent-secondary)' },
                        { label: 'Attendance', value: `${attendancePercentage}%`, icon: '📊', color: 'var(--accent-primary)' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08 }}
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                padding: '16px',
                                textAlign: 'center',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                            <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Tabs + Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
                    {[
                        { key: 'present', label: `✅ Present (${presentRecords.length})` },
                        { key: 'late', label: `⏰ Late (${lateRecords.length})` },
                        { key: 'absent', label: `❌ Absent (${absentStudents.length})` },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: tab === t.key ? 700 : 400,
                                background: tab === t.key
                                    ? 'linear-gradient(135deg, rgba(124,108,240,0.15), rgba(78,168,222,0.1))'
                                    : 'transparent',
                                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    placeholder="🔍 Search by name or roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: '280px' }}
                />
            </div>

            {/* Records Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {filteredRecords.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                            {tab === 'absent' ? '🎉' : '📭'}
                        </div>
                        <p style={{ fontSize: '14px' }}>
                            {tab === 'absent' && absentStudents.length === 0
                                ? 'Everyone is present! 🎉'
                                : searchQuery
                                    ? 'No matching records found'
                                    : `No ${tab} records`
                            }
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll Number</th>
                                    {tab !== 'absent' && (
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marked At</th>
                                    )}
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record, i) => (
                                    <motion.tr
                                        key={record.id || record.studentId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                                        <td style={{ padding: '12px 20px' }}>
                                            <div style={{ fontWeight: 600 }}>{record.studentName || record.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.email}</div>
                                        </td>
                                        <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '13px' }}>{record.rollNumber}</td>
                                        {tab !== 'absent' && (
                                            <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>
                                                {formatTime(record.markedAt)}
                                            </td>
                                        )}
                                        <td style={{ padding: '12px 20px' }}>
                                            <span className={`badge ${record.status === 'present' ? 'badge-active' : record.status === 'late' ? 'badge-late' : 'badge-closed'}`}>
                                                {record.status === 'present' ? '✅ Present' : record.status === 'late' ? '⏰ Late' : '❌ Absent'}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
