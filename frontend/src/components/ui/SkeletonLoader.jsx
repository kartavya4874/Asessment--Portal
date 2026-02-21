export function SkeletonLine({ width = '100%', height = '16px', className = '' }) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{ width, height, borderRadius: '6px' }}
        />
    );
}

export function SkeletonCard({ className = '' }) {
    return (
        <div className={`card ${className}`} style={{ padding: '24px' }}>
            <SkeletonLine width="60%" height="20px" />
            <div style={{ height: 12 }} />
            <SkeletonLine width="100%" height="14px" />
            <div style={{ height: 8 }} />
            <SkeletonLine width="80%" height="14px" />
            <div style={{ height: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
                <SkeletonLine width="80px" height="28px" />
                <SkeletonLine width="100px" height="28px" />
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonLine width="100%" height="40px" />
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonLine key={i} width="100%" height="36px" />
            ))}
        </div>
    );
}
