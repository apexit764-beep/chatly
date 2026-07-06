import { useSettingsStore } from '@/store/useSettingsStore';

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (audioCtx && audioCtx.state !== 'closed') return audioCtx;
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

export function playNotificationSound(): void {
  if (!useSettingsStore.getState().notifications.sound) return;

  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.setValueAtTime(1174.66, now + 0.08);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, now + 0.08);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.setValueAtTime(0.15, now + 0.06);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
  gain.gain.linearRampToValueAtTime(0, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.08);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}
