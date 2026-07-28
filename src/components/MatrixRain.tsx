import React, { useEffect, useRef } from 'react';

// A self-contained Matrix-style falling-glyph effect on a <canvas>. Pure canvas
// 2D + requestAnimationFrame - NO new dependency. It sits as an absolute
// background (behind its siblings), is aria-hidden and non-interactive, and
// tears down its animation frame + ResizeObserver on unmount, so it never
// outlives the screen that mounts it or touches the capture/review flow.

// Half-width katakana (the classic look) plus a few code glyphs and digits.
const GLYPHS =
    'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾚﾛﾜﾝ0123456789:.=*+-<>';

interface MatrixRainProps {
    className?: string;
    /** Glyph cell size in CSS px; also sets column spacing. */
    fontSize?: number;
}

export const MatrixRain: React.FC<MatrixRainProps> = ({ className, fontSize = 16 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match the app's phosphor palette (index.css), with safe fallbacks.
        const rootStyle = getComputedStyle(document.documentElement);
        const green = rootStyle.getPropertyValue('--color-phosphor-green').trim() || '#00ff41';
        const dim = rootStyle.getPropertyValue('--color-phosphor-dim').trim() || '#008f11';
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let width = 0;
        let height = 0;
        let drops: number[] = [];

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            // Read dpr per resize, not once at mount - it changes with browser
            // zoom or a move to a different-density monitor, and a stale value
            // leaves the backing store mis-scaled against the CSS box.
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            // Back the canvas at device resolution so glyphs stay crisp on hi-dpi.
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const columns = Math.max(1, Math.floor(width / fontSize));
            // Keep existing column positions across a resize; seed new columns
            // staggered above the top so they don't all fall in lockstep.
            drops = Array.from({ length: columns }, (_, i) =>
                drops[i] ?? Math.floor((Math.random() * -height) / fontSize));
            ctx.clearRect(0, 0, width, height); // no smeared afterimage on resize
        };

        const drawFrame = () => {
            // A translucent black wash each frame leaves the fading trails.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.fillRect(0, 0, width, height);
            ctx.font = `${fontSize}px monospace`;
            for (let i = 0; i < drops.length; i++) {
                const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
                const x = i * fontSize;
                const y = drops[i] * fontSize;
                // Occasional bright leader glyph over the dimmer stream.
                ctx.fillStyle = Math.random() > 0.975 ? green : dim;
                ctx.fillText(ch, x, y);
                if (y > height && Math.random() > 0.975) {
                    drops[i] = 0;
                } else {
                    drops[i]++;
                }
            }
        };

        resize();

        // Reduced-motion: paint one static, dim frame and animate nothing.
        if (reduced) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = dim;
            for (let i = 0; i < drops.length; i++) {
                ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0],
                    i * fontSize, Math.random() * height);
            }
            return;
        }

        let raf = 0;
        let last = 0;
        const frameMs = 1000 / 20; // ~20fps: reads as Matrix rain, easy on the CPU
        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            if (t - last < frameMs) return;
            last = t;
            drawFrame();
        };
        raf = requestAnimationFrame(loop);

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [fontSize]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
        />
    );
};
