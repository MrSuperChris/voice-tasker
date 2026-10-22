import React, { useEffect, useRef, useState } from 'react';
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
import { saveRecording, loadRecording, clearRecording } from '../lib/recordingStore';

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

// Card: keep the typed/transcribed text across failures and reloads. The draft is
// mirrored here on every change and restored on load, so a reload on REVIEW or during
// a submit no longer loses what was captured. Cleared only on a successful submit or
// an explicit DON'T.
const DRAFT_KEY = 'voice-tasker-draft';

export const VoiceTasker: React.FC = () => {
    const [screen, setScreen] = useState<ScreenState>('INITIAL');
    const [transpiredText, setTranspiredText] = useState('');
    const [isSuccess, setIsSuccess] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Card: keep the recording until it is transcribed, with RETRY.
    // retryAvailable gates the RETRY button on the failure screen (set only when a
    // transcription attempt failed and the audio is still saved). hasSavedRecording
    // gates the start-screen offer to transcribe a recording left over from a crash
    // or reload during PROCESSING.
    const [retryAvailable, setRetryAvailable] = useState(false);
    const [hasSavedRecording, setHasSavedRecording] = useState(false);
    // An extra line on the failure screen telling the user their text was kept and how
    // to get back to it (set on a submit failure where the draft is preserved).
    const [resultNote, setResultNote] = useState<string | null>(null);
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

    // On load, if a recording was left behind (reload/crash during PROCESSING, or a
    // transcription that never succeeded), offer to transcribe it from the start screen.
    useEffect(() => {
        loadRecording().then(blob => { if (blob) setHasSavedRecording(true); });
    }, []);

    // On load, restore a draft left behind by a reload on REVIEW or during a submit.
    // It stays on the start screen; opening TEXT_ENTRY (keyboard) shows the text.
    useEffect(() => {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) setTranspiredText(saved);
    }, []);

    // Warn before a reload/close throws away an in-flight capture (recording or
    // transcribing). Only while those screens are up, so it never nags elsewhere.
    useEffect(() => {
        if (screen !== 'RECORDING' && screen !== 'PROCESSING') return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [screen]);

    // Mirror every edit to localStorage so the draft survives a reload.
    const updateDraft = (text: string) => {
        setTranspiredText(text);
        if (text) localStorage.setItem(DRAFT_KEY, text);
        else localStorage.removeItem(DRAFT_KEY);
    };

    // Clear the draft (successful submit, or DON'T).
    const clearDraft = () => {
        setTranspiredText('');
        localStorage.removeItem(DRAFT_KEY);
    };

    // A new transcript is appended to any unsubmitted draft rather than replacing it,
    // so a thought captured before a failed submit is not lost by recording another
    // (failure-paths case C1b). Normal captures start from an empty draft (cleared on
    // success/DON'T), so this only ever preserves text after a failure.
    const appendTranscript = (text: string) => {
        setTranspiredText(prev => {
            const combined = prev.trim() ? `${prev}\n${text}` : text;
            localStorage.setItem(DRAFT_KEY, combined);
            return combined;
        });
    };

    const navigateTo = (nextScreen: ScreenState) => {
        setScreen(nextScreen);
    };

    const handleStartRecording = async () => {
        try {
            // A fresh recording supersedes any leftover one; hide the offer now, and
            // handleStopRecording will overwrite the saved blob before transcribing.
            setHasSavedRecording(false);
            await recorder.start();
            sounds.playStartRecording();
            navigateTo('RECORDING');
        } catch (err) {
            console.error(err);
            alert('Could not access microphone');
        }
    };

    // Transcribe a blob and route on the outcome. Shared by a fresh stop, the RETRY
    // button, and the start-screen "transcribe saved recording" offer. The saved audio
    // is cleared the moment a real response comes back (whether or not the words are
    // usable), so a success leaves nothing behind; a transport/API failure keeps it so
    // RETRY has something to re-send.
    const attemptTranscription = async (audioBlob: Blob) => {
        navigateTo('PROCESSING');
        sounds.startProcessing();
        try {
            if (!settings.openaiKey) {
                throw new Error('Groq API Key missing in settings');
            }
            const text = await transcribeAudio(audioBlob, settings.openaiKey);
            // A response came back — the audio has served its purpose.
            await clearRecording();
            setHasSavedRecording(false);
            if (!text.trim()) {
                throw new Error('Nothing was captured. Try again.');
            }
            appendTranscript(text);
            setResultNote(null);
            sounds.stopProcessing();
            navigateTo('REVIEW');
        } catch (err: any) {
            sounds.stopProcessing();
            sounds.playError();
            setError(err.message || 'Transcription failed');
            setIsSuccess(false);
            setResultNote(null);
            // Offer RETRY only if the audio is still saved (a transport/API failure,
            // not an empty transcript we just cleared).
            const stillSaved = await loadRecording();
            setRetryAvailable(!!stillSaved);
            navigateTo('RESULT');
        }
    };

    const handleStopRecording = async () => {
        sounds.playStopRecording();
        navigateTo('PROCESSING');
        sounds.startProcessing();
        let audioBlob: Blob;
        try {
            audioBlob = await recorder.stop();
        } catch (err: any) {
            sounds.stopProcessing();
            sounds.playError();
            setError(err.message || 'Recording failed');
            setIsSuccess(false);
            setRetryAvailable(false);
            navigateTo('RESULT');
            return;
        }
        // Persist BEFORE calling Groq, so a transcription failure or a reload during
        // PROCESSING can still recover the spoken thought.
        try { await saveRecording(audioBlob); } catch { /* best effort */ }
        await attemptTranscription(audioBlob);
    };

    const handleRetryTranscription = async () => {
        const blob = await loadRecording();
        setRetryAvailable(false);
        if (!blob) {
            // Nothing to retry (shouldn't happen when RETRY is shown).
            setError(null);
            navigateTo('INITIAL');
            return;
        }
        await attemptTranscription(blob);
    };

    const handleTranscribeSaved = async () => {
        const blob = await loadRecording();
        setHasSavedRecording(false);
        if (!blob) return;
        await attemptTranscription(blob);
    };

    const handleDiscardSaved = async () => {
        await clearRecording();
        setHasSavedRecording(false);
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
            setResultNote(null);
            // Clear the shared draft so returning to TEXT_ENTRY (or REVIEW)
            // starts empty instead of prefilled with the task just created.
            // The "Don't" path already does this; the "Do" path did not.
            clearDraft();
            sounds.stopProcessing();
            sounds.playSuccess();
            navigateTo('RESULT');
        } catch (err: any) {
            sounds.stopProcessing();
            sounds.playError();
            setError(err.message || 'Task creation failed');
            setIsSuccess(false);
            // The text is still kept (draft preserved). Tell the user where it is.
            setResultNote('YOUR TEXT IS SAVED — TAP THE KEYBOARD ON THE START SCREEN TO FINISH IT');
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
                        savedRecording={hasSavedRecording}
                        onTranscribeSaved={handleTranscribeSaved}
                        onDiscardSaved={handleDiscardSaved}
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
                        onTextChange={updateDraft}
                        onDo={handleCreateTask}
                        onDont={() => {
                            clearDraft();
                            navigateTo('INITIAL');
                        }}
                    />
                );
            case 'RESULT':
                return (
                    <ResultScreen
                        success={isSuccess}
                        error={error}
                        note={resultNote}
                        onRetry={retryAvailable ? handleRetryTranscription : undefined}
                        onReset={() => {
                            setError(null);
                            setRetryAvailable(false);
                            setResultNote(null);
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
                        onTextChange={updateDraft}
                        onDo={handleCreateTask}
                        onDont={() => {
                            clearDraft();
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
