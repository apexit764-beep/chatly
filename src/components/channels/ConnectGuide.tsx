import { useEffect, useRef, useState } from 'react';
import { Maximize2, Play } from 'lucide-react';
import { Modal } from '@components/ui';

/**
 * Short silent clips of connecting each channel, recorded from the live app:
 * open the channel, «ربط حساب جديد», fill the fields, connect. They loop like
 * a GIF — but as H.264 / VP9 they weigh ~150KB instead of several MB, and stay sharp.
 *
 * Keys are the channel type, or `whatsapp-<method>` for WhatsApp's methods.
 */
const VIDEOS = import.meta.glob<string>('@/assets/connect-guides/*.mp4', { eager: true, query: '?url', import: 'default' });
// VP9 alongside H.264: MP4 is listed first, so every browser that can play
// it does; builds without the H.264 codec (Chromium, some Linux) fall through
// to the WebM.
const WEBMS = import.meta.glob<string>('@/assets/connect-guides/*.webm', { eager: true, query: '?url', import: 'default' });
const POSTERS = import.meta.glob<string>('@/assets/connect-guides/*.jpg', { eager: true, query: '?url', import: 'default' });

function assetFor(map: Record<string, string>, key: string, ext: string): string | undefined {
  const hit = Object.keys(map).find((p) => p.endsWith(`/${key}.${ext}`));
  return hit ? map[hit] : undefined;
}

export function hasConnectGuide(key: string): boolean {
  return Boolean(assetFor(VIDEOS, key, 'mp4'));
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/**
 * Plays inline and on loop next to the written steps, so the reader sees each
 * step happen while reading it. Clicking enlarges it with controls. With
 * reduced motion it waits on its poster until asked to play.
 */
export function ConnectGuide({ guideKey, title }: { guideKey: string; title: string }): JSX.Element | null {
  const src = assetFor(VIDEOS, guideKey, 'mp4');
  const webm = assetFor(WEBMS, guideKey, 'webm');
  const poster = assetFor(POSTERS, guideKey, 'jpg');
  const [still] = useState(prefersReducedMotion);
  const [playing, setPlaying] = useState(!still);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  // A new method or channel swaps the clip; start it from the top.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    if (playing) void v.play().catch(() => {});
  }, [src, playing]);

  if (!src) return null;

  return (
    <>
      <div className="relative mb-4 rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark aspect-[13/10] group">
        <video
          ref={ref}
          key={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay={playing}
          preload={playing ? 'auto' : 'none'}
          className="absolute inset-0 h-full w-full object-cover cursor-zoom-in"
          onClick={() => setExpanded(true)}
          aria-label={title}
        >
          <source src={src} type="video/mp4" />
          {webm && <source src={webm} type="video/webm" />}
        </video>
        {!playing && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label="تشغيل"
          >
            <span className="h-12 w-12 rounded-full bg-white/95 text-primary shadow-lg flex items-center justify-center">
              <Play className="h-5 w-5 fill-current ms-0.5" />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="تكبير"
          aria-label="تكبير"
          className="absolute top-2 end-2 h-8 w-8 rounded-lg bg-black/55 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <Modal open={expanded} onClose={() => setExpanded(false)} title={title} size="xl">
        <video poster={poster} muted loop playsInline autoPlay controls className="w-full rounded-lg bg-black">
          <source src={src} type="video/mp4" />
          {webm && <source src={webm} type="video/webm" />}
        </video>
      </Modal>
    </>
  );
}
