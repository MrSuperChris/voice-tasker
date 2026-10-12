import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResultScreenProps {
    success: boolean;
    error?: string | null;
    onReset: () => void;
    // When present, a failed transcription still has its audio saved: offer RETRY.
    onRetry?: () => void;
    // When present, an extra reassurance line (e.g. "your text is saved").
    note?: string | null;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ success, error, onReset, onRetry, note }) => {
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

            {note && (
                <p className="glow-text text-xs text-[var(--color-phosphor-orange)] opacity-80 uppercase tracking-widest mt-4 max-w-xs">
                    {note}
                </p>
            )}

            {onRetry && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRetry(); }}
                    className="mt-10 border-4 border-[var(--color-phosphor-green)] text-[var(--color-phosphor-green)] py-4 px-10 text-xl font-bold uppercase transition-all active:bg-[var(--color-phosphor-green)] active:text-black"
                >
                    RETRY
                </button>
            )}

            <div className="mt-20 text-[10px] opacity-30 animate-pulse">
                TAP SCREEN TO CONTINUE
            </div>
        </div>
    );
};
