'use client';

import { useEffect, useRef } from 'react';

// Pixel-art banner drawn with plain Canvas 2D on a 12px grid. No images, no
// libraries. Hovering spawns lava particles from the peak; the animation loop
// runs only while particles exist and not at all under prefers-reduced-motion.

const CELL = 12;
const HEIGHT = 220;

const SKY = '#1a1412';
const STAR = '#ebebeb';
const ROCK_LIT = '#4a3f3b';
const ROCK_MID = '#332b28';
const ROCK_DARK = '#2c2522';
const LAVA_HOT = '#ffb03b';
const LAVA = '#f37a58';

type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number };

// Small deterministic PRNG so the stars stay put across redraws.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Scene = { peakX: number; peakY: number };

function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number): Scene {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const rand = seeded(cols * 7919 + rows);

  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, width, height);

  const peakRow = 3;
  const centerCol = Math.floor(cols / 2);
  const slope = Math.max(0.9, Math.min(1.6, cols / (rows * 1.4)));

  const halfWidthAt = (row: number) => Math.floor((row - peakRow) * slope) + 1;

  // Stars: a few small squares in the sky, kept clear of the mountain.
  const starCount = Math.max(6, Math.floor(cols * 0.35));
  for (let i = 0; i < starCount; i++) {
    const col = Math.floor(rand() * cols);
    const row = Math.floor(rand() * Math.max(1, rows - 4));
    const hw = row >= peakRow ? halfWidthAt(row) : -1;
    if (Math.abs(col - centerCol) <= hw + 1) continue;
    const size = rand() < 0.3 ? 4 : 3;
    const offset = Math.floor(rand() * (CELL - size));
    ctx.globalAlpha = 0.45 + rand() * 0.55;
    ctx.fillStyle = STAR;
    ctx.fillRect(col * CELL + offset, row * CELL + offset, size, size);
  }
  ctx.globalAlpha = 1;

  // Volcano: a stepped silhouette, lit on the left, darkest on the right.
  for (let row = peakRow; row < rows; row++) {
    const hw = halfWidthAt(row);
    for (let col = centerCol - hw; col <= centerCol + hw; col++) {
      if (col < 0 || col >= cols) continue;
      const dx = col - centerCol;
      ctx.fillStyle = dx < -hw * 0.35 ? ROCK_LIT : dx > hw * 0.35 ? ROCK_DARK : ROCK_MID;
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }

  // Crater and a lava channel down the right flank.
  ctx.fillStyle = LAVA_HOT;
  ctx.fillRect(centerCol * CELL, peakRow * CELL, CELL, CELL);
  let channelCol = centerCol;
  for (let row = peakRow + 1; row < rows; row++) {
    const hw = halfWidthAt(row);
    const step = rand() < 0.65 ? 1 : 0;
    channelCol = Math.min(centerCol + hw, channelCol + step);
    ctx.fillStyle = LAVA;
    ctx.fillRect(channelCol * CELL, row * CELL, CELL, CELL);
    if (row % 3 === 0) {
      ctx.fillStyle = LAVA_HOT;
      ctx.fillRect(channelCol * CELL + 3, row * CELL + 3, 6, 6);
    }
  }

  return { peakX: centerCol * CELL + CELL / 2, peakY: peakRow * CELL };
}

export default function LavaHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The static scene is drawn once per size onto an offscreen canvas and
    // composited under the particles each frame.
    const scene = document.createElement('canvas');
    const sceneCtx = scene.getContext('2d');
    if (!sceneCtx) return;

    let width = 0;
    let dpr = 1;
    let peak: Scene = { peakX: 0, peakY: 0 };
    let particles: Particle[] = [];
    let frame: number | null = null;
    let lastSpawn = 0;

    const composite = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(scene, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 20));
        ctx.fillStyle = p.color;
        const size = p.size;
        ctx.fillRect(Math.round(p.x / size) * size, Math.round(p.y / size) * size, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const layout = () => {
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth || canvas.parentElement?.clientWidth || 320));
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      width = nextWidth;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(HEIGHT * dpr);
      scene.width = canvas.width;
      scene.height = canvas.height;
      sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      peak = drawScene(sceneCtx, width, HEIGHT);
      composite();
    };

    const tick = () => {
      frame = null;
      const gravity = 0.22;
      const next: Particle[] = [];
      for (const p of particles) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        if (p.life > 0 && p.y < HEIGHT + p.size && p.x > -p.size && p.x < width + p.size) next.push(p);
      }
      particles = next;
      composite();
      if (particles.length > 0) frame = window.requestAnimationFrame(tick);
    };

    const spawn = (count: number) => {
      for (let i = 0; i < count && particles.length < 240; i++) {
        particles.push({
          x: peak.peakX + (Math.random() - 0.5) * CELL,
          y: peak.peakY,
          vx: (Math.random() - 0.5) * 3.2,
          vy: -(2.5 + Math.random() * 4),
          color: Math.random() < 0.45 ? LAVA_HOT : LAVA,
          size: Math.random() < 0.3 ? 6 : 4,
          life: 60 + Math.floor(Math.random() * 40),
        });
      }
      if (frame === null && particles.length > 0) frame = window.requestAnimationFrame(tick);
    };

    const onEnter = () => spawn(14);
    const onMove = (event: MouseEvent) => {
      const now = event.timeStamp;
      if (now - lastSpawn < 45) return;
      lastSpawn = now;
      spawn(3);
    };

    layout();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function' && canvas.parentElement) {
      observer = new ResizeObserver(() => layout());
      observer.observe(canvas.parentElement);
    } else {
      window.addEventListener('resize', layout);
    }

    if (!reduceMotion) {
      canvas.addEventListener('mouseenter', onEnter);
      canvas.addEventListener('mousemove', onMove);
    }

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', layout);
      canvas.removeEventListener('mouseenter', onEnter);
      canvas.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero" aria-hidden="true" />;
}
