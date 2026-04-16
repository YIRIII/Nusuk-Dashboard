import type { Variants, Transition } from 'framer-motion';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export const pageTransition: Transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
};

export const staggerGrid: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

export const cardHover = {
  whileHover: { y: -3, transition: { type: 'spring' as const, stiffness: 360, damping: 22 } },
  whileTap: { scale: 0.995 },
};

export const dialogBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

export const dialogPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
};
