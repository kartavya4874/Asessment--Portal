import { motion } from 'framer-motion';

const pageVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
};

const pageTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    duration: 0.3,
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

// Stagger container for lists - supports style prop
export function StaggerContainer({ children, className = '', style = {} }) {
    return (
        <motion.div
            className={className}
            style={style}
            initial="initial"
            animate="animate"
            variants={{
                animate: { transition: { staggerChildren: 0.06 } },
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
                initial: { opacity: 0, y: 16 },
                animate: { opacity: 1, y: 0 },
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {children}
        </motion.div>
    );
}
