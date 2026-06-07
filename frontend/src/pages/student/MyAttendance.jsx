import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function MyAttendance() {
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('daywise'); // 'daywise' | 'list'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [recordsRes, statsRes] = await Promise.all([
                client.get('/attendance/my'),
                client.get('/attendance/my/stats'),
            ]);
            setRecords(recordsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
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

    const getDateKey = (dateStr) => {
        const d = new Date(dateStr);
        return d.toISOString().split('T')[0];
    };

    // Group records by date for day-wise view
    const groupedByDate = records.reduce((acc, record) => {
        const dateKey = getDateKey(record.sessionDate || record.markedAt);
        if (!acc[dateKey]) {
            acc[dateKey] = {
                date: record.sessionDate || record.markedAt,
                sessions: [],
            };
        }
        acc[dateKey].sessions.push(record);
        return acc;
    }, {});

    // Sort dates descending
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    // Determine slot info from API data or fallback to time-based guess
    const SLOT_CONFIG = {
        morning_checkin: { label: 'Morning Check-in', icon: '🌅', color: 'var(--accent-secondary)' },
        pre_lunch: { label: 'Pre-Lunch', icon: '🕐', color: 'var(--warning)' },
        post_lunch: { label: 'Post-Lunch', icon: '☀️', color: 'var(--success)' },
        end_of_day: { label: 'End of Day', icon: '🌇', color: 'var(--accent-tertiary)' },
    };

    const getSlotInfo = (session) => {
        // Use API-provided slotType if available
        if (session.slotType && SLOT_CONFIG[session.slotType]) {
            return SLOT_CONFIG[session.slotType];
        }
        // Fallback: guess from time
        const hour = new Date(session.markedAt).getHours();
        if (hour >= 8 && hour < 11) return SLOT_CONFIG.morning_checkin;
        if (hour >= 11 && hour < 13) return SLOT_CONFIG.pre_lunch;
        if (hour >= 13 && hour < 15) return SLOT_CONFIG.post_lunch;
        if (hour >= 15 && hour < 18) return SLOT_CONFIG.end_of_day;
        return { label: 'Session', icon: '📋', color: 'var(--accent-primary)' };
    };

    // Attendance percentage color
    const getPercentageColor = (pct) => {
        if (pct >= 90) return 'var(--success)';
        if (pct >= 75) return 'var(--accent-secondary)';
        if (pct >= 50) return 'var(--warning)';
        return 'var(--error)';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '16px' }} />
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
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, marginBottom: '6px' }}>
                <span className="gradient-text">📊 My Attendance</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                Track your daily attendance and statistics
            </p>

            {/* Stats Overview */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {/* Attendance Ring */}
                    <motion.div
                        className="card-glow"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                    >
                        <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '12px' }}>
                            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                                <motion.circle
                                    cx="50" cy="50" r="42" fill="none"
                                    stroke={getPercentageColor(stats.attendancePercentage)}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 42}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - stats.attendancePercentage / 100) }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                            </svg>
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <span className="stat-value" style={{ fontSize: '24px', fontWeight: 800, color: getPercentageColor(stats.attendancePercentage) }}>
                                    {stats.attendancePercentage}%
                                </span>
                            </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Overall Attendance</div>
                        {stats.attendancePercentage < 75 && (
                            <div style={{ fontSize: '11px', color: 'var(--error)', marginTop: '4px', fontWeight: 600 }}>
                                ⚠️ Below 75% threshold
                            </div>
                        )}
                    </motion.div>

                    {[
                        { label: 'Total Sessions', value: stats.totalSessions, icon: '📅', color: 'var(--accent-primary)' },
                        { label: 'Present', value: stats.presentCount, icon: '✅', color: 'var(--success)' },
                        { label: 'Late', value: stats.lateCount, icon: '⏰', color: 'var(--warning)' },
                        { label: 'Absent', value: stats.absentCount, icon: '❌', color: 'var(--error)' },
                        { label: 'Current Streak', value: `${stats.currentStreak} 🔥`, icon: '🔥', color: 'var(--accent-tertiary)' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            className="card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                            <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800, color: stat.color, marginTop: '8px' }}>{stat.value}</div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Attendance History</h2>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
                    {[
                        { key: 'daywise', label: '📅 Day-wise' },
                        { key: 'list', label: '📋 All Sessions' },
                    ].map(v => (
                        <button
                            key={v.key}
                            onClick={() => setView(v.key)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: view === v.key ? 700 : 400,
                                background: view === v.key
                                    ? 'linear-gradient(135deg, rgba(124,108,240,0.15), rgba(78,168,222,0.1))'
                                    : 'transparent',
                                color: view === v.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Records */}
            {records.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Attendance Records</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Scan a QR code displayed by your instructor to mark attendance
                    </p>
                </div>
            ) : view === 'daywise' ? (
                /* Day-wise grouped view */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sortedDates.map((dateKey, di) => {
                        const group = groupedByDate[dateKey];
                        return (
                            <motion.div
                                key={dateKey}
                                className="card"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: di * 0.08 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px',
                                            boxShadow: '0 4px 12px var(--glow-primary)',
                                        }}>
                                            📅
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{formatDate(group.date)}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''} attended
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '4px',
                                    }}>
                                        {group.sessions.map((s, si) => (
                                            <span
                                                key={si}
                                                className={`badge ${s.status === 'present' ? 'badge-active' : 'badge-late'}`}
                                                style={{ fontSize: '10px' }}
                                            >
                                                {s.status === 'present' ? '✅' : '⏰'}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Slots for the day */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                    {group.sessions.map((session, si) => {
                                        const slot = getSlotInfo(session);
                                        return (
                                            <div
                                                key={si}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 14px',
                                                    borderRadius: '10px',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border)',
                                                }}
                                            >
                                                <span style={{ fontSize: '20px' }}>{slot.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{session.sessionTitle}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        {formatTime(session.markedAt)} · {slot.label}
                                                    </div>
                                                </div>
                                                <span className={`badge ${session.status === 'present' ? 'badge-active' : 'badge-late'}`} style={{ fontSize: '10px' }}>
                                                    {session.status === 'present' ? 'Present' : 'Late'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                /* All sessions flat list */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {records.map((record, i) => {
                        const slot = getSlotInfo(record);
                        return (
                            <motion.div
                                key={record.id}
                                className="card"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{ padding: '14px 20px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '22px' }}>{slot.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{record.sessionTitle}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {formatDate(record.sessionDate)} · {formatTime(record.markedAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`badge ${record.status === 'present' ? 'badge-active' : 'badge-late'}`}>
                                        {record.status === 'present' ? '✅ Present' : '⏰ Late'}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
