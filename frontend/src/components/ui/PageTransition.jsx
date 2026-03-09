import { motion } from 'framer-motion';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

const pageTransition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.15,
};

export default function PageTransition({ children }) {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
        >
            {children}
        </motion.div>
    );
}

// Stagger container for lists
export function StaggerContainer({ children, className = '' }) {
    return (
        <motion.div
            className={className}
            initial="initial"
            animate="animate"
            variants={{
                animate: { transition: { staggerChildren: 0.04 } },
            }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className = '' }) {
    return (
        <motion.div
            className={className}
            variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.15 }}
        >
            {children}
        </motion.div>
    );
}
