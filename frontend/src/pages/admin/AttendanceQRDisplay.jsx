import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function AttendanceQRDisplay() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(30);
    const [presentCount, setPresentCount] = useState(0);
    const [lateCount, setLateCount] = useState(0);
    const [lastScanName, setLastScanName] = useState('');
    const intervalRef = useRef(null);
    const countdownRef = useRef(null);
    const audioRef = useRef(null);

    // Initialize
    useEffect(() => {
        fetchSession();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const fetchSession = async () => {
        try {
            const res = await client.get(`/attendance/sessions/${id}`);
            setSession(res.data);
            setPresentCount(res.data.presentCount);
            setLateCount(res.data.lateCount);

            if (res.data.isActive) {
                await refreshQR();
                startAutoRefresh();
            }
        } catch (err) {
            toast.error('Failed to load session');
            navigate('/admin/attendance');
        } finally {
            setLoading(false);
        }
    };

    const refreshQR = useCallback(async () => {
        try {
            const res = await client.post(`/attendance/sessions/${id}/refresh-qr`);
            setQrData(res.data);
            setCountdown(30);

            // Check if attendance count changed
            if (res.data.presentCount > presentCount || res.data.lateCount > lateCount) {
                setPresentCount(res.data.presentCount);
                setLateCount(res.data.lateCount);
                // Play a subtle notification sound
                try {
                    if (audioRef.current) audioRef.current.play().catch(() => { });
                } catch (e) { }
            }
            setPresentCount(res.data.presentCount);
            setLateCount(res.data.lateCount);
        } catch (err) {
            if (err.response?.status === 400) {
                toast.error('Session is no longer active');
                clearInterval(intervalRef.current);
                clearInterval(countdownRef.current);
            }
        }
    }, [id, presentCount, lateCount]);

    const startAutoRefresh = () => {
        // Refresh QR every 30 seconds
        intervalRef.current = setInterval(() => {
            refreshQR();
        }, 30000);

        // Countdown timer
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) return 30;
                return prev - 1;
            });
        }, 1000);
    };

    const handleEnd = async () => {
        if (!window.confirm('End this session?')) return;
        try {
            await client.put(`/attendance/sessions/${id}/end`);
            toast.success('Session ended');
            navigate('/admin/attendance');
        } catch (err) {
            toast.error('Failed to end session');
        }
    };

    // Generate QR code SVG using a simple QR algorithm via API
    const generateQRSvg = (text) => {
        // We'll use an embedded QR code library approach - generating via Google Charts API as a fallback
        const encoded = encodeURIComponent(text);
        return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encoded}&bgcolor=0a0a16&color=ffffff&format=svg`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <div className="skeleton" style={{ width: 300, height: 300, borderRadius: '24px' }} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 100px)',
                textAlign: 'center',
                padding: '20px',
            }}
        >
            {/* Hidden audio for notification */}
            <audio ref={audioRef} preload="auto">
                <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGjmR1+rVcEQiQ47R5dR+TzI+hcnc0XtROj+Aw9LJfFQ+PYG/xsB8VEA+" type="audio/wav" />
            </audio>

            {/* Session Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '16px' }}
            >
                <h1 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 800 }}>
                    <span className="gradient-text">{session?.title}</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                    Scan the QR code below to mark your attendance
                </p>
            </motion.div>

            {/* QR Code Card */}
            <motion.div
                className="card-glow"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxWidth: '500px',
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Animated background gradient */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 50% 0%, var(--glow-primary) 0%, transparent 60%)',
                    opacity: 0.3,
                    pointerEvents: 'none',
                }} />

                {qrData?.qrUrl ? (
                    <motion.div
                        key={qrData.qrToken}
                        initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            background: '#ffffff',
                            padding: '20px',
                            borderRadius: '20px',
                            boxShadow: '0 8px 40px var(--glow-primary), 0 0 80px var(--glow-secondary)',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <img
                            src={generateQRSvg(qrData.qrUrl)}
                            alt="Attendance QR Code"
                            style={{ width: 'clamp(200px, 40vw, 320px)', height: 'clamp(200px, 40vw, 320px)', display: 'block' }}
                        />
                    </motion.div>
                ) : (
                    <div style={{ padding: '60px', color: 'var(--text-secondary)' }}>
                        Session is not active
                    </div>
                )}

                {/* Countdown Timer */}
                {qrData && (
                    <motion.div
                        style={{
                            marginTop: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div style={{
                            position: 'relative',
                            width: '52px',
                            height: '52px',
                        }}>
                            <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border)" strokeWidth="4" />
                                <motion.circle
                                    cx="26" cy="26" r="22" fill="none"
                                    stroke="var(--accent-primary)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 22}
                                    strokeDashoffset={2 * Math.PI * 22 * (1 - countdown / 30)}
                                    transition={{ duration: 0.5 }}
                                />
                            </svg>
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 800,
                                color: countdown <= 5 ? 'var(--error)' : 'var(--text-primary)',
                            }}>
                                {countdown}s
                            </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>QR refreshes in</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: countdown <= 5 ? 'var(--error)' : 'var(--text-primary)' }}>
                                {countdown <= 5 ? 'Refreshing soon...' : 'Keep scanning'}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Live Stats */}
            <div style={{
                display: 'flex',
                gap: '24px',
                marginTop: '24px',
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                <motion.div
                    className="card"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 0.3, repeatType: 'reverse' }}
                    key={`present-${presentCount}`}
                    style={{ minWidth: '140px', textAlign: 'center' }}
                >
                    <div style={{ fontSize: '40px', fontWeight: 800, color: 'var(--success)' }} className="stat-value">
                        {presentCount}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>✅ Present</div>
                </motion.div>

                <motion.div
                    className="card"
                    key={`late-${lateCount}`}
                    style={{ minWidth: '140px', textAlign: 'center' }}
                >
                    <div style={{ fontSize: '40px', fontWeight: 800, color: 'var(--warning)' }} className="stat-value">
                        {lateCount}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>⏰ Late</div>
                </motion.div>

                <motion.div
                    className="card"
                    style={{ minWidth: '140px', textAlign: 'center' }}
                >
                    <div style={{ fontSize: '40px', fontWeight: 800, color: 'var(--accent-primary)' }} className="stat-value">
                        {presentCount + lateCount}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>📊 Total</div>
                </motion.div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <motion.button
                    className="btn-secondary"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/admin/attendance/${id}`)}
                    style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                    📋 View Details
                </motion.button>
                <motion.button
                    className="btn-danger"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleEnd}
                    style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                    ⏹️ End Session
                </motion.button>
            </div>
        </motion.div>
    );
}
