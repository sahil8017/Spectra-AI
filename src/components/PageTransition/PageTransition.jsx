// src/components/PageTransition/PageTransition.jsx

import { motion } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20, // Start slightly below
  },
  in: {
    opacity: 1,
    y: 0, // Animate to original position
  },
  out: {
    opacity: 0,
    y: -20, // Exit by moving slightly up
  },
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5,
};

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;