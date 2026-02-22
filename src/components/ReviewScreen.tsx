import React from 'react';

interface ReviewScreenProps {
    text: string;
    onTextChange: (text: string) => void;
    onDo: () => void;
    onDont: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ text, onTextChange, onDo, onDont }) => {
    return (
        <div className="flex flex-col h-full w-full p-6 box-border">
            <div className="mt-12 flex-1 flex flex-col min-h-0">
                <h2 className="don-panic glow-text text-3xl mb-6 text-center">TRANSCRIPTION</h2>
                <textarea
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    className="flex-1 w-full bg-black border-4 border-[var(--color-phosphor-green)] p-6 text-[var(--color-phosphor-green)] font-mono text-2xl focus:outline-none shadow-[0_0_20px_rgba(0,255,65,0.1)] resize-none"
                    placeholder="Empty entry..."
                />
                <p className="text-xs mt-4 opacity-50 uppercase text-center tracking-widest">Awaiting verification (Protocol 42-B)</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8 mb-4">
                <button
                    onClick={onDont}
                    className="border-4 border-[var(--color-phosphor-red)] text-[var(--color-phosphor-red)] py-5 text-xl font-bold uppercase transition-all active:bg-[var(--color-phosphor-red)] active:text-black"
                >
                    DISCARD
                </button>
                <button
                    onClick={onDo}
                    className="don-panic border-4 border-[var(--color-phosphor-green)] text-[var(--color-phosphor-green)] py-5 text-xl font-bold uppercase transition-all active:bg-[var(--color-phosphor-green)] active:text-black"
                >
                    UPLOAD
                </button>
            </div>
        </div>
    );
};
