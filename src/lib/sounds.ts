/**
 * Guide Sounds - Retro-Vector Audio Synthesizer
 */

class GuideSounds {
    private ctx: AudioContext | null = null;
    private processingOsc: OscillatorNode | null = null;
    private processingGain: GainNode | null = null;

    private getCtx() {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        return this.ctx;
    }

    /**
     * Short blip when recording starts
     */
    playStartRecording() {
        const ctx = this.getCtx();
        const startTime = ctx.currentTime;
        const freqs = [220, 330, 440];

        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, startTime + i * 0.06);
            gain.gain.setValueAtTime(0, startTime + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.04, startTime + i * 0.06 + 0.02);
            gain.gain.linearRampToValueAtTime(0, startTime + i * 0.06 + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime + i * 0.06);
            osc.stop(startTime + i * 0.06 + 0.1);
        });
    }

    /**
     * Descending blip when recording stops
     */
    playStopRecording() {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }

    /**
     * Classic 80s computer "Thinking" hum
     */
    startProcessing() {
        const ctx = this.getCtx();
        if (this.processingOsc) return;

        this.processingOsc = ctx.createOscillator();
        this.processingGain = ctx.createGain();

        this.processingOsc.type = 'sawtooth';
        this.processingOsc.frequency.setValueAtTime(60, ctx.currentTime);

        // Add a bit of jitter/vibrato
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.value = 5;
        vibratoGain.gain.value = 2;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(this.processingOsc.frequency);
        vibrato.start();

        this.processingGain.gain.setValueAtTime(0, ctx.currentTime);
        this.processingGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);

        this.processingOsc.connect(this.processingGain);
        this.processingGain.connect(ctx.destination);

        this.processingOsc.start();
    }

    stopProcessing() {
        if (this.processingOsc && this.processingGain) {
            const ctx = this.getCtx();
            this.processingGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            setTimeout(() => {
                this.processingOsc?.stop();
                this.processingOsc = null;
                this.processingGain = null;
            }, 100);
        }
    }

    /**
     * Upward arpeggio for success
     */
    playSuccess() {
        const ctx = this.getCtx();
        const startTime = ctx.currentTime;
        const freqs = [440, 554.37, 659.25, 880]; // A major arpeggio

        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(f, startTime + i * 0.08);

            gain.gain.setValueAtTime(0, startTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.05, startTime + i * 0.08 + 0.02);
            gain.gain.linearRampToValueAtTime(0, startTime + i * 0.08 + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime + i * 0.08);
            osc.stop(startTime + i * 0.08 + 0.1);
        });
    }

    /**
     * Short blip for failure
     */
    playError() {
        const ctx = this.getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }
}

export const sounds = new GuideSounds();
