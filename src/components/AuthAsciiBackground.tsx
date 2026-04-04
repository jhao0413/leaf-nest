'use client';

import { useEffect, useRef } from 'react';

const ASCII_CHARS = ' .,:;irsXA0Q&%B@';
const BG_LUMA_CUTOFF = 236;
const BG_COLOR_TOLERANCE = 237;
const ASCII_CONTRAST = 0.9;
const SHARPEN_AMOUNT = 0.24;
const FPS = 30;
const FRAME_INTERVAL = 1000 / FPS;
const FRAME_SMOOTHNESS = 0.72;
const ASCII_CHAR_SCALE_X = 0.6;
const ASCII_CHAR_SCALE_Y = 0.78;
const ASCII_FONT_MIN = 9;
const ASCII_FONT_MAX = 18;
const ASCII_WIDE_BIAS = 0.9;

interface BgColor {
  r: number;
  g: number;
  b: number;
}

function sampleBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): BgColor | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const stepX = Math.max(1, Math.floor(width / 40));
  const stepY = Math.max(1, Math.floor(height / 40));

  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  };

  for (let x = 0; x < width; x += stepX) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += stepY) {
    add(0, y);
    add(width - 1, y);
  }

  if (!count) return null;
  return { r: r / count, g: g / count, b: b / count };
}

function isBackgroundPixel(
  r: number,
  g: number,
  b: number,
  bgColor: BgColor | null,
): boolean {
  if (!bgColor) return false;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luma >= BG_LUMA_CUTOFF) return true;
  const dr = r - bgColor.r;
  const dg = g - bgColor.g;
  const db = b - bgColor.b;
  return dr * dr + dg * dg + db * db <= BG_COLOR_TOLERANCE;
}

