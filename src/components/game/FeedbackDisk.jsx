import { motion } from 'framer-motion';

export default function FeedbackDisk({ status }) {
  // status: 'neutral' | 'correct' | 'incorrect'
  const colors = {
    neutral: 'bg-green-500 shadow-green-500/30',
    correct: 'bg-green-500 shadow-green-500/30',
    incorrect: 'bg-red-500 shadow-red-500/30',
  };

  return (
    <motion.div
      className={`w-6 h-6 rounded-full ${colors[status]} shadow-lg transition-colors duration-200`}
      animate={status === 'incorrect' ? { scale: [1, 1.3, 1] } : {}}
      transition={{ duration: 0.3 }}
    />
  );
}