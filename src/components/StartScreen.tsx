import React from 'react';
import { Plus, Keyboard, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

// Bridge is the live console for the Claude Queue board, deployed to GitHub Pages at the
// URL below — same origin as Babel (mrsuperchris.github.io), different path. Hardcoded:
// Babel is a deployed static PWA that cannot read SleeperService/config.json, and config
// holds only `babel_url` today, not a bridge_url, so there is no canonical key to defer to.
const BRIDGE_URL = 'https://mrsuperchris.github.io/bridge/';

interface StartScreenProps {
    onStart: () => void;
    onOpenSettings: () => void;
    onTextEntry: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onOpenSettings, onTextEntry }) => {
    return (
        <div className="h-full w-full flex flex-col items-center p-8 box-border relative overflow-hidden bg-black">
            {/* Header */}
            <div className="text-center w-full mt-8 pointer-events-none">
                <h1 className="don-panic glow-text text-5xl mb-2">Babel</h1>
                <p className="glow-text text-xs opacity-50 tracking-[0.4em] uppercase">Galaxy Guide Protocol</p>
            </div>

            {/* Centered Button Area */}
            <div className="flex-1 w-full flex items-center justify-center p-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStart}
                    className="aspect-square w-[max(180px,min(85vw,100vh_-_380px))] flex items-center justify-center border-8 border-[var(--color-phosphor-green)] bg-transparent rounded-3xl shadow-[0_0_50px_rgba(0,255,65,0.2)]"
                >
                    <Plus size={200} strokeWidth={0.5} className="text-[var(--color-phosphor-green)]" />
                </motion.button>
            </div>

            {/* Footer */}
            <div className="w-full flex flex-col items-center gap-6 mb-8 mt-auto">
                <p className="don-panic glow-text text-2xl text-[var(--color-phosphor-orange)] text-center tracking-[0.2em]">
                    DON'T PANIC
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={onTextEntry}
                        className="p-4 border border-[var(--color-phosphor-dim)] rounded opacity-30 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[60px]"
                        title="Type a task"
                    >
                        <Keyboard size={24} className="text-[var(--color-phosphor-green)]" />
                    </button>
                    <button
                        onClick={onOpenSettings}
                        className="p-4 border border-[var(--color-phosphor-dim)] rounded text-2xl opacity-30 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[60px]"
                        title="Settings"
                    >
                        ⚒️
                    </button>
                    {/* Open Bridge (the Claude Queue console) in a new tab. A secondary
                        affordance in the footer, deliberately kept out of the record path —
                        opening in a new tab leaves Babel's capture flow untouched to return to. */}
                    <a
                        href={BRIDGE_URL}
                        target="_blank"
                        rel="noopener"
                        className="p-4 border border-[var(--color-phosphor-dim)] rounded opacity-30 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[60px]"
                        title="Open Bridge console"
                    >
                        <LayoutDashboard size={24} className="text-[var(--color-phosphor-green)]" />
                    </a>
                </div>
            </div>
        </div>
    );
};
