import type { Conversation, ConversationSession, Message } from '@/types';

/** A silence longer than this starts a new session when no events were recorded. */
export const SESSION_GAP_MS = 24 * 60 * 60 * 1000;

const ms = (iso: string): number => new Date(iso).getTime();

/**
 * Splits a thread into open/close cycles.
 *
 * Recorded `sessionEvents` are authoritative. Messages older than the earliest
 * recorded event predate session tracking, so their boundaries are guessed from
 * silence gaps and flagged `inferred` — a thread can therefore carry both kinds.
 */
export function deriveSessions(
  conv: Pick<Conversation, 'messages' | 'status' | 'sessionEvents'>,
  gapMs: number = SESSION_GAP_MS,
): ConversationSession[] {
  const messages = [...conv.messages].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  if (messages.length === 0) return [];

  const events = conv.sessionEvents ?? [];
  const opens = events.filter((e) => e.type === 'opened').map((e) => ms(e.timestamp)).sort((a, b) => a - b);
  const closes = events.filter((e) => e.type === 'closed').map((e) => ms(e.timestamp)).sort((a, b) => a - b);

  const trackingStart = opens.length > 0 ? opens[0] : Number.POSITIVE_INFINITY;

  const inferredCuts: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const t = ms(messages[i].timestamp);
    if (t >= trackingStart) break;
    if (t - ms(messages[i - 1].timestamp) > gapMs) inferredCuts.push(t);
  }

  const inferredSet = new Set(inferredCuts);
  const cuts = [...new Set([...inferredCuts, ...opens])].sort((a, b) => a - b);

  const buckets: { startCut: number | null; msgs: Message[] }[] = [{ startCut: null, msgs: [] }];
  let ci = 0;
  for (const m of messages) {
    const t = ms(m.timestamp);
    let advanced = false;
    while (ci < cuts.length && t >= cuts[ci]) {
      ci++;
      advanced = true;
    }
    if (advanced) {
      const startCut = cuts[ci - 1];
      const current = buckets[buckets.length - 1];
      if (current.msgs.length > 0) buckets.push({ startCut, msgs: [] });
      else current.startCut = startCut;
    }
    buckets[buckets.length - 1].msgs.push(m);
  }

  const filled = buckets.filter((b) => b.msgs.length > 0);
  const startOf = (b: { startCut: number | null; msgs: Message[] }): number =>
    b.startCut ?? ms(b.msgs[0].timestamp);

  return filled.map((b, i) => {
    const last = b.msgs[b.msgs.length - 1];
    const lastAt = ms(last.timestamp);
    const nextStart = i + 1 < filled.length ? startOf(filled[i + 1]) : Number.POSITIVE_INFINITY;
    const close = closes.find((c) => c >= lastAt && c < nextStart);
    const isLast = i === filled.length - 1;

    let endedAt: string | null;
    if (close !== undefined) endedAt = new Date(close).toISOString();
    else if (isLast && conv.status !== 'closed') endedAt = null;
    else endedAt = last.timestamp;

    return {
      index: i + 1,
      startedAt: new Date(startOf(b)).toISOString(),
      endedAt,
      messageCount: b.msgs.length,
      firstMessageId: b.msgs[0].id,
      inferred: b.startCut !== null && inferredSet.has(b.startCut),
    };
  });
}