function pixelToAscii(v: number): string {
  const idx = Math.round((Math.min(255, Math.max(0, v)) / 255) * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[idx];
}

export function AuthAsciiBackground({
  className = '',
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousFrame = useRef<Float32Array | null>(null);
  const grayscaleBuffer = useRef<Float32Array | null>(null);
  const sharpenedBuffer = useRef<Float32Array | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const pre = preRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !pre || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let bgColor: BgColor | null = null;
    let lastTs = 0;
    let animFrame = 0;
    let startPlayback: (() => void) | null = null;
    let frameWidth = 0;
    let frameHeight = 0;
    let framePixels = 0;

    const resizeToVideo = () => {
      const containerW = Math.max(1, container.clientWidth);
      const containerH = Math.max(1, container.clientHeight);
      const fallbackRatio = 9 / 16;
      const ratio =
        Number.isFinite(video.videoWidth) && video.videoWidth > 0
          ? (video.videoHeight / video.videoWidth) / ASCII_WIDE_BIAS
          : fallbackRatio / ASCII_WIDE_BIAS;

      const targetFontPx = Math.max(
        ASCII_FONT_MIN,
        Math.min(ASCII_FONT_MAX, Math.round(Math.min(containerW / 75, containerH / 45))),
      );
      pre.style.fontSize = `${targetFontPx}px`;

      const charW = Math.max(4, targetFontPx * ASCII_CHAR_SCALE_X);
      const charH = Math.max(4, targetFontPx * ASCII_CHAR_SCALE_Y);
      const dynamicCols = Math.max(1, Math.floor(containerW / charW));

      const naturalRows = Math.max(
        1,
        Math.floor(dynamicCols * ratio * (charW / charH)),
      );
      const maxRows = Math.max(1, Math.floor(containerH / charH));
      const rows = Math.min(naturalRows, maxRows);
      if (dynamicCols !== frameWidth || rows !== frameHeight) {
        canvas.width = dynamicCols;
        canvas.height = rows;
        frameWidth = dynamicCols;
        frameHeight = rows;
        framePixels = dynamicCols * rows;
        grayscaleBuffer.current = new Float32Array(framePixels);
        sharpenedBuffer.current = new Float32Array(framePixels);
        previousFrame.current = null;
        bgColor = null;
      }
    };

    const render = (ts: number) => {
      if (!video.duration || !isFinite(video.duration)) {
        animFrame = requestAnimationFrame(render);
        return;
      }

      if (!lastTs) lastTs = ts;
      const elapsed = ts - lastTs;

      if (elapsed > FRAME_INTERVAL && video.readyState >= 2) {
        lastTs = ts;

        if (!frameWidth || !frameHeight) {
          resizeToVideo();
          if (!frameWidth || !frameHeight) {
            animFrame = requestAnimationFrame(render);
            return;
          }
        }

        const width = frameWidth;
        const height = frameHeight;
        const total = framePixels;
        const values = grayscaleBuffer.current;
        const outValues = sharpenedBuffer.current;

        if (!values || !outValues) {
          animFrame = requestAnimationFrame(render);
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const image = imageData.data;

        if (!bgColor) {
          bgColor = sampleBackgroundColor(image, width, height);
        }

        for (let i = 0; i < total; i++) {
          const p = i * 4;
          let gray = 0.2126 * image[p] + 0.7152 * image[p + 1] + 0.0722 * image[p + 2];
          gray = (gray - 128) * ASCII_CONTRAST + 128;
          values[i] = Math.min(255, Math.max(0, gray));
        }

        if (!previousFrame.current || previousFrame.current.length !== total) {
          previousFrame.current = new Float32Array(total);
          previousFrame.current.set(values);
        } else {
          const prev = previousFrame.current;
          for (let i = 0; i < total; i++) {
            const smoothed = prev[i] * FRAME_SMOOTHNESS + values[i] * (1 - FRAME_SMOOTHNESS);
            values[i] = smoothed;
            prev[i] = smoothed;
          }
        }

        if (SHARPEN_AMOUNT > 0.001) {
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const i = y * width + x;
              const blur =
                (values[i] +
                  values[i - 1] +
                  values[i + 1] +
                  values[i - width] +
                  values[i + width] +
                  values[i - width - 1] +
                  values[i - width + 1] +
                  values[i + width - 1] +
                  values[i + width + 1]) /
                9;
              const sharpened = values[i] + (values[i] - blur) * (SHARPEN_AMOUNT * 2.2);
              outValues[i] = Math.min(255, Math.max(0, sharpened));
            }
          }
          for (let y = 0; y < height; y++) {
            outValues[y * width] = values[y * width];
            outValues[y * width + (width - 1)] = values[y * width + (width - 1)];
          }
          for (let x = 0; x < width; x++) {
            outValues[x] = values[x];
            outValues[(height - 1) * width + x] = values[(height - 1) * width + x];
          }
        }

        let out = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const idx = y * width + x;
            const bright = SHARPEN_AMOUNT > 0.001 ? outValues[idx] : values[idx];
            out += isBackgroundPixel(image[i], image[i + 1], image[i + 2], bgColor)
              ? ' '
              : pixelToAscii(bright);
          }
          out += '\n';
        }
        pre.textContent = out;
      }

      animFrame = requestAnimationFrame(render);
    };

    const onResize = () => {
      bgColor = null;
      resizeToVideo();
      pre.textContent = pre.textContent ?? '';
    };

    const onLoadedData = async () => {
      bgColor = null;
      resizeToVideo();
      try {
        await video.play();
      } catch {
        startPlayback = () => {
          void video.play().catch(() => {});
          if (startPlayback) {
            document.removeEventListener('click', startPlayback);
            startPlayback = null;
          }
        };
        document.addEventListener('click', startPlayback);
      }
      if (!animFrame) animFrame = requestAnimationFrame(render);
    };

    const onCanPlay = () => {
      if (!animFrame) animFrame = requestAnimationFrame(render);
    };

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('canplay', onCanPlay);
    window.addEventListener('resize', onResize);
    video.load();

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('canplay', onCanPlay);
      if (startPlayback) {
        document.removeEventListener('click', startPlayback);
        startPlayback = null;
      }
      window.removeEventListener('resize', onResize);
      video.pause();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full m-0 overflow-hidden whitespace-pre font-mono text-[10px] font-extrabold leading-[0.78] tracking-[-0.01em] text-cyan-900/80 dark:text-cyan-100/70 select-none"
        style={{
          textShadow: '0 0 6px rgba(15,23,42,0.1), 0 0 12px rgba(30,41,59,0.1)',
          transform: 'scaleX(0.99) scaleY(1.01)',
          filter: 'contrast(1.14) saturate(1.03)',
          transition: 'opacity 600ms ease',
          width: '100%',
          height: '100%',
        }}
      />
      <video
        ref={videoRef}
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
        src="/jimeng-4867-ascii.mp4"
        muted
        loop
        playsInline
        crossOrigin="anonymous"
        preload="auto"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />
    </div>
  );
}
