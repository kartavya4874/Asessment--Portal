import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import PageTransition from '../components/ui/PageTransition';
import AnimatedBackground from '../components/ui/AnimatedBackground';

const features = [
    { icon: '📝', title: 'Smart Assessments', desc: 'Create rich assessments with file attachments, deadlines, and auto-status tracking' },
    { icon: '📊', title: 'Track Progress', desc: 'Real-time submission tracking, marks publishing, and detailed analytics' },
    { icon: '⚡', title: 'Instant Feedback', desc: 'Grade submissions with marks and personalized feedback in seconds' },
];

function TypingText({ texts, speed = 60, pause = 2000 }) {
    const [displayText, setDisplayText] = useState('');
    const [textIndex, setTextIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentText = texts[textIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (charIndex < currentText.length) {
                    setDisplayText(currentText.slice(0, charIndex + 1));
                    setCharIndex(c => c + 1);
                } else {
                    setTimeout(() => setIsDeleting(true), pause);
                }
            } else {
                if (charIndex > 0) {
                    setDisplayText(currentText.slice(0, charIndex - 1));
                    setCharIndex(c => c - 1);
                } else {
                    setIsDeleting(false);
                    setTextIndex((textIndex + 1) % texts.length);
                }
            }
        }, isDeleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

    return (
        <span>
            {displayText}
            <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ color: 'var(--accent-primary)' }}
            >|</motion.span>
        </span>
    );
}

export default function LandingPage() {
    return (
        <PageTransition>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(20px, 4vw, 40px) clamp(16px, 3vw, 24px)',
                background: 'var(--bg-primary)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <AnimatedBackground />

                {/* Content wrapper */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px', width: '100%' }}>
                    {/* Logo */}
                    <motion.div
                        initial={{ y: -40, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{ marginBottom: '20px' }}
                    >
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                width: 'clamp(64px, 12vw, 90px)', height: 'clamp(64px, 12vw, 90px)', borderRadius: '24px',
                                background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid), var(--gradient-end))',
                                backgroundSize: '200% 200%',
                                animation: 'gradient-shift 4s ease infinite',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 'clamp(28px, 6vw, 44px)',
                                boxShadow: '0 20px 60px var(--glow-primary), 0 0 120px var(--glow-secondary)',
                            }}
                        >
                            🧪
                        </motion.div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, textAlign: 'center',
                            marginBottom: '16px', lineHeight: 1.1, letterSpacing: '-0.02em',
                        }}
                    >
                        <span className="text-shimmer">AI Lab</span>{' '}
                        <span style={{ color: 'var(--text-primary)' }}>Assessment Portal</span>
                    </motion.h1>

                    {/* Typing subtitle */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.7 }}
                        style={{
                            fontSize: '18px', color: 'var(--text-secondary)',
                            textAlign: 'center', maxWidth: '550px', lineHeight: 1.7,
                            marginBottom: '52px', minHeight: '28px',
                        }}
                    >
                        <TypingText
                            texts={[
                                "Manage assessments, submit work, and track your progress.",
                                "Geeta University's AI Training Lab platform.",
                                "Create, grade, and analyze student submissions.",
                            ]}
                        />
                    </motion.div>

                    {/* Action Cards */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.7 }}
                        style={{ display: 'flex', gap: 'clamp(16px, 3vw, 24px)', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 'clamp(32px, 6vw, 64px)', width: '100%' }}
                    >
                        <Link to="/admin/login" style={{ textDecoration: 'none' }}>
                            <motion.div
                                className="card-glow"
                                whileHover={{ y: -10, scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: 'clamp(240px, 40vw, 280px)', padding: 'clamp(24px, 4vw, 40px) clamp(20px, 3vw, 30px)', borderRadius: '20px',
                                    textAlign: 'center', cursor: 'pointer',
                                    background: 'var(--surface)', flex: '1 1 240px', maxWidth: '320px',
                                }}
                            >
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{
                                        fontSize: '48px', marginBottom: '20px',
                                        filter: 'drop-shadow(0 4px 15px var(--glow-primary))',
                                    }}
                                >👨‍🏫</motion.div>
                                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Trainer</h2>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                                    Create & manage programs, assessments, and grade student submissions
                                </p>
                                <div className="btn-primary" style={{ display: 'inline-block' }}>
                                    Admin Login →
                                </div>
                            </motion.div>
                        </Link>

                        <Link to="/student/login" style={{ textDecoration: 'none' }}>
                            <motion.div
                                className="card-glow"
                                whileHover={{ y: -10, scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: 'clamp(240px, 40vw, 280px)', padding: 'clamp(24px, 4vw, 40px) clamp(20px, 3vw, 30px)', borderRadius: '20px',
                                    textAlign: 'center', cursor: 'pointer',
                                    background: 'var(--surface)', flex: '1 1 240px', maxWidth: '320px',
                                }}
                            >
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                    style={{
                                        fontSize: '48px', marginBottom: '20px',
                                        filter: 'drop-shadow(0 4px 15px var(--glow-secondary))',
                                    }}
                                >🎓</motion.div>
                                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>Student</h2>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                                    View assessments, submit your work, and check your marks & feedback
                                </p>
                                <div style={{
                                    padding: '12px 28px', borderRadius: '10px',
                                    border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)',
                                    fontWeight: 600, fontSize: '14px', display: 'inline-block',
                                    transition: 'all 0.3s',
                                }}>
                                    Student Login →
                                </div>
                            </motion.div>
                        </Link>
                    </motion.div>

                    {/* Features Section */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.7 }}
                        style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '20px', width: '100%', maxWidth: '750px', marginBottom: '40px',
                        }}
                    >
                        {features.map((feat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -4 }}
                                style={{
                                    padding: '24px', borderRadius: '14px', textAlign: 'center',
                                    background: 'rgba(124,108,240,0.04)',
                                    border: '1px solid rgba(124,108,240,0.08)',
                                    transition: 'all 0.3s',
                                }}
                            >
                                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{feat.icon}</div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>{feat.title}</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feat.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    style={{
                        position: 'absolute', bottom: '24px', fontSize: '12px',
                        color: 'var(--text-secondary)', zIndex: 1, textAlign: 'center',
                    }}
                >
                    © {new Date().getFullYear()} Geeta University — AI Training Lab
                </motion.div>
            </div>
        </PageTransition>
    );
}
