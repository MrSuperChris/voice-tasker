import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResultScreenProps {
    success: boolean;
    error?: string | null;
    onReset: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ success, error, onReset }) => {
    useEffect(() => {
        if (success) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00ff41', '#008f11', '#ffffff']
            });
        }
    }, [success]);

    return (
        <div
            className="flex flex-col items-center justify-center h-full p-6 text-center cursor-pointer"
            onClick={onReset}
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className={`w-32 h-32 rounded-full border-4 flex items-center justify-center mb-8 ${success ? 'border-[var(--color-phosphor-green)]' : 'border-[var(--color-phosphor-red)]'
                    }`}
            >
                {success ? (
                    <Check size={64} className="text-[var(--color-phosphor-green)]" />
                ) : (
                    <X size={64} className="text-[var(--color-phosphor-red)]" />
                )}
            </motion.div>

            <h2 className={`don-panic text-3xl mb-4 glow-text ${success ? 'text-[var(--color-phosphor-green)]' : 'text-[var(--color-phosphor-red)]'
                }`}>
                {success ? 'TASK ADDED' : 'ENTRY FAILED'}
            </h2>

            <p className="glow-text text-sm opacity-60 uppercase tracking-widest">
                {success ? 'Probability of success: 100%' : (error || 'Consult the manual (p. 42)')}
            </p>

            <div className="mt-20 text-[10px] opacity-30 animate-pulse">
                TAP SCREEN TO CONTINUE
            </div>
        </div>
    );
};
