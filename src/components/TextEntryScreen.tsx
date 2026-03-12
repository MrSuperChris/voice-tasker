import React, { useState, useEffect, useRef } from 'react';

interface TextEntryScreenProps {
    onSubmit: (text: string) => void;
    onCancel: () => void;
}

export const TextEntryScreen: React.FC<TextEntryScreenProps> = ({ onSubmit, onCancel }) => {
    const [input, setInput] = useState('');
    const [lines, setLines] = useState<string[]>([
        'VOICE-TASKER TERMINAL v4.2',
        '(C) Sirius Cybernetics Corp.',
        '',
        'MANUAL INPUT MODE ACTIVATED',
        'TYPE YOUR TASK BELOW. PRESS ENTER TO SUBMIT.',
        '----------------------------------------------',
        '',
    ]);
    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        setLines(prev => [...prev, `> ${trimmed}`, '', 'TRANSMITTING...']);
        setInput('');

        setTimeout(() => {
            onSubmit(trimmed);
        }, 400);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div
            className="h-full w-full flex flex-col bg-black p-4 box-border"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="text-center mb-4">
                <h2 className="text-[var(--color-phosphor-green)] text-sm uppercase tracking-[0.3em] opacity-60">
                    // manual entry terminal //
                </h2>
            </div>

            <div
                ref={terminalRef}
                className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed mb-4 terminal-output"
                style={{
                    textShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
                }}
            >
                {lines.map((line, i) => (
                    <div
                        key={i}
                        className="text-[var(--color-phosphor-green)] whitespace-pre-wrap"
                        style={{ opacity: i < 6 ? 0.5 : 1 }}
                    >
                        {line || '\u00A0'}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-0">
                <span
                    className="text-[var(--color-phosphor-green)] font-mono text-lg shrink-0"
                    style={{ textShadow: '0 0 8px rgba(0, 255, 65, 0.6)' }}
                >
                    {'>'}&nbsp;
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none font-mono text-lg text-[var(--color-phosphor-green)] caret-[var(--color-phosphor-green)]"
                    style={{ textShadow: '0 0 8px rgba(0, 255, 65, 0.6)' }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder=""
                />
                <span className="text-[var(--color-phosphor-green)] animate-pulse font-mono text-lg">_</span>
            </form>

            <div className="flex justify-between mt-4 text-xs uppercase tracking-widest opacity-40 text-[var(--color-phosphor-green)]">
                <span>[ESC] ABORT</span>
                <span>[ENTER] TRANSMIT</span>
            </div>
        </div>
    );
};
