import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/client';
import toast from 'react-hot-toast';

export default function QRScanner() {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef(null);
    const processingRef = useRef(false);
    const mountedRef = useRef(true);

    // Zoom related states for students scanning from far/last benches
    const [zoomSupported, setZoomSupported] = useState(false);
    const [zoomValue, setZoomValue] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState({ min: 1, max: 5, step: 0.1 });

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            stopScannerSilent();
        };
    }, []);

    const stopScannerSilent = () => {
        try {
            if (scannerRef.current) {
                const s = scannerRef.current;
                scannerRef.current = null;
                s.stop().then(() => s.clear()).catch(() => {});
            }
        } catch (e) { /* ignore */ }
        if (mountedRef.current) {
            setZoomSupported(false);
        }
    };

    const startScanner = useCallback(async () => {
        setCameraError('');
        setResult(null);
        setErrorMessage('');
        processingRef.current = false;

        // Dynamically import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode');

        try {
            // Check if camera is available
            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length === 0) {
                setCameraError('No camera found on this device. Please use a device with a camera.');
                return;
            }

            const scanner = new Html5Qrcode('qr-reader-container');
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
                    return { width: Math.floor(size), height: Math.floor(size) };
                },
                aspectRatio: 1.0,
                disableFlip: false,
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                async (decodedText) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    try {
                        const url = new URL(decodedText);
                        const sessionId = url.searchParams.get('session');
                        const qrToken = url.searchParams.get('token');

                        if (!sessionId || !qrToken) {
                            if (mountedRef.current) {
                                setErrorMessage('Invalid QR code format. Not an attendance QR.');
                                setResult({ status: 'error' });
                            }
                            stopScannerSilent();
                            return;
                        }

                        try {
                            const res = await client.post('/attendance/mark', { sessionId, qrToken });
                            if (mountedRef.current) {
                                setResult({ status: 'success', data: res.data });
                                toast.success('Attendance marked! ✅');
                            }
                        } catch (err) {
                            if (mountedRef.current) {
                                const detail = err.response?.data?.detail || 'Failed to mark attendance';
                                setErrorMessage(detail);
                                setResult({ status: detail.toLowerCase().includes('already') ? 'already' : 'error' });
                            }
                        }
                        stopScannerSilent();
                    } catch (e) {
                        if (mountedRef.current) {
                            setErrorMessage('This QR code is not a valid attendance code.');
                            setResult({ status: 'error' });
                        }
                        stopScannerSilent();
                    }
                },
                () => { /* no QR found in frame — ignore */ }
            );

            if (mountedRef.current) {
                setScanning(true);
                // Attempt to detect camera capabilities (specifically zoom) after a short delay to ensure stream stability
                setTimeout(() => {
                    if (!mountedRef.current || !scannerRef.current) return;
                    try {
                        const capabilities = scannerRef.current.getRunningTrackCapabilities();
                        if (capabilities && capabilities.zoom) {
                            setZoomCapabilities({
                                min: capabilities.zoom.min || 1,
                                max: capabilities.zoom.max || 5,
                                step: capabilities.zoom.step || 0.1,
                            });
                            setZoomValue(capabilities.zoom.min || 1);
                            setZoomSupported(true);
                        } else {
                            setZoomSupported(false);
                        }
                    } catch (zoomErr) {
                        console.warn('Failed to get camera zoom capabilities:', zoomErr);
                        setZoomSupported(false);
                    }
                }, 250);
            }
        } catch (err) {
            console.error('Camera error:', err);
            if (mountedRef.current) {
                const msg = typeof err === 'string' ? err : (err?.message || '');
                if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
                    setCameraError('Camera permission denied. Please allow camera access in your browser settings and try again.');
                } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
                    setCameraError('No camera found. Please use a device with a camera.');
                } else if (msg.includes('NotReadableError') || msg.includes('Could not start')) {
                    setCameraError('Camera is being used by another app. Close other camera apps and try again.');
                } else {
                    setCameraError(msg || 'Unable to access camera. Please allow camera permissions in your browser settings.');
                }
            }
        }
    }, []);

    const applyZoom = useCallback(async (val) => {
        const parsedVal = Math.max(zoomCapabilities.min, Math.min(zoomCapabilities.max, parseFloat(val)));
        setZoomValue(parsedVal);
        if (scannerRef.current && zoomSupported) {
            try {
                await scannerRef.current.applyVideoConstraints({
                    advanced: [{ zoom: parsedVal }]
                });
            } catch (err) {
                console.error('Failed to apply zoom constraints:', err);
            }
        }
    }, [zoomSupported, zoomCapabilities]);

    const stopScanner = useCallback(async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        } catch (e) { /* ignore */ }
        if (mountedRef.current) {
            setScanning(false);
            setZoomSupported(false);
        }
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
                        {/* Placeholder when not scanning */}
                        {!scanning && !cameraError && (
                            <div style={{
                                width: '100%',
                                maxWidth: '320px',
                                margin: '0 auto 20px',
                                borderRadius: '16px',
                                background: 'var(--bg-secondary)',
                                border: '2px solid var(--border)',
                                minHeight: '280px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>📷</div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        Tap the button below to open the camera
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Scanner container — html5-qrcode renders its video here */}
                        <div
                            id="qr-reader-container"
                            style={{
                                width: '100%',
                                maxWidth: '320px',
                                margin: scanning ? '0 auto 20px' : '0',
                                borderRadius: scanning ? '16px' : '0',
                                overflow: scanning ? 'hidden' : 'visible',
                                border: scanning ? '2px solid var(--accent-primary)' : 'none',
                                display: scanning ? 'block' : 'none',
                            }}
                        />

                        {/* Camera Zoom Controls for far-bench students */}
                        {scanning && zoomSupported && (
                            <div style={{
                                width: '100%',
                                maxWidth: '320px',
                                margin: '0 auto 20px',
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'rgba(26, 26, 46, 0.4)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        🔍 Camera Zoom
                                    </span>
                                    <span style={{ 
                                        background: 'rgba(124, 108, 240, 0.15)', 
                                        color: 'var(--accent-primary)', 
                                        padding: '2px 8px', 
                                        borderRadius: '20px', 
                                        fontSize: '11px',
                                        fontWeight: 700 
                                    }}>
                                        {zoomValue.toFixed(1)}x
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <motion.button
                                        type="button"
                                        onClick={() => applyZoom(zoomValue - (zoomCapabilities.step * 2 || 0.2))}
                                        disabled={zoomValue <= zoomCapabilities.min}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: zoomValue <= zoomCapabilities.min ? 'not-allowed' : 'pointer',
                                            opacity: zoomValue <= zoomCapabilities.min ? 0.5 : 1,
                                        }}
                                    >
                                        ➖
                                    </motion.button>
                                    
                                    <input
                                        type="range"
                                        min={zoomCapabilities.min}
                                        max={zoomCapabilities.max}
                                        step={zoomCapabilities.step}
                                        value={zoomValue}
                                        onChange={(e) => applyZoom(e.target.value)}
                                        style={{
                                            flex: 1,
                                            height: '6px',
                                            borderRadius: '3px',
                                            background: 'var(--border)',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            accentColor: 'var(--accent-primary)',
                                        }}
                                    />

                                    <motion.button
                                        type="button"
                                        onClick={() => applyZoom(zoomValue + (zoomCapabilities.step * 2 || 0.2))}
                                        disabled={zoomValue >= zoomCapabilities.max}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: zoomValue >= zoomCapabilities.max ? 'not-allowed' : 'pointer',
                                            opacity: zoomValue >= zoomCapabilities.max ? 0.5 : 1,
                                        }}
                                    >
                                        ➕
                                    </motion.button>
                                </div>

                                {/* Quick Zoom Presets */}
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    {[1, 2, 3, 4].map((preset) => {
                                        if (preset >= zoomCapabilities.min && preset <= zoomCapabilities.max) {
                                            const isActive = Math.abs(zoomValue - preset) < 0.15;
                                            return (
                                                <motion.button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => applyZoom(preset)}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        borderRadius: '6px',
                                                        background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                        border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                        color: isActive ? '#fff' : 'var(--text-secondary)',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {preset}x
                                                </motion.button>
                                            );
                                        }
                                        return null;
                                    })}
                                    {zoomCapabilities.max > 4 && (
                                        <motion.button
                                            type="button"
                                            onClick={() => applyZoom(zoomCapabilities.max)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                padding: '6px 10px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                borderRadius: '6px',
                                                background: Math.abs(zoomValue - zoomCapabilities.max) < 0.15 ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                border: `1px solid ${Math.abs(zoomValue - zoomCapabilities.max) < 0.15 ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                color: Math.abs(zoomValue - zoomCapabilities.max) < 0.15 ? '#fff' : 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            Max ({zoomCapabilities.max.toFixed(0)}x)
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        )}

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
                                    lineHeight: 1.6,
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
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `radial-gradient(circle at 50% 30%, ${statusConfig[result.status]?.bg} 0%, transparent 70%)`,
                                pointerEvents: 'none',
                            }} />

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                                style={{
                                    width: '80px', height: '80px', borderRadius: '20px',
                                    background: statusConfig[result.status]?.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '40px', margin: '0 auto 20px', position: 'relative', zIndex: 1,
                                }}
                            >
                                {statusConfig[result.status]?.icon}
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                style={{ fontSize: '22px', fontWeight: 800, color: statusConfig[result.status]?.color, marginBottom: '8px', position: 'relative', zIndex: 1 }}
                            >
                                {statusConfig[result.status]?.title}
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px', position: 'relative', zIndex: 1 }}
                            >
                                {statusConfig[result.status]?.subtitle}
                            </motion.p>

                            {result.status === 'success' && result.data && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                    style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', position: 'relative', zIndex: 1 }}
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

                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                style={{ marginTop: '24px', position: 'relative', zIndex: 1, display: 'flex', gap: '12px', flexDirection: 'column' }}
                            >
                                {result.status === 'error' && (
                                    <motion.button className="btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        onClick={() => { setResult(null); setErrorMessage(''); setCameraError(''); }}
                                        style={{ width: '100%' }}
                                    >
                                        🔄 Try Again
                                    </motion.button>
                                )}
                                <motion.button
                                    className={result.status === 'error' ? 'btn-secondary' : 'btn-primary'}
                                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
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
