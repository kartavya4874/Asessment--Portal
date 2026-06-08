import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

const SLOT_TYPES = [
    { key: 'morning_checkin', label: '🌅 Morning Check-in', defaultDuration: 120 },
    { key: 'pre_lunch', label: '🕐 Pre-Lunch', defaultDuration: 30 },
    { key: 'post_lunch', label: '☀️ Post-Lunch', defaultDuration: 120 },
    { key: 'end_of_day', label: '🌇 End of Day', defaultDuration: 30 },
];

export default function AttendanceSessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [stats, setStats] = useState(null);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        slotType: 'morning_checkin',
        lateThresholdMinutes: 15,
        sessionDurationMinutes: 120,
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchSessions();
        fetchStats();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await client.get('/attendance/sessions');
            setSessions(res.data);
        } catch (err) {
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await client.get('/attendance/admin/stats');
            setStats(res.data);
        } catch (err) { /* ignore */ }
    };

    const generateTitle = (dateStr, slotType) => {
        const d = new Date(dateStr + 'T00:00:00');
        const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const slotLabel = SLOT_TYPES.find(s => s.key === slotType)?.label || 'Session';
        return `${formatted} — ${slotLabel}`;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.date) return toast.error('Please select a date');
        setCreating(true);
        const title = generateTitle(form.date, form.slotType);
        try {
            const res = await client.post('/attendance/sessions', { ...form, title });
            toast.success('Session created!');
            setShowModal(false);
            setForm({ date: new Date().toISOString().split('T')[0], slotType: 'morning_checkin', lateThresholdMinutes: 15, sessionDurationMinutes: 120 });
            navigate(`/admin/attendance/${res.data.id}/qr`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create session');
        } finally {
            setCreating(false);
        }
    };

    const handleEnd = async (sessionId) => {
        if (!window.confirm('End this session? Students will no longer be able to mark attendance.')) return;
        try {
            await client.put(`/attendance/sessions/${sessionId}/end`);
            toast.success('Session ended');
            fetchSessions();
        } catch (err) {
            toast.error('Failed to end session');
        }
    };

    const handleDelete = async (sessionId) => {
        if (!window.confirm('Delete this session and all its records? This cannot be undone.')) return;
        try {
            await client.delete(`/attendance/sessions/${sessionId}`);
            toast.success('Session deleted');
            fetchSessions();
        } catch (err) {
            toast.error('Failed to delete session');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800 }}>
                        <span className="gradient-text">📋 Attendance</span> Sessions
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        Create and manage attendance sessions with QR codes
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <motion.button
                        className="btn-secondary"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={async () => {
                            try {
                                toast.loading('Generating Excel...', { id: 'export' });
                                const res = await client.get('/attendance/admin/export/all', { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Attendance_Report.xlsx`;
                                a.click();
                                window.URL.revokeObjectURL(url);
                                toast.success('Excel downloaded!', { id: 'export' });
                            } catch (err) {
                                toast.error('Export failed', { id: 'export' });
                            }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        📥 Export All
                    </motion.button>
                    <motion.button
                        className="btn-primary"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        ➕ New Session
                    </motion.button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                        { label: 'Total Sessions', value: stats.totalSessions, icon: '📅', color: 'var(--accent-primary)' },
                        { label: 'Active Now', value: stats.activeSessions, icon: '🟢', color: 'var(--success)' },
                        { label: 'Total Students', value: stats.totalStudents, icon: '👥', color: 'var(--accent-secondary)' },
                        { label: 'Avg. Attendance', value: `${stats.averageAttendancePercentage}%`, icon: '📊', color: 'var(--accent-tertiary)' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            className="card-glow"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{stat.label}</div>
                                    <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800, color: stat.color, marginTop: '6px' }}>{stat.value}</div>
                                </div>
                                <span style={{ fontSize: '28px' }}>{stat.icon}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Sessions List */}
            {sessions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Sessions Yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Create your first attendance session to get started
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sessions.map((session, i) => (
                        <motion.div
                            key={session.id}
                            className="card"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/attendance/${session.id}`)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{session.title}</h3>
                                        {session.isActive ? (
                                            <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="glow-dot" style={{ width: 6, height: 6 }}></span> Live
                                            </span>
                                        ) : (
                                            <span className="badge badge-closed">Ended</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px', flexWrap: 'wrap' }}>
                                        <span>{session.slotLabel || '📋 Session'}</span>
                                        <span>📅 {formatDate(session.date)}</span>
                                        <span>🕐 {formatTime(session.sessionStart)}</span>
                                        <span>⏱️ Late after {session.lateThresholdMinutes}min</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>{session.presentCount}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Present</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--warning)' }}>{session.lateCount}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Late</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--error)' }}>
                                            {session.totalStudents - session.presentCount - session.lateCount}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Absent</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                        {session.isActive && (
                                            <>
                                                <motion.button
                                                    className="btn-primary"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => navigate(`/admin/attendance/${session.id}/qr`)}
                                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                                >
                                                    📱 Show QR
                                                </motion.button>
                                                <motion.button
                                                    className="btn-secondary"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleEnd(session.id)}
                                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                                >
                                                    ⏹️ End
                                                </motion.button>
                                            </>
                                        )}
                                        <motion.button
                                            className="btn-danger"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleDelete(session.id)}
                                            style={{ padding: '8px 14px', fontSize: '13px' }}
                                        >
                                            🗑️
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Session Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
                        }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            className="card-glow"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '480px' }}
                        >
                            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>
                                <span className="gradient-text">Create</span> Attendance Session
                            </h2>
                            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>📅 Session Date</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        autoFocus
                                        style={{
                                            colorScheme: 'dark',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Session Slot</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {SLOT_TYPES.map(slot => (
                                            <button
                                                type="button"
                                                key={slot.key}
                                                onClick={() => setForm({ ...form, slotType: slot.key, sessionDurationMinutes: slot.defaultDuration })}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    fontSize: '13px',
                                                    fontWeight: form.slotType === slot.key ? 700 : 400,
                                                    background: form.slotType === slot.key
                                                        ? 'linear-gradient(135deg, rgba(124,108,240,0.15), rgba(78,168,222,0.1))'
                                                        : 'var(--bg-secondary)',
                                                    color: form.slotType === slot.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                    border: form.slotType === slot.key ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                {slot.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Late After (mins)</label>
                                        <input
                                            type="number"
                                            value={form.lateThresholdMinutes}
                                            onChange={(e) => setForm({ ...form, lateThresholdMinutes: parseInt(e.target.value) || 15 })}
                                            min={1}
                                            max={120}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Duration (mins)</label>
                                        <input
                                            type="number"
                                            value={form.sessionDurationMinutes}
                                            onChange={(e) => setForm({ ...form, sessionDurationMinutes: parseInt(e.target.value) || 120 })}
                                            min={10}
                                            max={480}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <motion.button
                                        type="submit"
                                        className="btn-primary"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={creating}
                                        style={{ flex: 1 }}
                                    >
                                        {creating ? '⏳ Creating...' : '🚀 Create & Show QR'}
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowModal(false)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Cancel
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
