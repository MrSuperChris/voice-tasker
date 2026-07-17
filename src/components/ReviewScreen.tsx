import React, { useState } from 'react';

export type DateOption = 'Today' | 'Tomorrow' | 'Someday';

export interface ReviewSubmitOptions {
    dateOption: DateOption;
    tag: string | null;
}

interface ReviewScreenProps {
    text: string;
    onTextChange: (text: string) => void;
    onDo: (options: ReviewSubmitOptions) => void;
    onDont: () => void;
    title?: string;
    autoFocus?: boolean;
}

const DATE_OPTIONS: { value: DateOption; label: string }[] = [
    { value: 'Today', label: 'TODAY' },
    { value: 'Tomorrow', label: 'TOMORROW' },
    { value: 'Someday', label: 'HEAT DEATH' },
];

const TAGS = ['social', 'it', 'home', 'money', 'creative', 'organizing', 'work', 'cooking', 'vacation', 'thinking'];

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ text, onTextChange, onDo, onDont, title = 'TRANSCRIPTION', autoFocus = false }) => {
    const [dateOption, setDateOption] = useState<DateOption>('Today');
    const [tag, setTag] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full w-full p-6 box-border overflow-y-auto">
            <h2 className="don-panic glow-text text-3xl mb-4 mt-4 text-center shrink-0">{title}</h2>

            <textarea
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                autoFocus={autoFocus}
                className="w-full bg-black border-4 border-[var(--color-phosphor-green)] p-4 text-[var(--color-phosphor-green)] font-mono text-xl focus:outline-none shadow-[0_0_20px_rgba(0,255,65,0.1)] resize-none min-h-[120px]"
                placeholder="Empty entry..."
                rows={4}
            />

            <div className="text-[10px] opacity-50 uppercase tracking-[0.2em] mt-5 mb-2">WHEN</div>
            <div className="flex border border-[var(--color-phosphor-green)] rounded overflow-hidden">
                {DATE_OPTIONS.map((opt, i) => (
                    <button
                        key={opt.value}
                        onClick={() => setDateOption(opt.value)}
                        className={`flex-1 text-center py-3 px-1 text-[11px] uppercase tracking-wide whitespace-nowrap ${i > 0 ? 'border-l border-[var(--color-phosphor-green)]' : ''} ${
                            dateOption === opt.value
                                ? 'bg-[var(--color-phosphor-green)] text-black font-bold'
                                : 'text-[var(--color-phosphor-green)]'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="text-[10px] opacity-50 uppercase tracking-[0.2em] mt-5 mb-2">TAG</div>
            <div className="grid grid-cols-3 gap-2">
                {TAGS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTag(tag === t ? null : t)}
                        className={`border border-[var(--color-phosphor-green)] rounded py-3 text-[11px] uppercase tracking-wide ${
                            tag === t
                                ? 'bg-[var(--color-phosphor-green)] text-black font-bold'
                                : 'text-[var(--color-phosphor-green)]'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6 mb-4">
                <button
                    onClick={onDont}
                    className="border-4 border-[var(--color-phosphor-red)] text-[var(--color-phosphor-red)] py-5 text-xl font-bold uppercase transition-all active:bg-[var(--color-phosphor-red)] active:text-black"
                >
                    DON'T
                </button>
                <button
                    onClick={() => onDo({ dateOption, tag })}
                    disabled={!text.trim()}
                    className="don-panic border-4 border-[var(--color-phosphor-green)] text-[var(--color-phosphor-green)] py-5 text-xl font-bold uppercase transition-all active:bg-[var(--color-phosphor-green)] active:text-black disabled:opacity-30"
                >
                    DO
                </button>
            </div>
        </div>
    );
};
