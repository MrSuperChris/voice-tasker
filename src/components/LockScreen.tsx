import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LockScreenProps {
    onUnlock: (password: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes().toString().padStart(2, '0');

        // 24h format: e.g. 1345
        const code24 = `${currentH}${currentM}`;

        // 12h format: e.g. 145 (dropping leading zero as per user request)
        const h12 = currentH % 12 || 12;
        const code12 = `${h12}${currentM}`;

        if (password === code24 || password === code12) {
            onUnlock(password);
        } else {
            alert(`ACCESS DENIED. Logic Failure. (Hint: What time is it in The Guide?)`);
            setPassword('');
        }
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 box-border bg-black">
            <div className="mb-12 text-center pointer-events-none">
                <Lock size={100} className="mx-auto mb-8 text-[var(--color-phosphor-orange)] animate-pulse" />
                <h1 className="don-panic glow-text text-5xl mb-4">SYSTEM LOCKED</h1>
                <p className="glow-text text-sm opacity-50 uppercase tracking-[0.4em]">IDENTITY LOGIC GATE ACTIVE</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-12">
                <div className="relative">
                    <input
                        type="tel"
                        pattern="[0-9]*"
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="----"
                        className="w-full bg-black border-b-4 border-[var(--color-phosphor-green)] p-6 text-center text-6xl font-mono text-[var(--color-phosphor-green)] focus:outline-none tracking-[0.5em]"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-6 text-3xl font-bold border-4 border-[var(--color-phosphor-green)] text-[var(--color-phosphor-green)] uppercase active:bg-[var(--color-phosphor-green)] active:text-black transition-all"
                >
                    INITIATE
                </button>
            </form>

            <div className="mt-16 text-[12px] opacity-40 text-center uppercase max-w-xs tracking-widest leading-relaxed">
                v0.11
            </div>
        </div>
    );
};
