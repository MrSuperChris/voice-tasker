import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CRTOverlay } from './CRTOverlay';
import { MatrixRain } from './MatrixRain';
import { StartScreen } from './StartScreen';
import { Wavelength } from './Wavelength';
import { ReviewScreen, type ReviewSubmitOptions } from './ReviewScreen';
import { ResultScreen } from './ResultScreen';
import { AudioRecorder } from '../lib/audioRecorder';
import { transcribeAudio } from '../lib/groq';
import { uploadObsidianNote } from '../lib/dropbox';
import { createTickTickTask } from '../lib/ticktick';
import { sounds } from '../lib/sounds';

const recorder = new AudioRecorder();

interface AppSettings {
    // Historical field name: holds the GROQ key (gsk_...) - transcription
    // moved to Groq's Whisper endpoint long ago. Renaming the stored field
    // would need a localStorage migration on every device; not worth it.
    openaiKey: string;
    tickTickToken: string;
    dropboxToken: string;
    defaultDate: string;
    taskType: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    openaiKey: '',
    tickTickToken: '',
    dropboxToken: '',
    defaultDate: 'Today',
    taskType: 'Inbox'
};

type ScreenState = 'INITIAL' | 'RECORDING' | 'PROCESSING' | 'REVIEW' | 'RESULT' | 'SETTINGS' | 'TEXT_ENTRY';

