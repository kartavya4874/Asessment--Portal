import { motion } from 'framer-motion';

const orbs = [
  { size: 300, x: '15%', y: '20%', color: 'var(--gradient-start)', delay: 0, duration: 18 },
  { size: 250, x: '75%', y: '10%', color: 'var(--gradient-mid)', delay: 2, duration: 22 },
  { size: 200, x: '60%', y: '70%', color: 'var(--gradient-end)', delay: 4, duration: 20 },
  { size: 180, x: '25%', y: '80%', color: 'var(--gradient-mid)', delay: 1, duration: 24 },
  { size: 120, x: '85%', y: '50%', color: 'var(--gradient-start)', delay: 3, duration: 16 },
];

export default function AnimatedBackground({ variant = 'default' }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      {/* Gradient mesh background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: variant === 'auth'
          ? 'radial-gradient(ellipse at 30% 20%, rgba(124,108,240,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(78,168,222,0.06) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at 20% 50%, rgba(124,108,240,0.06) 0%, transparent 40%), radial-gradient(ellipse at 80% 20%, rgba(240,147,251,0.04) 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, rgba(78,168,222,0.05) 0%, transparent 40%)',
      }} />

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            opacity: 0.15,
          }}
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -30, 20, -40, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
            opacity: [0.15, 0.25, 0.12, 0.2, 0.15],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
        />
      ))}

      {/* Grid pattern overlay */}
      {variant === 'default' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(124,108,240,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      )}

      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.015,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}
