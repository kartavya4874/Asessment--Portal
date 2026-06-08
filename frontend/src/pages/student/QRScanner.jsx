import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function QRScanner() {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null); // null | { status, data }
    const [errorMessage, setErrorMessage] = useState('');
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef(null);
    const processingRef = useRef(false);

    const startScanner = async () => {
        setCameraError('');
        setResult(null);
        setErrorMessage('');
        processingRef.current = false;

        try {
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                async (decodedText) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    // Parse the QR URL to extract session + token
                    try {
                        const url = new URL(decodedText);
                        const sessionId = url.searchParams.get('session');
                        const qrToken = url.searchParams.get('token');

                        if (!sessionId || !qrToken) {
                            setErrorMessage('Invalid QR code format. Not an attendance QR.');
                            setResult({ status: 'error' });
                            await stopScanner();
                            return;
                        }

                        // Mark attendance via API
                        try {
                            const res = await client.post('/attendance/mark', {
                                sessionId,
                                qrToken,
                            });
                            setResult({ status: 'success', data: res.data });
                            toast.success('Attendance marked! ✅');
                        } catch (err) {
                            const detail = err.response?.data?.detail || 'Failed to mark attendance';
                            setErrorMessage(detail);
                            if (detail.toLowerCase().includes('already')) {
                                setResult({ status: 'already' });
                            } else {
                                setResult({ status: 'error' });
                            }
                        }
                        await stopScanner();
                    } catch (e) {
                        // Not a valid URL — might be a non-attendance QR
                        setErrorMessage('This QR code is not a valid attendance code.');
                        setResult({ status: 'error' });
                        await stopScanner();
                    }
                },
                () => {
                    // QR scan error (no code found in frame) — ignore silently
                }
            );
            setScanning(true);
        } catch (err) {
            console.error('Camera error:', err);
            setCameraError(
                typeof err === 'string'
                    ? err
                    : err?.message || 'Unable to access camera. Please allow camera permissions.'
            );
        }
    };

    const stopScanner = async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        } catch (e) {
            // ignore
        }
        setScanning(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch (e) { /* ignore */ }
            }
        };
    }, []);

    const statusConfig = {
        success: {
            icon: '✅',
            title: 'Attendance Marked!',
            subtitle: result?.data?.status === 'late'
                ? `You're marked as Late for "${result?.data?.sessionTitle}"`
                : `You're Present for "${result?.data?.sessionTitle}"`,
            color: result?.data?.status === 'late' ? 'var(--warning)' : 'var(--success)',
            bg: result?.data?.status === 'late' ? 'rgba(255, 193, 69, 0.1)' : 'rgba(0, 210, 160, 0.1)',
        },
        already: {
            icon: '📋',
            title: 'Already Marked',
            subtitle: 'Your attendance was already recorded for this session.',
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, marginBottom: '6px' }}>
                        <span className="gradient-text">📱 Scan QR Code</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Point your camera at the QR code displayed by your instructor
                    </p>
                </div>
                <motion.button
                    onClick={() => navigate('/student/attendance')}
                    className="btn-secondary"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                    📊 My Attendance
                </motion.button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                {/* Scanner Area */}
                {!result && (
                    <motion.div
                        className="card-glow"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            padding: '24px',
                            textAlign: 'center',
                        }}
                    >
                        {/* Scanner viewport */}
                        <div
                            id="qr-reader"
                            style={{
                                width: '100%',
                                maxWidth: '320px',
                                margin: '0 auto 20px',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                background: 'var(--bg-secondary)',
                                border: scanning ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
                                minHeight: scanning ? 'auto' : '280px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                transition: 'border-color 0.3s',
                            }}
                        >
                            {!scanning && !cameraError && (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>📷</div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        Tap the button below to open the camera
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Camera Error */}
                        {cameraError && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 92, 138, 0.1)',
                                    border: '1px solid rgba(255, 92, 138, 0.2)',
                                    marginBottom: '16px',
                                    fontSize: '13px',
                                    color: 'var(--error)',
                                }}
                            >
                                ⚠️ {cameraError}
                            </motion.div>
                        )}

                        {/* Scanning indicator */}
                        {scanning && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginBottom: '16px',
                                    color: 'var(--accent-primary)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                }}
                            >
                                <motion.span
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: 'var(--accent-primary)',
                                        display: 'inline-block',
                                        boxShadow: '0 0 10px var(--glow-primary)',
                                    }}
                                />
                                Scanning for QR code...
                            </motion.div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            {!scanning ? (
                                <motion.button
                                    className="btn-primary"
                                    onClick={startScanner}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ padding: '14px 32px', fontSize: '15px', width: '100%' }}
                                >
                                    📱 Open Camera Scanner
                                </motion.button>
                            ) : (
                                <motion.button
                                    className="btn-secondary"
                                    onClick={stopScanner}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ padding: '12px 24px', fontSize: '14px' }}
                                >
                                    ⏹️ Stop Scanner
                                </motion.button>
                            )}
                        </div>

                        {/* Help text */}
                        <div style={{
                            marginTop: '20px',
                            padding: '14px',
                            borderRadius: '12px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                        }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                💡 <strong>How it works:</strong> Your instructor displays a QR code on the projector.
                                Open the scanner and point your phone camera at it. Your attendance will be marked automatically!
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Result Display */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            className="card-glow"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
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
                                background: `radial-gradient(circle at 50% 30%, ${statusConfig[result.status]?.bg} 0%, transparent 70%)`,
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
                                    background: statusConfig[result.status]?.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '40px',
                                    margin: '0 auto 20px',
                                    position: 'relative',
                                    zIndex: 1,
                                }}
                            >
                                {statusConfig[result.status]?.icon}
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                style={{
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    color: statusConfig[result.status]?.color,
                                    marginBottom: '8px',
                                    position: 'relative',
                                    zIndex: 1,
                                }}
                            >
                                {statusConfig[result.status]?.title}
                            </motion.h2>

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
                                {statusConfig[result.status]?.subtitle}
                            </motion.p>

                            {/* Time info for success */}
                            {result.status === 'success' && result.data && (
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
                                        <span style={{ fontWeight: 600 }}>{result.data.studentName}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Time</span>
                                        <span style={{ fontWeight: 600 }}>
                                            {new Date(result.data.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                                        <span className={`badge ${result.data.status === 'late' ? 'badge-late' : 'badge-active'}`}>
                                            {result.data.status === 'late' ? '⏰ Late' : '✅ Present'}
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Actions */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                style={{ marginTop: '24px', position: 'relative', zIndex: 1, display: 'flex', gap: '12px', flexDirection: 'column' }}
                            >
                                {result.status === 'error' && (
                                    <motion.button
                                        className="btn-primary"
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            setResult(null);
                                            setErrorMessage('');
                                            setCameraError('');
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        🔄 Try Again
                                    </motion.button>
                                )}
                                <motion.button
                                    className={result.status === 'error' ? 'btn-secondary' : 'btn-primary'}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate('/student/attendance')}
                                    style={{ width: '100%' }}
                                >
                                    📊 View My Attendance
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
