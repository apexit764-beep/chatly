import type { Rating } from '@/store/useRatingStore';
import type { FirstReplyCase } from '@/utils/firstReplySla';

/** Average of the customers' agent ratings that were submitted for this agent. */
export function averageAgentRating(ratings: Rating[], agentId: string): { value: number | null; count: number } {
  const rated = ratings.filter((r) => r.agentId === agentId && r.submittedAt && r.ratingAgent != null);
  if (rated.length === 0) return { value: null, count: 0 };
  return { value: rated.reduce((s, r) => s + (r.ratingAgent ?? 0), 0) / rated.length, count: rated.length };
}

/** Average minutes to the first reply, over the answered cases only. */
export function averageReply(cases: FirstReplyCase[]): { minutes: number | null; count: number } {
  const answered = cases.map((c) => c.replyMinutes).filter((m): m is number => m !== null);
  if (answered.length === 0) return { minutes: null, count: 0 };
  return { minutes: answered.reduce((s, n) => s + n, 0) / answered.length, count: answered.length };
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h} س` : `${h} س ${m % 60} د`;
}
