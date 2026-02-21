import { useState, useEffect } from 'react';
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export default function CountdownTimer({ deadline }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [urgency, setUrgency] = useState('normal');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const deadlineDate = new Date(deadline);
            const diffSecs = differenceInSeconds(deadlineDate, now);

            if (diffSecs <= 0) {
                setTimeLeft('Closed');
                setUrgency('closed');
                return;
            }

            const days = differenceInDays(deadlineDate, now);
            const hours = differenceInHours(deadlineDate, now) % 24;
            const minutes = differenceInMinutes(deadlineDate, now) % 60;
            const seconds = diffSecs % 60;

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
                setUrgency('normal');
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                setUrgency(hours < 3 ? 'warning' : 'normal');
            } else {
                setTimeLeft(`${minutes}m ${seconds}s`);
                setUrgency('critical');
            }
        };

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    const colors = {
        normal: 'var(--accent-secondary)',
        warning: 'var(--warning)',
        critical: 'var(--error)',
        closed: 'var(--text-secondary)',
    };

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '8px',
            background: `${colors[urgency]}15`,
            color: colors[urgency],
            fontSize: '13px',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
        }}>
            <span>{urgency === 'closed' ? '⏹' : '⏱'}</span>
            <span>{timeLeft}</span>
        </div>
    );
}
