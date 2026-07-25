'use client';

import { useEffect, useRef } from 'react';

const ASCII_CHARS = ' .,:;irsXA0Q&%B@';
const BG_LUMA_CUTOFF = 236;
const BG_COLOR_TOLERANCE = 237;
const ASCII_CONTRAST = 0.9;
const SHARPEN_AMOUNT = 0.24;
const FPS = 30;
const GECKO_FPS = 20;
const REDUCED_MOTION_FPS = 10;
const FRAME_SMOOTHNESS = 0.72;
const ASCII_CHAR_SCALE_X = 0.6;
const ASCII_CHAR_SCALE_Y = 0.78;
const ASCII_GRID_SCALE_X = 1.18;
const ASCII_GRID_SCALE_Y = 1.12;
const ASCII_FONT_MIN = 6;
const ASCII_FONT_MAX = 12;
const BG_RESAMPLE_INTERVAL = 18;
const LOOP_RESET_THRESHOLD = 0.08;
const MAX_DEVICE_PIXEL_RATIO = 1.75;
const GECKO_MAX_DEVICE_PIXEL_RATIO = 1.15;
const MAX_ASCII_COLS = 138;
const MOBILE_MAX_ASCII_COLS = 104;
const LOW_POWER_CELL_COUNT = 9500;
const GLYPH_ALPHA_MIN = 0.16;
const POINTER_RADIUS_MIN = 108;
const POINTER_RADIUS_MAX = 176;
const POINTER_FADE_MS = 760;
const POINTER_IDLE_MS = 90;
const HOVER_TEXT = '❧⁂¶§☙';
const FLOW_TRAIL_LENGTH = 14;
const FLOW_LIFETIME_MS = 1150;

interface FlowPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
}

interface BgColor {
  r: number;
  g: number;
  b: number;
}

function sampleBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
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

function blendBackgroundColor(current: BgColor | null, next: BgColor | null): BgColor | null {
  if (!next) return current;
  if (!current) return next;

  return {
    r: current.r * 0.82 + next.r * 0.18,
    g: current.g * 0.82 + next.g * 0.18,
    b: current.b * 0.82 + next.b * 0.18
  };
}

function isBackgroundPixel(r: number, g: number, b: number, bgColor: BgColor | null): boolean {
  if (!bgColor) return false;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luma >= BG_LUMA_CUTOFF) return true;
  const dr = r - bgColor.r;
  const dg = g - bgColor.g;
  const db = b - bgColor.b;
  return dr * dr + dg * dg + db * db <= BG_COLOR_TOLERANCE;
}

function pixelToAsciiIndex(v: number): number {
  return Math.round((Math.min(255, Math.max(0, v)) / 255) * (ASCII_CHARS.length - 1));
}

