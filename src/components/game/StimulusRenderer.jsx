import { motion, AnimatePresence } from 'framer-motion';

export default function StimulusRenderer({ stimulus, visible }) {
  return (
    <div className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl border-2 border-border bg-card shadow-xl flex items-center justify-center shrink-0 mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        {visible && stimulus && (
          <motion.div
            key={stimulus.value}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.12 }}
            className="w-full h-full flex items-center justify-center"
          >
            {stimulus.type === 'image' ? (
              <img
                src={stimulus.value}
                alt="stimulus"
                className="w-full h-full object-contain p-6"
              />
            ) : (
              <span className="text-9xl font-bold select-none text-foreground font-mono leading-none">
                {stimulus.value}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}