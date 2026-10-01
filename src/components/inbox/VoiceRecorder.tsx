import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Send, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/useTranslation';

/** Five minutes. Recording pauses itself at the limit so nothing is lost. */
export const MAX_VOICE_SECONDS = 300;

const BAR_WIDTH = 3;
const BAR_GAP = 2;
/** How often a new bar is added to the waveform while recording. */
const SAMPLE_MS = 90;
/** The timer turns amber for the last 30 seconds. */
const WARN_AT_SECONDS = MAX_VOICE_SECONDS - 30;

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * The composer while a voice message is being recorded: one row, the height
 * of the normal composer.
 *
 * Delete sits on the far edge, away from the other buttons: it is the one
 * action that cannot be undone, so a slip aimed at pause or send must not
 * land on it. The limit sits next to the timer rather than in a line of its
 * own, and the pulsing dot alone says "recording" — no caption repeats it.
 *
 * The parent opens the microphone and passes the stream in, so a denied
 * permission never flashes this bar on screen.
 */
export function VoiceRecorder({
  stream,
  note,
  onSend,
  onCancel,
}: {
  stream: MediaStream;
  /** Internal note mode — the send button reads "حفظ" in the note colour. */
  note: boolean;
  onSend: (url: string, seconds: number) => void;
  onCancel: () => void;
}): JSX.Element {
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [barCount, setBarCount] = useState(60);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Elapsed time is kept in refs and mirrored to state for rendering, so the
  // send handler always reads the true duration rather than a stale render.
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  const elapsedNow = (): number =>
    accumulatedRef.current + (startedAtRef.current === null ? 0 : performance.now() - startedAtRef.current);

  const seconds = Math.floor(elapsedMs / 1000);
  const limitReached = seconds >= MAX_VOICE_SECONDS;

  // Recorder, analyser and the frame loop share one lifetime: the stream's.
  useEffect(() => {
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    startedAtRef.current = performance.now();

    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);

    let frame = 0;
    let lastSample = 0;
    const tick = (now: number): void => {
      frame = requestAnimationFrame(tick);
      if (startedAtRef.current === null) return; // paused
      const elapsed = elapsedNow();
      if (elapsed >= MAX_VOICE_SECONDS * 1000) {
        recorder.pause();
        accumulatedRef.current = MAX_VOICE_SECONDS * 1000;
        startedAtRef.current = null;
        setElapsedMs(accumulatedRef.current);
        setPaused(true);
        return;
      }
      if (now - lastSample < SAMPLE_MS) return;
      lastSample = now;
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) {
        const x = (v - 128) / 128;
        sum += x * x;
      }
      // Square root of the RMS: speech sits low on a linear scale, so this
      // spreads quiet and loud syllables across the bar height.
      const level = Math.min(1, Math.sqrt(Math.sqrt(sum / samples.length)) * 1.5);
      setLevels((prev) => (prev.length >= 400 ? [...prev.slice(-399), level] : [...prev, level]));
      setElapsedMs(elapsed);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
      if (recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      stream.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // As many bars as fit: the waveform fills its slot at any composer width.
  useEffect(() => {
    const el = waveRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setBarCount(Math.max(12, Math.floor((entry.contentRect.width + BAR_GAP) / (BAR_WIDTH + BAR_GAP))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const togglePause = (): void => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (paused) {
      if (limitReached) return;
      recorder.resume();
      startedAtRef.current = performance.now();
      setPaused(false);
    } else {
      recorder.pause();
      accumulatedRef.current = elapsedNow();
      startedAtRef.current = null;
      setElapsedMs(accumulatedRef.current);
      setPaused(true);
    }
  };

  const send = (): void => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    const total = Math.max(1, Math.round(elapsedNow() / 1000));
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      onSend(URL.createObjectURL(blob), Math.min(total, MAX_VOICE_SECONDS));
    };
    recorder.stop();
  };

  // Newest bar at the end of the row; in RTL that is the left, so time runs
  // in the reading direction. Unfilled slots are faint dots.
  const shown = levels.slice(-barCount);
  const pad = barCount - shown.length;

  return (
    <div role="group" aria-label={t('تسجيل صوتي')} className="flex items-center gap-2 px-3 py-3">
      <button
        type="button"
        onClick={onCancel}
        title={t('حذف التسجيل')}
        aria-label={t('حذف التسجيل')}
        className="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-danger hover:bg-danger/10 transition-colors"
      >
        <Trash2 className="h-[18px] w-[18px]" />
      </button>

      <div className="flex items-center gap-2 flex-shrink-0 ps-1" aria-live="off">
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full flex-shrink-0',
            paused ? 'bg-muted-light dark:bg-muted-dark' : 'bg-danger animate-pulse'
          )}
        />
        <span className="text-body font-semibold tabular-nums" dir="ltr">
          <span className={cn(seconds >= WARN_AT_SECONDS && 'text-[#B45309] dark:text-warning')}>{clock(seconds)}</span>
          <span className="text-muted-light dark:text-muted-dark font-normal text-small"> / {clock(MAX_VOICE_SECONDS)}</span>
        </span>
      </div>

      <div ref={waveRef} className="flex-1 min-w-0 h-8 flex items-center overflow-hidden mx-2" style={{ gap: BAR_GAP }} aria-hidden>
        {Array.from({ length: pad }, (_, i) => (
          <span key={`p${i}`} className="flex-shrink-0 rounded-full bg-border-light dark:bg-border-dark" style={{ width: BAR_WIDTH, height: BAR_WIDTH }} />
        ))}
        {shown.map((level, i) => (
          <span
            key={i}
            className={cn('flex-shrink-0 rounded-full transition-colors', paused ? 'bg-primary/40' : 'bg-primary')}
            style={{ width: BAR_WIDTH, height: Math.max(BAR_WIDTH, Math.round(level * 32)) }}
          />
        ))}
      </div>

      {limitReached ? (
        <span className="text-[11px] font-medium text-[#B45309] dark:text-warning flex-shrink-0">{t('بلغت الحد الأقصى')}</span>
      ) : (
        <button
          type="button"
          onClick={togglePause}
          title={paused ? t('متابعة التسجيل') : t('إيقاف مؤقت')}
          aria-label={paused ? t('متابعة التسجيل') : t('إيقاف مؤقت')}
          className={cn(
            'h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors',
            paused
              ? 'text-danger bg-danger/10 hover:bg-danger/15'
              : 'text-current bg-bg-light dark:bg-bg-dark hover:bg-border-light dark:hover:bg-border-dark'
          )}
        >
          {paused ? <Mic className="h-[18px] w-[18px]" /> : <Pause className="h-[18px] w-[18px] fill-current" />}
        </button>
      )}

      <button
        type="button"
        onClick={send}
        title={note ? t('حفظ') : t('إرسال')}
        aria-label={note ? t('حفظ') : t('إرسال')}
        className={cn(
          'h-10 w-10 flex-shrink-0 rounded-full transition-colors flex items-center justify-center text-white shadow-sm',
          note ? 'bg-warning hover:opacity-90' : 'bg-primary hover:bg-primary-dark'
        )}
        style={{ color: '#fff' }}
      >
        {/* The plane points along the reading direction: left in RTL. */}
        <Send className="h-[18px] w-[18px] rtl:-scale-x-100" />
      </button>
    </div>
  );
}
