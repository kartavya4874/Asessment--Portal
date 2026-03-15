import { motion } from 'framer-motion';

export function SkeletonCard() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '24px',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '12px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: '8px', borderRadius: '6px' }} />
                    <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: '6px' }} />
                </div>
            </div>
            {/* Body */}
            <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: '10px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ height: 14, width: '85%', marginBottom: '10px', borderRadius: '6px' }} />
            <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: '6px' }} />
            {/* Footer */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                <div className="skeleton" style={{ height: 32, flex: 1, borderRadius: '8px' }} />
                <div className="skeleton" style={{ height: 32, width: 60, borderRadius: '8px' }} />
            </div>
        </motion.div>
    );
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', gap: '16px', padding: '16px 20px',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
            }}>
                {[80, 120, 100, 80, 60, 80].map((w, i) => (
                    <div key={i} className="skeleton" style={{ height: 14, width: w, borderRadius: '6px' }} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{
                    display: 'flex', gap: '16px', padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                }}>
                    {[80, 120, 100, 80, 60, 80].map((w, j) => (
                        <div key={j} className="skeleton" style={{ height: 14, width: w, borderRadius: '6px' }} />
                    ))}
                </div>
            ))}
        </motion.div>
    );
}

export function SkeletonLine({ width = '100%', height = 14 }) {
    return (
        <div className="skeleton" style={{ height, width, borderRadius: '6px' }} />
    );
}
