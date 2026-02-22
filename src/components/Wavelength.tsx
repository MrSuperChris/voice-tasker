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

            // Frequency visualization
            if (analyser) {
                analyser.getByteTimeDomainData(dataArray);
            }

            ctx.beginPath();
            ctx.strokeStyle = phosphorGreen;
            ctx.lineWidth = 3;

            const sliceWidth = width / dataArray.length;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * (height / 2);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }

            ctx.lineTo(width, height / 2);
            ctx.stroke();

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