function smoothstep01(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function getGlyphColor(): [number, number, number] {
  const hasDarkClass =
    document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');

  if (hasDarkClass || window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return [226, 232, 240];
  }

  return [51, 65, 85];
}

export function AuthAsciiBackground({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previousFrame = useRef<Float32Array | null>(null);
  const grayscaleBuffer = useRef<Float32Array | null>(null);
  const sharpenedBuffer = useRef<Float32Array | null>(null);
  const flowBuffer = useRef<Float32Array | null>(null);
  const flowOffsetXBuffer = useRef<Float32Array | null>(null);
  const flowOffsetYBuffer = useRef<Float32Array | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const outputCanvas = outputCanvasRef.current;
    const sampleCanvas = sampleCanvasRef.current;
    const container = containerRef.current;
    if (!video || !outputCanvas || !sampleCanvas || !container) return;

    const outputCtx = outputCanvas.getContext('2d');
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!outputCtx || !sampleCtx) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const userAgent = navigator.userAgent.toLowerCase();
    const isGeckoLike = userAgent.includes('firefox') || userAgent.includes('zen');

    let bgColor: BgColor | null = null;
    let lastTs = 0;
    let animFrame = 0;
    let startPlayback: (() => void) | null = null;
    let frameWidth = 0;
    let frameHeight = 0;
    let framePixels = 0;
    let fontPx = ASCII_FONT_MIN;
    let charW = 0;
    let charH = 0;
    let offsetX = 0;
    let offsetY = 0;
    let containerWidth = 0;
    let containerHeight = 0;
    let currentDpr = 1;
    let frameCount = 0;
    let previousVideoTime = -1;
    let pointerX = -1000;
    let pointerY = -1000;
    let pointerTs = -Infinity;
    let pointerRadius = POINTER_RADIUS_MIN;
    let previousPointerX = -1000;
    let previousPointerY = -1000;
    let previousPointerTs = -Infinity;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    const flowTrail: FlowPoint[] = [];
    let glyphColor = getGlyphColor();
    let isDark = document.documentElement.classList.contains('dark');

    const updateTheme = () => {
      glyphColor = getGlyphColor();
      isDark = document.documentElement.classList.contains('dark');
    };

    const syncGeometry = () => {
      containerWidth = Math.max(1, container.clientWidth);
      containerHeight = Math.max(1, container.clientHeight);
      currentDpr = Math.min(
        window.devicePixelRatio || 1,
        isGeckoLike ? GECKO_MAX_DEVICE_PIXEL_RATIO : MAX_DEVICE_PIXEL_RATIO
      );

      const outputWidth = Math.max(1, Math.round(containerWidth * currentDpr));
      const outputHeight = Math.max(1, Math.round(containerHeight * currentDpr));

      if (outputCanvas.width !== outputWidth || outputCanvas.height !== outputHeight) {
        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;
      }

      fontPx = Math.max(
        ASCII_FONT_MIN,
        Math.min(ASCII_FONT_MAX, Math.round(Math.min(containerWidth / 75, containerHeight / 45)))
      );

      charW = Math.max(4, fontPx * ASCII_CHAR_SCALE_X * ASCII_GRID_SCALE_X);
      charH = Math.max(4, fontPx * ASCII_CHAR_SCALE_Y * ASCII_GRID_SCALE_Y);
      const maxCols = containerWidth < 768 ? MOBILE_MAX_ASCII_COLS : MAX_ASCII_COLS;
      const cols = Math.max(1, Math.min(maxCols, Math.ceil(containerWidth / charW)));
      const rows = Math.max(1, Math.ceil(containerHeight / charH));

      // When the column cap is reached on wide screens, stretch the grid spacing
      // to the container bounds instead of leaving an uncovered strip on the right.
      charW = containerWidth / cols;
      charH = containerHeight / rows;

      offsetX = 0;
      offsetY = 0;

      if (cols !== frameWidth || rows !== frameHeight) {
        sampleCanvas.width = cols;
        sampleCanvas.height = rows;
        frameWidth = cols;
        frameHeight = rows;
        framePixels = cols * rows;
        grayscaleBuffer.current = new Float32Array(framePixels);
        sharpenedBuffer.current = new Float32Array(framePixels);
        flowBuffer.current = new Float32Array(framePixels);
        flowOffsetXBuffer.current = new Float32Array(framePixels);
        flowOffsetYBuffer.current = new Float32Array(framePixels);
        previousFrame.current = null;
        bgColor = null;
      }

      outputCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
      outputCtx.textAlign = 'center';
      outputCtx.textBaseline = 'middle';
      outputCtx.font = `700 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      outputCtx.shadowBlur = fontPx * 0.28;
    };

    const clearOutput = () => {
      outputCtx.setTransform(1, 0, 0, 1, 0, 0);
      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      outputCtx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
    };

    const resetTemporalState = () => {
      previousFrame.current = null;
      bgColor = null;
      frameCount = 0;
      previousVideoTime = -1;
      lastTs = 0;
    };

    const ensureAnimationFrame = () => {
      if (!animFrame && !document.hidden) {
        animFrame = requestAnimationFrame(render);
      }
    };

    const render = (ts: number) => {
      animFrame = 0;

      if (document.hidden) {
        return;
      }

      if (!video.duration || !Number.isFinite(video.duration)) {
        ensureAnimationFrame();
        return;
      }

      const preferredFrameInterval =
        1000 / (reducedMotionQuery.matches ? REDUCED_MOTION_FPS : isGeckoLike ? GECKO_FPS : FPS);

      if (!lastTs) lastTs = ts;
      const elapsed = ts - lastTs;

      if (elapsed >= preferredFrameInterval && video.readyState >= 2) {
        lastTs = ts - (elapsed % preferredFrameInterval);

        if (!frameWidth || !frameHeight) {
          syncGeometry();
          if (!frameWidth || !frameHeight) {
            ensureAnimationFrame();
            return;
          }
        }

        if (
          previousVideoTime >= 0 &&
          video.currentTime + LOOP_RESET_THRESHOLD < previousVideoTime
        ) {
          resetTemporalState();
        }
        previousVideoTime = video.currentTime;

        const width = frameWidth;
        const height = frameHeight;
        const total = framePixels;
        const values = grayscaleBuffer.current;
        const outValues = sharpenedBuffer.current;

        if (!values || !outValues) {
          ensureAnimationFrame();
          return;
        }

        sampleCtx.drawImage(video, 0, 0, width, height);
        const imageData = sampleCtx.getImageData(0, 0, width, height);
        const image = imageData.data;

        if (!bgColor || frameCount % BG_RESAMPLE_INTERVAL === 0) {
          bgColor = blendBackgroundColor(bgColor, sampleBackgroundColor(image, width, height));
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

        const lowPowerMode = isGeckoLike || total > LOW_POWER_CELL_COUNT;

        if (SHARPEN_AMOUNT > 0.001 && !lowPowerMode) {
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

        const [colorR, colorG, colorB] = glyphColor;
        const shadowAlpha = isDark ? 0.18 : 0.1;
        const fillColor = `rgb(${colorR}, ${colorG}, ${colorB})`;
        const pointerAge = ts - pointerTs;
        const pointerPresence = reducedMotionQuery.matches
          ? pointerAge < POINTER_FADE_MS
            ? 0.7
            : 0
          : 1 - smoothstep01((pointerAge - POINTER_IDLE_MS) / POINTER_FADE_MS);
        while (
          flowTrail.length &&
          ts - flowTrail[flowTrail.length - 1].createdAt > FLOW_LIFETIME_MS
        ) {
          flowTrail.pop();
        }
        const hasFlowTrail = flowTrail.length > 0;
        const flowValues = flowBuffer.current;
        const flowOffsetXValues = flowOffsetXBuffer.current;
        const flowOffsetYValues = flowOffsetYBuffer.current;

        if (flowValues && flowOffsetXValues && flowOffsetYValues) {
          flowValues.fill(0);
          flowOffsetXValues.fill(0);
          flowOffsetYValues.fill(0);

          for (const point of flowTrail) {
            const age = ts - point.createdAt;
            if (age < 0 || age > FLOW_LIFETIME_MS) continue;

            const life = 1 - smoothstep01(age / FLOW_LIFETIME_MS);
            const drift = reducedMotionQuery.matches ? 0 : age * 0.032;
            const pointX = point.x + point.vx * drift;
            const pointY = point.y + point.vy * drift;
            const radius = pointerRadius * (0.66 + age / FLOW_LIFETIME_MS);
            const radiusSquared = radius * radius;
            const minX = Math.max(0, Math.floor((pointX - radius) / charW));
            const maxX = Math.min(frameWidth - 1, Math.ceil((pointX + radius) / charW));
            const minY = Math.max(0, Math.floor((pointY - radius) / charH));
            const maxY = Math.min(frameHeight - 1, Math.ceil((pointY + radius) / charH));

            for (let gridY = minY; gridY <= maxY; gridY++) {
              const drawY = offsetY + gridY * charH + charH / 2;
              const dy = drawY - pointY;

              for (let gridX = minX; gridX <= maxX; gridX++) {
                const drawX = offsetX + gridX * charW + charW / 2;
                const dx = drawX - pointX;
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared >= radiusSquared) continue;

                const distance = Math.sqrt(distanceSquared);
                const spatial = smoothstep01(1 - distance / radius);
                const ripple = reducedMotionQuery.matches
                  ? 1
                  : 0.7 + 0.3 * Math.sin(age * 0.015 - distance * 0.105);
                const influence = spatial * life * ripple;
                const gridIndex = gridY * frameWidth + gridX;

                if (influence > flowValues[gridIndex]) {
                  flowValues[gridIndex] = influence;
                }
                const inverseDistance = 1 / Math.max(18, distance);
                flowOffsetXValues[gridIndex] +=
                  (-dy * inverseDistance * 5.5 + point.vx * 7) * influence;
                flowOffsetYValues[gridIndex] +=
                  (dx * inverseDistance * 5.5 + point.vy * 7) * influence;
              }
            }
          }
        }

        clearOutput();
        outputCtx.font = `700 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        outputCtx.shadowColor = `rgba(15, 23, 42, ${shadowAlpha})`;
        outputCtx.shadowBlur = lowPowerMode ? fontPx * 0.12 : fontPx * 0.28;
        outputCtx.fillStyle = fillColor;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pxIndex = (y * width + x) * 4;
            const idx = y * width + x;
            const isBackground = isBackgroundPixel(
              image[pxIndex],
              image[pxIndex + 1],
              image[pxIndex + 2],
              bgColor
            );
            const drawX = offsetX + x * charW + charW / 2;
            const drawY = offsetY + y * charH + charH / 2;

            if (isBackground) {
              if (pointerPresence <= 0.001 && !hasFlowTrail) continue;

              let flow = flowValues?.[idx] ?? 0;
              const flowOffsetX = flowOffsetXValues?.[idx] ?? 0;
              const flowOffsetY = flowOffsetYValues?.[idx] ?? 0;

              if (flow <= 0.001) {
                const dx = drawX - pointerX;
                const dy = drawY - pointerY;
                const distance = Math.hypot(dx, dy);
                if (distance >= pointerRadius) continue;
                flow = smoothstep01(1 - distance / pointerRadius) * pointerPresence;
              }

              const hoverAlpha = flow * (isDark ? 0.78 : 0.62);
              if (hoverAlpha < 0.035) continue;

              const textIndex = (x + y * 3 + Math.floor(ts / 240)) % HOVER_TEXT.length;
              outputCtx.globalAlpha = hoverAlpha;
              outputCtx.fillText(
                HOVER_TEXT[textIndex],
                drawX + Math.max(-12, Math.min(12, flowOffsetX)),
                drawY + Math.max(-12, Math.min(12, flowOffsetY))
              );
              continue;
            }

            const bright = SHARPEN_AMOUNT > 0.001 && !lowPowerMode ? outValues[idx] : values[idx];
            const charIndex = pixelToAsciiIndex(bright);
            if (charIndex <= 0) {
              continue;
            }

            const glyph = ASCII_CHARS[charIndex];
            const tone = smoothstep01(charIndex / (ASCII_CHARS.length - 1));
            const alpha = Math.min(0.95, GLYPH_ALPHA_MIN + tone * 0.82);
            outputCtx.globalAlpha = alpha;
            outputCtx.fillText(glyph, drawX, drawY);

            if (!lowPowerMode && tone > 0.82) {
              outputCtx.globalAlpha = Math.min(0.98, alpha * 0.5);
              outputCtx.fillText(glyph, drawX, drawY);
            }
          }
        }
        outputCtx.globalAlpha = 1;

        frameCount += 1;
      }

      ensureAnimationFrame();
    };

    const onResize = () => {
      syncGeometry();
      resetTemporalState();
      clearOutput();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animFrame) {
          cancelAnimationFrame(animFrame);
          animFrame = 0;
        }
        return;
      }

      lastTs = 0;
      ensureAnimationFrame();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const now = performance.now();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      const elapsed = Math.max(8, now - previousPointerTs);

      if (Number.isFinite(previousPointerTs)) {
        const nextVelocityX = (nextX - previousPointerX) / elapsed;
        const nextVelocityY = (nextY - previousPointerY) / elapsed;
        pointerVelocityX = pointerVelocityX * 0.68 + nextVelocityX * 0.32;
        pointerVelocityY = pointerVelocityY * 0.68 + nextVelocityY * 0.32;
      }

      pointerX = nextX;
      pointerY = nextY;
      pointerTs = now;
      pointerRadius = Math.min(
        POINTER_RADIUS_MAX,
        Math.max(POINTER_RADIUS_MIN, Math.min(containerWidth, containerHeight) * 0.19)
      );

      const moved = Math.hypot(nextX - previousPointerX, nextY - previousPointerY);
      if (!flowTrail.length || moved > charW * 0.7 || now - previousPointerTs > 38) {
        flowTrail.unshift({
          x: nextX,
          y: nextY,
          vx: Math.max(-1.2, Math.min(1.2, pointerVelocityX)),
          vy: Math.max(-1.2, Math.min(1.2, pointerVelocityY)),
          createdAt: now
        });
        if (flowTrail.length > FLOW_TRAIL_LENGTH) flowTrail.length = FLOW_TRAIL_LENGTH;
      }

      previousPointerX = nextX;
      previousPointerY = nextY;
      previousPointerTs = now;
      ensureAnimationFrame();
    };

    const onPointerLeave = () => {
      pointerTs = performance.now() - POINTER_IDLE_MS;
    };

    const onLoadedData = async () => {
      syncGeometry();
      resetTemporalState();

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

      ensureAnimationFrame();
    };

    const onCanPlay = () => {
      syncGeometry();
      ensureAnimationFrame();
    };

    const resizeObserver = new ResizeObserver(onResize);
    const themeObserver = new MutationObserver(updateTheme);
    resizeObserver.observe(container);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('canplay', onCanPlay);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    syncGeometry();
    video.load();

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('canplay', onCanPlay);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      if (startPlayback) {
        document.removeEventListener('click', startPlayback);
        startPlayback = null;
      }
      video.pause();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={outputCanvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full pointer-events-none"
        style={{
          filter: 'contrast(1.08)',
          transform: 'scaleX(0.995) scaleY(1.01)',
          transition: 'opacity 600ms ease'
        }}
      />
      <video
        ref={videoRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
        src="/jimeng-4867-ascii.mp4"
        muted
        loop
        playsInline
        disablePictureInPicture
        crossOrigin="anonymous"
        preload="auto"
      />
      <canvas
        ref={sampleCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />
    </div>
  );
}