export const VoiceTasker: React.FC = () => {
    const [screen, setScreen] = useState<ScreenState>('INITIAL');
    const [transpiredText, setTranspiredText] = useState('');
    const [isSuccess, setIsSuccess] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('voice-tasker-settings');
        // Merge over defaults so settings saved before a new field existed
        // (e.g. dropboxToken) still yield controlled inputs.
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    });

    const saveSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('voice-tasker-settings', JSON.stringify(newSettings));
    };

    const navigateTo = (nextScreen: ScreenState) => {
        setScreen(nextScreen);
    };

    const handleStartRecording = async () => {
        try {
            await recorder.start();
            sounds.playStartRecording();
            navigateTo('RECORDING');
        } catch (err) {
            console.error(err);
            alert('Could not access microphone');
        }
    };

    const handleStopRecording = async () => {
        sounds.playStopRecording();
        navigateTo('PROCESSING');
        sounds.startProcessing();
        try {
            const audioBlob = await recorder.stop();
            if (!settings.openaiKey) {
                throw new Error('Groq API Key missing in settings');
            }
            const text = await transcribeAudio(audioBlob, settings.openaiKey);
            if (!text.trim()) {
                throw new Error('Nothing was captured. Try again.');
            }
            setTranspiredText(text);
            sounds.stopProcessing();
            navigateTo('REVIEW');
        } catch (err: any) {
            sounds.stopProcessing();
            sounds.playError();
            setError(err.message || 'Transcription failed');
            setIsSuccess(false);
            navigateTo('RESULT');
        }
    };

    const computeDueDate = (dateOption?: string): string | undefined => {
        if (dateOption === 'Tomorrow') {
            const t = new Date();
            t.setDate(t.getDate() + 1);
            return t.toISOString();
        }
        if (dateOption === 'Today') {
            return new Date().toISOString();
        }
        // 'Someday' / heat death of the universe => no due date
        return undefined;
    };

    // A second DO press in the same tick lands before React has swapped the
    // screen out, so state alone can't stop a double-tap from POSTing twice.
    const isSubmittingRef = useRef(false);

    const handleCreateTask = async (options?: ReviewSubmitOptions) => {
        if (isSubmittingRef.current) {
            return;
        }
        if (!transpiredText.trim()) {
            sounds.playError();
            setError('Cannot create an empty task.');
            setIsSuccess(false);
            navigateTo('RESULT');
            return;
        }
        isSubmittingRef.current = true;
        navigateTo('PROCESSING');
        sounds.startProcessing();
        try {
            const title = transpiredText.trim();
            const mode = options?.mode ?? 'TASK';
            if (mode === 'OBSIDIAN') {
                if (!settings.dropboxToken) {
                    throw new Error('Dropbox Token missing in settings');
                }
                await uploadObsidianNote(title, settings.dropboxToken);
            } else {
                if (!settings.tickTickToken) {
                    throw new Error('TickTick Token missing in settings');
                }
                await createTickTickTask({
                    title,
                    dueDate: computeDueDate(options?.dateOption ?? settings.defaultDate),
                    projectId: settings.taskType !== 'Inbox' ? settings.taskType : undefined,
                    // ASK CLAUDE rides the existing triage pipeline: a
                    // thinking-tagged Inbox task is already a candidate there.
                    tags: mode === 'ASK' ? ['thinking']
                        : options?.tag ? [options.tag] : undefined
                }, settings.tickTickToken);
            }
            setIsSuccess(true);
            sounds.stopProcessing();
            sounds.playSuccess();
            navigateTo('RESULT');
        } catch (err: any) {
            sounds.stopProcessing();
            sounds.playError();
            setError(err.message || 'Task creation failed');
            setIsSuccess(false);
            navigateTo('RESULT');
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const renderScreen = () => {
        switch (screen) {
            case 'INITIAL':
                return (
                    <StartScreen
                        onStart={handleStartRecording}
                        onOpenSettings={() => navigateTo('SETTINGS')}
                        onTextEntry={() => navigateTo('TEXT_ENTRY')}
                    />
                );
            case 'RECORDING':
                return (
                    <div className="flex flex-col items-center justify-between h-full py-20 px-6 box-border">
                        <div className="text-center w-full">
                            <h2 className="glow-text text-4xl mb-2">LISTENING...</h2>
                            <p className="glow-text text-sm opacity-50 uppercase tracking-widest">Capturing acoustic waves</p>
                        </div>

                        <Wavelength analyser={recorder.getAnalyser()} />

                        <button
                            onClick={handleStopRecording}
                            className="w-full border-4 border-[var(--color-phosphor-red)] text-[var(--color-phosphor-red)] py-6 text-2xl font-bold"
                        >
                            STOP RECORDING
                        </button>
                    </div>
                );
            case 'PROCESSING':
                return (
                    <div className="relative flex flex-col items-center justify-center h-full p-6 text-center overflow-hidden">
                        {/* Matrix rain as a transient background - mounts only for
                            this state, so it never touches the capture/review flow. */}
                        <MatrixRain />
                        <div className="relative z-10">
                            <h2 className="don-panic glow-text text-3xl mb-8 animate-pulse">PROCESSING...</h2>
                            <div className="glow-text text-sm opacity-50 uppercase max-w-xs">
                                Calculating probability of success... Consultating the manual...
                            </div>
                        </div>
                    </div>
                );
            case 'REVIEW':
                return (
                    <ReviewScreen
                        text={transpiredText}
                        onTextChange={setTranspiredText}
                        onDo={handleCreateTask}
                        onDont={() => {
                            setTranspiredText('');
                            navigateTo('INITIAL');
                        }}
                    />
                );
            case 'RESULT':
                return (
                    <ResultScreen
                        success={isSuccess}
                        error={error}
                        onReset={() => {
                            setError(null);
                            navigateTo('INITIAL');
                        }}
                    />
                );
            case 'TEXT_ENTRY':
                return (
                    <ReviewScreen
                        title="TYPE TASK"
                        autoFocus
                        text={transpiredText}
                        onTextChange={setTranspiredText}
                        onDo={handleCreateTask}
                        onDont={() => {
                            setTranspiredText('');
                            navigateTo('INITIAL');
                        }}
                    />
                );
            case 'SETTINGS':
                return (
                    <div className="flex flex-col h-full p-6 max-w-md mx-auto overflow-y-auto">
                        <h2 className="don-panic glow-text text-3xl mb-8 mt-4 text-center">CONFIG</h2>
                        <div className="w-full space-y-4">
                            <div>
                                <label className="block text-xs uppercase mb-1">Groq API Key</label>
                                <input
                                    type="password"
                                    value={settings.openaiKey}
                                    onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                                    placeholder="gsk_..."
                                    className="w-full bg-black border border-[var(--color-phosphor-green)] p-2 text-green-500 font-mono focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase mb-1">TickTick Token</label>
                                <input
                                    type="password"
                                    value={settings.tickTickToken}
                                    onChange={(e) => setSettings({ ...settings, tickTickToken: e.target.value })}
                                    placeholder="..."
                                    className="w-full bg-black border border-[var(--color-phosphor-green)] p-2 text-green-500 font-mono focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase mb-1">Dropbox Token (Obsidian mode)</label>
                                <input
                                    type="password"
                                    value={settings.dropboxToken}
                                    onChange={(e) => setSettings({ ...settings, dropboxToken: e.target.value })}
                                    placeholder="sl.u..."
                                    className="w-full bg-black border border-[var(--color-phosphor-green)] p-2 text-green-500 font-mono focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase mb-1">Default Date</label>
                                <input
                                    type="text"
                                    value={settings.defaultDate}
                                    onChange={(e) => setSettings({ ...settings, defaultDate: e.target.value })}
                                    className="w-full bg-black border border-[var(--color-phosphor-green)] p-2 text-green-500 font-mono focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase mb-1">Task List ID</label>
                                <input
                                    type="text"
                                    value={settings.taskType}
                                    onChange={(e) => setSettings({ ...settings, taskType: e.target.value })}
                                    className="w-full bg-black border border-[var(--color-phosphor-green)] p-2 text-green-500 font-mono focus:outline-none"
                                />
                            </div>
                        </div>
                        <button className="mt-10 mb-10 w-full" onClick={() => {
                            saveSettings(settings);
                            navigateTo('INITIAL');
                        }}>SAVE & RETURN</button>

                        <div className="text-[10px] opacity-40 uppercase text-center mt-auto pb-4">
                            Hardware: Sirius Cybernetics Corp.
                        </div>
                    </div>
                );
            default:
                return <div className="glow-text">COMING SOON</div>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black text-[var(--color-phosphor-green)] font-mono overflow-hidden flex flex-col">
            <CRTOverlay>
                <div className="flex-1 flex flex-col h-full w-full relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={screen}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col h-full w-full"
                        >
                            {renderScreen()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </CRTOverlay>
        </div>
    );
};
