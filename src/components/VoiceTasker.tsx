import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CRTOverlay } from './CRTOverlay';
import { StartScreen } from './StartScreen';
import { Wavelength } from './Wavelength';
import { ReviewScreen } from './ReviewScreen';
import { ResultScreen } from './ResultScreen';
import { LockScreen } from './LockScreen';
import { TextEntryScreen } from './TextEntryScreen';
import { AudioRecorder } from '../lib/audioRecorder';
import { transcribeAudio } from '../lib/openai';
import { createTickTickTask } from '../lib/ticktick';

const recorder = new AudioRecorder();

interface AppSettings {
    openaiKey: string;
    tickTickToken: string;
    defaultDate: string;
    taskType: string;
}

type ScreenState = 'LOCKED' | 'INITIAL' | 'RECORDING' | 'PROCESSING' | 'REVIEW' | 'RESULT' | 'SETTINGS' | 'TEXT_ENTRY';

export const VoiceTasker: React.FC = () => {
    const [screen, setScreen] = useState<ScreenState>('LOCKED');
    const [transpiredText, setTranspiredText] = useState('');
    const [isSuccess, setIsSuccess] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('voice-tasker-settings');
        return saved ? JSON.parse(saved) : {
            openaiKey: '',
            tickTickToken: '',
            defaultDate: 'Today',
            taskType: 'Inbox'
        };
    });

    const handleUnlock = () => {
        navigateTo('INITIAL');
    };

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
            navigateTo('RECORDING');
        } catch (err) {
            console.error(err);
            alert('Could not access microphone');
        }
    };

    const handleStopRecording = async () => {
        navigateTo('PROCESSING');
        try {
            const audioBlob = await recorder.stop();
            if (!settings.openaiKey) {
                throw new Error('OpenAI Key missing in settings');
            }
            const text = await transcribeAudio(audioBlob, settings.openaiKey);
            setTranspiredText(text);
            navigateTo('REVIEW');
        } catch (err: any) {
            setError(err.message || 'Transcription failed');
            setIsSuccess(false);
            navigateTo('RESULT');
        }
    };

    const handleCreateTask = async () => {
        navigateTo('PROCESSING');
        try {
            if (!settings.tickTickToken) {
                throw new Error('TickTick Token missing in settings');
            }
            await createTickTickTask({
                title: transpiredText,
                dueDate: settings.defaultDate === 'Today' ? new Date().toISOString() : undefined,
                projectId: settings.taskType !== 'Inbox' ? settings.taskType : undefined
            }, settings.tickTickToken);
            setIsSuccess(true);
            navigateTo('RESULT');
        } catch (err: any) {
            setError(err.message || 'Task creation failed');
            setIsSuccess(false);
            navigateTo('RESULT');
        }
    };

    const renderScreen = () => {
        switch (screen) {
            case 'LOCKED':
                return (
                    <LockScreen
                        onUnlock={handleUnlock}
                    />
                );
            case 'INITIAL':
                return (
                    <StartScreen
                        onStart={handleStartRecording}
                        onTextEntry={() => navigateTo('TEXT_ENTRY')}
                        onOpenSettings={() => navigateTo('SETTINGS')}
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
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <h2 className="don-panic glow-text text-3xl mb-8 animate-pulse">PROCESSING...</h2>
                        <div className="glow-text text-sm opacity-50 uppercase max-w-xs">
                            Calculating probability of success... Consultating the manual...
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
                    <TextEntryScreen
                        onSubmit={(text) => {
                            setTranspiredText(text);
                            navigateTo('REVIEW');
                        }}
                        onCancel={() => navigateTo('INITIAL')}
                    />
                );
            case 'SETTINGS':
                return (
                    <div className="flex flex-col h-full p-6 max-w-md mx-auto overflow-y-auto">
                        <h2 className="don-panic glow-text text-3xl mb-8 mt-4 text-center">CONFIG</h2>
                        <div className="w-full space-y-4">
                            <div>
                                <label className="block text-xs uppercase mb-1">OpenAI Key</label>
                                <input
                                    type="password"
                                    value={settings.openaiKey}
                                    onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                                    placeholder="sk-..."
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
