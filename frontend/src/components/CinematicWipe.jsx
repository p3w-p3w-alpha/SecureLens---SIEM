import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CinematicWipe({ children, locationKey }) {
  const [wiping, setWiping] = useState(false);
  const [prevKey, setPrevKey] = useState(locationKey);

  useEffect(() => {
    if (locationKey !== prevKey) {
      setWiping(true);
      const timer = setTimeout(() => {
        setWiping(false);
        setPrevKey(locationKey);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [locationKey, prevKey]);

  return (
    <div className="relative">
      {/* Wipe light bar */}
      <AnimatePresence>
        {wiping && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              className="absolute top-0 bottom-0 w-[2px]"
              style={{ background: '#7dd3fc', boxShadow: '0 0 30px 8px rgba(125,211,252,0.3), 0 0 60px 15px rgba(125,211,252,0.1)' }}
              initial={{ left: '-40px' }}
              animate={{ left: 'calc(100vw + 40px)' }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content with fade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={locationKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
