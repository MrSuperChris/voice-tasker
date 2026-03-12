import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StartScreenProps {
    onStart: () => void;
    onTextEntry: () => void;
    onOpenSettings: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onTextEntry, onOpenSettings }) => {
    return (
        <div className="h-full w-full flex flex-col items-center p-8 box-border relative overflow-hidden bg-black">
            {/* Header */}
            <div className="text-center w-full mt-8 pointer-events-none">
                <h1 className="don-panic glow-text text-5xl mb-2">Voice Tasker</h1>
                <p className="glow-text text-xs opacity-50 tracking-[0.4em] uppercase">Galaxy Guide Protocol</p>
            </div>

            {/* Centered Button Area */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-4 gap-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStart}
                    className="w-full aspect-square max-w-[90vw] flex items-center justify-center border-8 border-[var(--color-phosphor-green)] bg-transparent rounded-3xl shadow-[0_0_50px_rgba(0,255,65,0.2)]"
                >
                    <Plus size={200} strokeWidth={0.5} className="text-[var(--color-phosphor-green)]" />
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onTextEntry}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-phosphor-dim)] rounded opacity-50 hover:opacity-100 transition-opacity"
                    title="Text Entry"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-phosphor-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <line x1="6" y1="10" x2="8" y2="10" />
                        <line x1="10" y1="10" x2="12" y2="10" />
                        <line x1="14" y1="10" x2="18" y2="10" />
                        <line x1="6" y1="14" x2="18" y2="14" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                    </svg>
                    <span className="text-xs uppercase tracking-widest text-[var(--color-phosphor-green)]">type</span>
                </motion.button>
            </div>

            {/* Footer */}
            <div className="w-full flex flex-col items-center gap-6 mb-8 mt-auto">
                <p className="don-panic glow-text text-2xl text-[var(--color-phosphor-orange)] text-center tracking-[0.2em]">
                    DON'T PANIC
                </p>

                <button
                    onClick={onOpenSettings}
                    className="p-4 border border-[var(--color-phosphor-dim)] rounded text-2xl opacity-30 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[60px]"
                    title="Settings"
                >
                    ⚒️
                </button>
            </div>
        </div>
    );
};
