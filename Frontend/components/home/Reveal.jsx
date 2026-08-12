"use client";

import { motion } from "framer-motion";

// NEW: shared scroll-reveal wrapper — fades + slides a section's content
// up into place the first time it scrolls into view. `once: true` means
// it won't re-animate if the user scrolls back up and down again.
export default function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}