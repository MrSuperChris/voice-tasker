const GROQ_TIMEOUT_MS = 60_000;

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
    const formData = new FormData();
    const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    formData.append('file', audioBlob, `audio.${ext}`);
    formData.append('model', 'whisper-large-v3-turbo');

    // Without a timeout a stalled request hangs on PROCESSING forever (no buttons),
    // and the capture is lost. Abort after GROQ_TIMEOUT_MS and surface a plain error.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData,
            signal: controller.signal
        });
    } catch (err) {
        if (controller.signal.aborted) {
            throw new Error('Timed out talking to Groq');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        // The error body is not always JSON (an HTML 502 from the gateway made
        // response.json() throw "Unexpected token '<'"). Parse defensively and fall
        // back to a status-based message.
        let message = `Groq error ${response.status}`;
        try {
            const error = await response.json();
            if (error?.error?.message) {
                message = error.error.message;
            }
        } catch {
            // Non-JSON error body; keep the status message.
        }
        throw new Error(message);
    }

    const data = await response.json();
    // A 200 without a text field would otherwise crash on data.text.trim().
    if (typeof data.text !== 'string') {
        throw new Error('Groq returned no transcription text');
    }
    return data.text;
}
