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

        this.mediaRecorder = new MediaRecorder(stream);
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

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                resolve(audioBlob);

                // Stop all tracks to release the microphone
                this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());

                // Cleanup Web Audio API
                this.source?.disconnect();
                if (this.audioContext?.state !== 'closed') {
                    this.audioContext?.close();
                }
            };

            this.mediaRecorder.stop();
        });
    }
}
