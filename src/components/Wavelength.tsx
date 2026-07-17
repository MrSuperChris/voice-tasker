import React, { useEffect, useRef } from 'react';

export interface WavelengthProps {
    analyser: AnalyserNode | null;
}

export const Wavelength: React.FC<WavelengthProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const phosphorGreen = '#00ff41';
            ctx.strokeStyle = phosphorGreen;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = phosphorGreen;

            // Background Grid
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 143, 17, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i < width; i += 40) {
                ctx.moveTo(i, 0); ctx.lineTo(i, height);
            }
            for (let i = 0; i < height; i += 40) {
                ctx.moveTo(0, i); ctx.lineTo(width, i);
            }
            ctx.stroke();

            // Frequency bar visualization
            if (analyser) {
                analyser.getByteFrequencyData(dataArray);
            }

            const barCount = 48;
            const barWidth = (width / barCount) * 0.7;
            const gap = (width / barCount) * 0.3;

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[Math.floor(i * dataArray.length / barCount)] / 255;
                const barHeight = Math.max(4, value * height * 0.85);
                const x = i * (barWidth + gap);
                const y = (height - barHeight) / 2;

                const alpha = 0.4 + value * 0.6;
                ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
                ctx.shadowBlur = value > 0.3 ? 12 : 4;
                ctx.fillRect(x, y, barWidth, barHeight);
            }

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [analyser]);

    return (
        <div className="w-full h-1/2 flex items-center justify-center p-4">
            <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full h-full border-x-2 border-[var(--color-phosphor-dim)]"
            />
        </div>
    );
};
