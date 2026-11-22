import { useChatRunStore } from '@/store/useChatRunStore';
import { useChatTemplateStore } from '@/store/useChatTemplateStore';
import { useDataStore } from '@/store/useDataStore';
import type { Conversation } from '@/types';
import {
  ChatRunner,
  newRunState,
  templateForFirstMessage,
  templateForKeyword,
  templateForOffHours,
  worksOn,
  type ChatTemplate,
} from '@/utils/chatTemplates';

const DAY_MS = 24 * 60 * 60 * 1000;

/** WhatsApp only lets a business send free-form messages within 24 hours of the customer's last one. */
export function customerWindowOpen(conversation: Conversation): boolean {
  const last = [...conversation.messages].reverse().find((m) => m.direction === 'in' && m.type !== 'note');
  return !!last && Date.now() - Date.parse(last.timestamp) < DAY_MS;
}

export function activeRun(conversationId: string) {
  const run = useChatRunStore.getState().runs[conversationId];
  return run && !run.done ? run : null;
}

/** The templates a staff member can send by hand: published, switched on, and on this number. */
export function sendableTemplates(channelId?: string): ChatTemplate[] {
  return useChatTemplateStore.getState().templates.filter((t) => t.status === 'published' && t.active && worksOn(t, channelId));
}

function channelOf(conversationId: string): string | undefined {
  return useDataStore.getState().conversations.find((c) => c.id === conversationId)?.channelId;
}

function runnerFor(conversationId: string, template: ChatTemplate, state = newRunState(template.id)): ChatRunner {
  const data = useDataStore.getState();
  const conversation = data.conversations.find((c) => c.id === conversationId);
  const customer = data.contacts.find((c) => c.id === conversation?.contactId)?.name ?? '';
  return new ChatRunner(
    template,
    state,
    {
      bot: (text, step) =>
        data.sendMessage(conversationId, text, 'text', {
          chatTemplate: { name: template.name, options: step?.opts?.map((o) => o.label) },
        }),
      // Lines about the run are for the team only, so they go in as internal notes.
      sys: (line) => data.sendMessage(conversationId, `القالب «${template.name}»: ${line}`, 'note'),
      deptName: (id) => useDataStore.getState().departments.find((d) => d.id === id)?.name,
      // A department hand-over moves the conversation to that department's queue.
      handover: (departmentId) => {
        if (departmentId) useDataStore.getState().setConversationDepartment(conversationId, departmentId);
      },
    },
    customer,
  );
}

function keep(conversationId: string, runner: ChatRunner): void {
  useChatRunStore.getState().setRun(conversationId, { ...runner.state, template: runner.template });
}

function note(conversationId: string, text: string): void {
  useDataStore.getState().sendMessage(conversationId, text, 'note');
}

export function startTemplate(conversationId: string, template: ChatTemplate, why?: string): void {
  const copy = JSON.parse(JSON.stringify(template)) as ChatTemplate;
  if (why) note(conversationId, why);
  const runner = runnerFor(conversationId, copy);
  runner.start();
  keep(conversationId, runner);
}

function resume(conversationId: string): ChatRunner | null {
  const run = activeRun(conversationId);
  if (!run) return null;
  const { template, ...state } = run;
  return runnerFor(conversationId, template, { ...state });
}

/** The customer wrote: feed the running template, or let a keyword start one. */
export function customerMessage(conversationId: string, text: string): void {
  useDataStore.getState().receiveMessage(conversationId, text);
  const runner = resume(conversationId);
  if (runner) {
    runner.reply(text);
    keep(conversationId, runner);
    return;
  }
  const t = templateForKeyword(sendableTemplates(), text, channelOf(conversationId));
  if (t) startTemplate(conversationId, t, `أُرسل قالب «${t.name}» تلقائيًا بسبب كلمة مفتاحية`);
}

export function simulateFirstMessage(conversationId: string): string | null {
  const t = templateForFirstMessage(sendableTemplates(), channelOf(conversationId));
  if (!t) return 'لا يوجد قالب منشور يُرسل عند أول رسالة من عميل جديد على هذا الرقم';
  useDataStore.getState().receiveMessage(conversationId, 'مرحبا');
  startTemplate(conversationId, t, `أُرسل قالب «${t.name}» تلقائيًا لأنها أول رسالة من عميل جديد`);
  return null;
}

export function simulateOffHours(conversationId: string): string | null {
  const t = templateForOffHours(sendableTemplates(), channelOf(conversationId));
  if (!t) return 'لا يوجد قالب منشور يُرسل خارج أوقات العمل على هذا الرقم';
  useDataStore.getState().receiveMessage(conversationId, 'عندي استفسار');
  startTemplate(conversationId, t, `أُرسل قالب «${t.name}» تلقائيًا لأن الرسالة خارج أوقات العمل`);
  return null;
}

export function simulateNoReply(conversationId: string): string | null {
  const runner = resume(conversationId);
  if (!runner) return 'لا يوجد قالب قيد التشغيل في المحادثة';
  runner.noReply();
  keep(conversationId, runner);
  return null;
}

export function stopTemplate(conversationId: string): void {
  const runner = resume(conversationId);
  if (!runner) return;
  runner.stop();
  keep(conversationId, runner);
}
