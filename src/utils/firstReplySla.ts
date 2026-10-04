import type { Conversation, Department, Message } from '@/types';
import { deriveSessions } from './sessions';

/**
 * The target when a conversation has no department, or its department sets
 * none — the same default the department form starts from.
 */
export const DEFAULT_SLA_MINUTES = 30;

export type FirstReplyOutcome = 'met' | 'breached' | 'pending';

export interface FirstReplyCase {
  conversationId: string;
  departmentId: string | null;
  /** When the clock started: the customer's first message, or the AI handoff. */
  startedAt: number;
  slaMinutes: number;
  /** Minutes to the first agent reply; null while unanswered. */
  replyMinutes: number | null;
  outcome: FirstReplyOutcome;
}

export function slaMinutesFor(departmentId: string | null, departments: Department[]): number {
  const d = departmentId ? departments.find((x) => x.id === departmentId) : undefined;
  return d?.slaMinutes ?? DEFAULT_SLA_MINUTES;
}

const ms = (iso: string): number => new Date(iso).getTime();

/** An agent's reply to the customer — not the AI, not an internal note, not the rating request. */
function isAgentReply(m: Message): boolean {
  return m.direction === 'out' && m.sender !== 'ai' && !m.isInternalNote && !m.ratingToken;
}

/**
 * One case per session that a customer opened and an agent was expected to answer.
 *
 * Each case is judged against its own department's target, so cases from
 * departments with different targets can be counted together: what adds up
 * is met vs. breached, never the minutes themselves.
 *
 * - Unanswered past its target → breached: the slowest cases must not drop out.
 * - Unanswered and still within it → pending, not counted yet.
 * - Ended without an agent reply, or still with the AI → not measured.
 */
export function firstReplyCases(
  conversations: Conversation[],
  departments: Department[],
  now: number = Date.now(),
): FirstReplyCase[] {
  const cases: FirstReplyCase[] = [];

  for (const conv of conversations) {
    const sorted = [...conv.messages].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
    const sessions = deriveSessions(conv);
    const slaMinutes = slaMinutesFor(conv.departmentId, departments);

    sessions.forEach((session, i) => {
      const from = ms(session.startedAt);
      const to = i + 1 < sessions.length ? ms(sessions[i + 1].startedAt) : Number.POSITIVE_INFINITY;
      const msgs = sorted.filter((m) => {
        const t = ms(m.timestamp);
        return t >= from && t < to;
      });
      const firstIn = msgs.find((m) => m.direction === 'in');
      if (!firstIn) return; // opened by us (a campaign, a follow-up) — nothing to answer

      const isCurrent = i === sessions.length - 1;
      if (isCurrent && conv.aiActive) return; // the AI owns it; no agent reply is due

      // The handoff belongs to the session it happened in — not necessarily the
      // last one, since the customer may have written again days later.
      const handedOff = conv.aiHandedOff && conv.handedOffAt ? ms(conv.handedOffAt) : null;
      const handoff = handedOff !== null && handedOff >= from && handedOff < to ? handedOff : null;
      const start = handoff !== null && handoff > ms(firstIn.timestamp) ? handoff : ms(firstIn.timestamp);
      const reply = msgs.find((m) => isAgentReply(m) && ms(m.timestamp) >= start);

      if (reply) {
        const replyMinutes = (ms(reply.timestamp) - start) / 60000;
        cases.push({
          conversationId: conv.id, departmentId: conv.departmentId, startedAt: start, slaMinutes, replyMinutes,
          outcome: replyMinutes <= slaMinutes ? 'met' : 'breached',
        });
        return;
      }

      const ended = !isCurrent || conv.status === 'closed';
      if (ended) {
        // Handled by the AI before tracking began, or closed with no reply needed.
        return;
      }
      cases.push({
        conversationId: conv.id, departmentId: conv.departmentId, startedAt: start, slaMinutes, replyMinutes: null,
        outcome: (now - start) / 60000 > slaMinutes ? 'breached' : 'pending',
      });
    });
  }

  return cases;
}
