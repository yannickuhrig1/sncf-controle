import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Upload, Database, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitProgressProps {
  isSubmitting: boolean;
  onComplete?: () => void;
}

const STEPS = [
  { id: 'validate', label: 'Validation', icon: Check },
  { id: 'upload', label: 'Envoi', icon: Upload },
  { id: 'save', label: 'Sauvegarde', icon: Database },
  { id: 'done', label: 'Terminé', icon: CheckCircle2 },
];

export function SubmitProgress({ isSubmitting, onComplete }: SubmitProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
      setCurrentStep(0);
      setCompleted(false);
      return;
    }

    // Simulate progress through steps
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setCurrentStep(1), 300));
    timers.push(setTimeout(() => setCurrentStep(2), 800));
    timers.push(setTimeout(() => setCurrentStep(3), 1400));
    timers.push(setTimeout(() => {
      setCompleted(true);
      onComplete?.();
    }, 2000));

    return () => timers.forEach(clearTimeout);
  }, [isSubmitting, onComplete]);

  if (!isSubmitting && !completed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full border"
        >
          <div className="space-y-6">
            {/* Progress circle */}
            <div className="flex justify-center">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    className="text-primary"
                    initial={{ strokeDasharray: '0 251.2' }}
                    animate={{
                      strokeDasharray: `${((currentStep + 1) / STEPS.length) * 251.2} 251.2`,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {completed ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <CheckCircle2 className="w-10 h-10 text-chart-2" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="loader"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === index;
                const isDone = currentStep > index || completed;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg transition-colors',
                      isDone && 'bg-chart-2/10',
                      isActive && !isDone && 'bg-primary/10',
                      !isActive && !isDone && 'opacity-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        isDone && 'bg-chart-2 text-white',
                        isActive && !isDone && 'bg-primary text-primary-foreground',
                        !isActive && !isDone && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isDone && 'text-chart-2',
                        isActive && !isDone && 'text-primary',
                        !isActive && !isDone && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                    {isActive && !isDone && (
                      <motion.div
                        className="ml-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <span className="text-xs text-muted-foreground">En cours...</span>
                      </motion.div>
                    )}
                    {isDone && (
                      <motion.div
                        className="ml-auto"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Check className="w-4 h-4 text-chart-2" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Status text */}
            <motion.p
              key={completed ? 'done' : 'progress'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-muted-foreground"
            >
              {completed
                ? 'Contrôle enregistré avec succès !'
                : 'Enregistrement en cours...'}
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
