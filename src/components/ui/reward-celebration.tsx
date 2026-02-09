import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, DollarSign, Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardCelebrationProps {
  isOpen: boolean;
  rewardType: 'coins' | 'money' | 'spins';
  amount: number;
  oldBalance?: number;
  newBalance?: number;
  onComplete?: () => void;
  duration?: number;
}

export function RewardCelebration({
  isOpen,
  rewardType,
  amount,
  oldBalance,
  newBalance,
  onComplete,
  duration = 3000,
}: RewardCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onComplete]);

  const getIcon = () => {
    switch (rewardType) {
      case 'coins':
        return <Coins className="w-16 h-16 text-yellow-500" />;
      case 'money':
        return <DollarSign className="w-16 h-16 text-green-500" />;
      case 'spins':
        return <Sparkles className="w-16 h-16 text-purple-500" />;
      default:
        return <Gift className="w-16 h-16 text-primary" />;
    }
  };

  const getLabel = () => {
    switch (rewardType) {
      case 'coins':
        return 'Coins';
      case 'money':
        return 'Cash';
      case 'spins':
        return 'Spins';
      default:
        return 'Reward';
    }
  };

  const formatAmount = () => {
    if (rewardType === 'money') {
      return `$${amount.toFixed(2)}`;
    }
    return amount.toString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti particles */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-[100]">
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    'absolute w-3 h-3 rounded-full',
                    i % 5 === 0 && 'bg-yellow-400',
                    i % 5 === 1 && 'bg-green-400',
                    i % 5 === 2 && 'bg-blue-400',
                    i % 5 === 3 && 'bg-purple-400',
                    i % 5 === 4 && 'bg-pink-400'
                  )}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1, 0.5],
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2,
                    ease: 'easeOut',
                    delay: Math.random() * 0.3,
                  }}
                />
              ))}
            </div>
          )}

          {/* Main celebration overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-gradient-to-br from-background via-background to-primary/10 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-primary/20"
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -50, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
            >
              {/* Animated icon */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
              >
                <motion.div
                  className="relative"
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.5,
                    repeat: 2,
                  }}
                >
                  {getIcon()}
                  <motion.div
                    className="absolute -inset-4 bg-gradient-to-r from-yellow-400/20 via-green-400/20 to-blue-400/20 rounded-full blur-xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>
              </motion.div>

              {/* Success message */}
              <motion.div
                className="text-center space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-green-500 to-blue-500 bg-clip-text text-transparent">
                  Congratulations!
                </h2>

                {/* Amount display */}
                <motion.div
                  className="py-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    delay: 0.4,
                  }}
                >
                  <div className="text-6xl font-bold text-foreground mb-2">
                    {rewardType === 'money' && '+'}
                    {formatAmount()}
                  </div>
                  <div className="text-xl text-muted-foreground font-semibold">
                    {getLabel()} Earned!
                  </div>
                </motion.div>

                {/* Balance update */}
                {oldBalance !== undefined && newBalance !== undefined && (
                  <motion.div
                    className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <span className="font-mono">{oldBalance}</span>
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 0.5, repeat: 2, delay: 0.8 }}
                    >
                      →
                    </motion.span>
                    <span className="font-mono font-bold text-primary">
                      {newBalance}
                    </span>
                  </motion.div>
                )}

                {/* Sparkle effects */}
                <motion.div
                  className="flex justify-center gap-2 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [0, 1, 0],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 1,
                        delay: 0.8 + i * 0.1,
                        repeat: 1,
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
