// src/components/PageTransition/PageTransition.jsx

import { motion } from "framer-motion";

// Page-level transition - handles only opacity for smooth page changes
const pageVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
};

// Fast, smooth fade transition
const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.2,
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