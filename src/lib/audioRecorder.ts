export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    async start(): Promise<void> {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Setup Web Audio API for visualization
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.source.connect(this.analyser);

        const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
        this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.start();
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    stop(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('MediaRecorder not started'));
                return;
            }

            const recorder = this.mediaRecorder;

            const finish = () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                resolve(audioBlob);

                // Stop all tracks to release the microphone
                recorder.stream.getTracks().forEach(track => track.stop());

                // Cleanup Web Audio API
                this.source?.disconnect();
                if (this.audioContext?.state !== 'closed') {
                    this.audioContext?.close();
                }
            };

            // If the mic track ended mid-recording (headset disconnect, another app
            // grabbed the mic, iOS backgrounding), MediaRecorder stops itself: its stop
            // event has already fired, so assigning onstop now would never run and the
            // promise would hang forever (PROCESSING, no buttons). Build the blob from
            // the chunks we captured and resolve immediately.
            if (recorder.state === 'inactive') {
                finish();
                return;
            }

            recorder.onstop = finish;
            recorder.stop();
        });
    }
}
