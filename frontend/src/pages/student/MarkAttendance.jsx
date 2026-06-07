import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function MarkAttendance() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'already'
    const [result, setResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const sessionId = searchParams.get('session');
    const qrToken = searchParams.get('token');

    useEffect(() => {
        if (!sessionId || !qrToken) {
            setStatus('error');
            setErrorMessage('Invalid QR code. Missing session or token.');
            return;
        }
        markAttendance();
    }, []);

    const markAttendance = async () => {
        try {
            const res = await client.post('/attendance/mark', {
                sessionId,
                qrToken,
            });
            setResult(res.data);
            setStatus('success');
            toast.success('Attendance marked! ✅');
        } catch (err) {
            const detail = err.response?.data?.detail || 'Failed to mark attendance';
            setErrorMessage(detail);

            if (detail.includes('already')) {
                setStatus('already');
            } else {
                setStatus('error');
            }
        }
    };

    const statusConfig = {
        loading: {
            icon: '⏳',
            title: 'Marking Attendance...',
            subtitle: 'Please wait while we verify your QR code',
            color: 'var(--accent-primary)',
            bg: 'rgba(124, 108, 240, 0.1)',
        },
        success: {
            icon: '✅',
            title: 'Attendance Marked!',
            subtitle: result?.status === 'late'
                ? `You're marked as Late for "${result?.sessionTitle}"`
                : `You're Present for "${result?.sessionTitle}"`,
            color: result?.status === 'late' ? 'var(--warning)' : 'var(--success)',
            bg: result?.status === 'late' ? 'rgba(255, 193, 69, 0.1)' : 'rgba(0, 210, 160, 0.1)',
        },
        already: {
            icon: '📋',
            title: 'Already Marked',
            subtitle: 'Your attendance was already recorded for this session',
            color: 'var(--accent-secondary)',
            bg: 'rgba(78, 168, 222, 0.1)',
        },
        error: {
            icon: '❌',
            title: 'Could Not Mark Attendance',
            subtitle: errorMessage,
            color: 'var(--error)',
            bg: 'rgba(255, 92, 138, 0.1)',
        },
    };

    const config = statusConfig[status];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 100px)',
            padding: '20px',
        }}>
            <motion.div
                className="card-glow"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{
                    maxWidth: '420px',
                    width: '100%',
                    textAlign: 'center',
                    padding: '40px 32px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background glow */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 50% 30%, ${config.bg} 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* Status Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '20px',
                        background: config.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        margin: '0 auto 20px',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {status === 'loading' ? (
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            ⏳
                        </motion.span>
                    ) : (
                        config.icon
                    )}
                </motion.div>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: config.color,
                        marginBottom: '8px',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {config.title}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        marginBottom: '8px',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {config.subtitle}
                </motion.p>

                {/* Time info for success */}
                {status === 'success' && result && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        style={{
                            marginTop: '16px',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                            <span style={{ fontWeight: 600 }}>{result.studentName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Time</span>
                            <span style={{ fontWeight: 600 }}>
                                {new Date(result.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                            <span className={`badge ${result.status === 'late' ? 'badge-late' : 'badge-active'}`}>
                                {result.status === 'late' ? '⏰ Late' : '✅ Present'}
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Actions */}
                {status !== 'loading' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        style={{ marginTop: '24px', position: 'relative', zIndex: 1 }}
                    >
                        <motion.button
                            className="btn-primary"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/student/attendance')}
                            style={{ width: '100%' }}
                        >
                            📊 View My Attendance
                        </motion.button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
