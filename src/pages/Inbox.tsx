import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Send,
  Bookmark,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  Check,
  CheckCheck,
  ArrowRight,
  MoreHorizontal,
  X,
  Download,
  Share2,
  MessageSquarePlus,
  Edit2,
  PauseCircle,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Plus,
  Phone,
  MapPin,
  Clock as ClockIcon,
  Monitor,
  Globe,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
  Inbox as InboxIcon,
  UserX,
  Star,
  CheckCircle2,
  ArrowDownUp,
  StickyNote,
} from 'lucide-react';
import {
  Avatar,
  ChannelIcon,
  Drawer,
  EmojiPicker,
  Input,
  Modal,
  Select,
  useConfirm,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { useInboxStore } from '@/store/useInboxStore';
import { contactTypeLabel } from '@/utils/labels';
import { formatPhone, formatTime, timeAgo } from '@/utils/format';
import { downloadCsv } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Conversation, ConversationStatus, Channel, Department } from '@/types';
import type { InboxView } from '@/store/useInboxStore';

export default function Inbox(): JSX.Element {
  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const agents = useDataStore((s) => s.agents);
  const currentUserId = useDataStore((s) => s.currentUserId);
  const sendMessage = useDataStore((s) => s.sendMessage);
  const sendAttachment = useDataStore((s) => s.sendAttachment);
  const setStatus = useDataStore((s) => s.setConversationStatus);
  const assign = useDataStore((s) => s.assignConversation);
  const markRead = useDataStore((s) => s.markConversationRead);
  const templates = useDataStore((s) => s.templates);
  const departments = useDataStore((s) => s.departments);
  const channels = useDataStore((s) => s.channels);
  const bookmarkedConvIds = useDataStore((s) => s.bookmarkedConvIds);
  const toggleBookmark = useDataStore((s) => s.toggleBookmark);
  const showToast = useUIStore((s) => s.showToast);
  const conversationListCollapsed = useUIStore((s) => s.conversationListCollapsed);
  const toggleConversationList = useUIStore((s) => s.toggleConversationList);
  const detailsCollapsed = useUIStore((s) => s.detailsCollapsed);
  const toggleDetails = useUIStore((s) => s.toggleDetails);
  const { confirm } = useConfirm();
  const view = useInboxStore((s) => s.view);
  const selectedId = useInboxStore((s) => s.selectedId);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);
  const selectedChannelId = useInboxStore((s) => s.selectedChannelId);
  const selectedDepartmentId = useInboxStore((s) => s.selectedDepartmentId);

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [inputMode, setInputMode] = useState<'message' | 'note'>('message');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return conversations
      .filter((c) => {
        if (selectedChannelId && c.channelId !== selectedChannelId) return false;
        if (selectedDepartmentId && c.departmentId !== selectedDepartmentId) return false;
        return true;
      })
      .filter((c) => {
        if (view === 'mine') return c.assignedTo === currentUserId && c.status !== 'closed';
        if (view === 'unassigned') return c.assignedTo === null;
        if (view === 'closed') return c.status === 'closed';
        if (view === 'vip') {
          const contact = contacts.find((x) => x.id === c.contactId);
          return contact?.type === 'vip';
        }
        if (view === 'today') {
          const d = new Date(c.lastMessageAt);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }
        return true;
      })
      .filter((c) => {
        if (!search) return true;
        const contact = contacts.find((x) => x.id === c.contactId);
        return contact?.name.includes(search) || contact?.phone.includes(search) || c.lastMessage.includes(search);
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [conversations, contacts, view, search, currentUserId, selectedChannelId, selectedDepartmentId]);

  useEffect(() => {
    if (!selectedId || !filtered.find((c) => c.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId, setSelectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const selectedContact = selected ? contacts.find((c) => c.id === selected.contactId) : null;
  const isBookmarked = selected ? bookmarkedConvIds.has(selected.id) : false;

  useEffect(() => {
    if (selectedId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selected?.messages.length, selectedId]);

  useEffect(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, markRead]);

  const handleSend = (): void => {
    if (!draft.trim() || !selected) return;
    if (inputMode === 'note') {
      sendMessage(selected.id, draft.trim(), 'note');
      showToast('تم حفظ الملاحظة', 'success');
    } else {
      sendMessage(selected.id, draft.trim(), 'text');
      showToast('تم إرسال الرسالة', 'success');
    }
    setDraft('');
  };

  const closeConversation = async (): Promise<void> => {
    if (!selected) return;
    const ok = await confirm({
      title: 'إغلاق المحادثة؟',
      message: 'سيتم وضع علامة "محلولة" على المحادثة. يمكن إعادة فتحها لاحقاً',
      variant: 'info',
      confirmText: 'إغلاق',
    });
    if (ok) {
      setStatus(selected.id, 'closed');
      showToast('تم إغلاق المحادثة', 'success');
    }
  };

  const insertTemplate = (body: string): void => {
    if (!selectedContact) return;
    const filled = body.replace(/{{اسم_العميل}}/g, selectedContact.name)
      .replace(/{{التاريخ}}/g, new Date().toLocaleDateString('ar-OM-u-nu-latn'))
      .replace(/{{رقم_الطلب}}/g, '12345');
    setDraft(filled);
    setShowTemplates(false);
    setTemplateSearch('');
  };

  const handleDownloadConv = (): void => {
    if (!selected || !selectedContact) return;
    downloadCsv(
      `conv-${selectedContact.name}-${new Date().toISOString().slice(0, 10)}.csv`,
      selected.messages.map((m) => ({
        'الاتجاه': m.direction === 'in' ? 'وارد' : 'صادر',
        'النوع': m.type,
        'النص': m.content,
        'الوقت': new Date(m.timestamp).toLocaleString('ar-OM-u-nu-latn'),
        'مقروء': m.read ? 'نعم' : 'لا',
      }))
    );
    showToast(`تم تحميل ${selected.messages.length} رسالة`, 'success');
    setMenuOpen(false);
  };

  const handlePauseConv = (): void => {
    if (!selected) return;
    setStatus(selected.id, 'pending');
    showToast('تم تعليق المحادثة', 'info');
    setMenuOpen(false);
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'document'): void => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    sendAttachment(selected.id, kind, file.name);
    showToast(`تم إرفاق: ${file.name}`, 'success');
    e.target.value = '';
  };

  return (
    <div className="h-screen flex gap-2 p-2 bg-bg-light dark:bg-bg-dark overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => handlePickFile(e, 'document')} />
      <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handlePickFile(e, 'image')} />

      {/* Conversations list */}
      <aside
        className={cn(
          'w-full lg:w-[320px] flex-shrink-0 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card flex-col overflow-hidden',
          conversationListCollapsed
            ? 'hidden'
            : showChatMobile
              ? 'hidden lg:flex'
              : 'flex'
        )}
      >
        <div className="h-[56px] px-4 flex items-center justify-between border-b border-border-light dark:border-border-dark flex-shrink-0">
          <h2 className="text-h3 font-bold">المحادثات</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setNewConvOpen(true)}
              className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
              title="محادثة جديدة"
              aria-label="محادثة جديدة"
            >
              <MessageSquarePlus className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={toggleConversationList}
              className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
              title="طيّ القائمة"
              aria-label="طيّ القائمة"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-3 border-b border-border-light dark:border-border-dark space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
            <input
              type="text"
              placeholder="ابحث عن محادثة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
            />
          </div>
          <InboxFilters
            view={view}
            setView={(v) => useInboxStore.getState().setView(v)}
            selectedChannelId={selectedChannelId}
            setSelectedChannelId={(id) => useInboxStore.getState().setSelectedChannelId(id)}
            selectedDepartmentId={selectedDepartmentId}
            setSelectedDepartmentId={(id) => useInboxStore.getState().setSelectedDepartmentId(id)}
            channels={channels}
            departments={departments}
            counts={{
              mine: conversations.filter((c) => c.assignedTo === currentUserId && c.status !== 'closed').length,
              unassigned: conversations.filter((c) => c.assignedTo === null).length,
              closed: conversations.filter((c) => c.status === 'closed').length,
              all: conversations.length,
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border-light dark:divide-border-dark">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-light dark:text-muted-dark">
              <p className="text-body">لا توجد محادثات</p>
            </div>
          )}
          {filtered.map((conv) => {
            const contact = contacts.find((c) => c.id === conv.contactId);
            if (!contact) return null;
            const agent = conv.assignedTo ? agents.find((a) => a.id === conv.assignedTo) : null;
            const convChannel = channels.find((c) => c.id === conv.channelId);
            const isSelected = selectedId === conv.id;
            const isConvBookmarked = bookmarkedConvIds.has(conv.id);
            return (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedId(conv.id);
                  setShowChatMobile(true);
                }}
                className={cn(
                  'w-full text-start flex gap-3 p-3 transition-colors hover:bg-bg-light dark:hover:bg-bg-dark',
                  isSelected && 'bg-primary/5'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={contact.name} size="md" />
                  {convChannel && (
                    <span className="absolute -bottom-1 -end-1 ring-2 ring-white dark:ring-surface-dark rounded-lg">
                      <ChannelIcon type={convChannel.type} size={10} className="!h-5 !w-5" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {conv.status === 'new' ? (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" title="جديد" />
                      ) : conv.status === 'pending' ? (
                        <span className="h-2 w-2 rounded-full bg-warning flex-shrink-0" title="قيد المعالجة" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-success flex-shrink-0" title="محلولة" />
                      )}
                      {isConvBookmarked && <Bookmark className="h-3 w-3 text-warning fill-current flex-shrink-0" />}
                      <p className="text-body font-semibold truncate">{contact.name}</p>
                    </div>
                    <span className="text-[10px] text-muted-light dark:text-muted-dark flex-shrink-0">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-small text-muted-light dark:text-muted-dark truncate flex-1">{conv.lastMessage}</p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-danger text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat area */}
      <section
        className={cn(
          'flex-1 flex flex-col min-w-0 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card overflow-hidden',
          !showChatMobile && 'hidden lg:flex'
        )}
      >
        {!selected || !selectedContact ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Search className="h-7 w-7" />
              </div>
              <p className="text-h3 font-semibold">اختر محادثة للبدء</p>
              <p className="text-body text-muted-light dark:text-muted-dark mt-1">
                ابحث في القائمة على اليمين أو ابدأ محادثة جديدة
              </p>
              <button
                onClick={() => setNewConvOpen(true)}
                className="mt-4 h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium inline-flex items-center gap-2"
              >
                <MessageSquarePlus className="h-4 w-4" />
                محادثة جديدة
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat topbar */}
            <div className="h-[56px] flex items-center px-4 gap-3 border-b border-border-light dark:border-border-dark flex-shrink-0 bg-white dark:bg-surface-dark">
              {/* Mobile back */}
              <button
                onClick={() => setShowChatMobile(false)}
                className="lg:hidden text-muted-light dark:text-muted-dark p-1.5"
                aria-label="رجوع"
              >
                <ArrowRight className="h-5 w-5" />
              </button>

              {/* Conversation list toggle (visible when collapsed) */}
              {conversationListCollapsed && (
                <button
                  onClick={toggleConversationList}
                  className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark hidden lg:flex items-center justify-center text-muted-light dark:text-muted-dark"
                  title="إظهار قائمة المحادثات"
                  aria-label="إظهار قائمة المحادثات"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}

              {/* Avatar + name */}
              <Avatar name={selectedContact.name} size="sm" />
              <p className="text-body font-bold truncate flex-shrink min-w-0">{selectedContact.name}</p>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Status pill */}
              <StatusDropdown
                status={selected.status}
                onChange={(s) => { setStatus(selected.id, s); showToast('تم تحديث الحالة', 'success'); }}
              />

              {/* Details toggle */}
              <button
                onClick={toggleDetails}
                className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark hidden xl:flex items-center justify-center text-muted-light dark:text-muted-dark"
                title={detailsCollapsed ? 'إظهار التفاصيل' : 'إخفاء التفاصيل'}
                aria-label="تبديل لوحة التفاصيل"
              >
                {detailsCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </button>

              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
                  aria-label="المزيد"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute end-0 mt-1 w-56 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1.5 z-20">
                      <MenuItem icon={<Download className="h-4 w-4" />} label="تحميل المحادثة (CSV)" onClick={handleDownloadConv} />
                      <MenuItem icon={<Share2 className="h-4 w-4" />} label="تحويل لموظف آخر" onClick={() => { setTransferOpen(true); setMenuOpen(false); }} />
                      <MenuItem icon={<MessageSquarePlus className="h-4 w-4" />} label="محادثة جديدة" onClick={() => { setNewConvOpen(true); setMenuOpen(false); }} />
                      <MenuItem icon={<Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current text-warning')} />} label={isBookmarked ? 'إلغاء العلامة' : 'تعليم بنجمة'} onClick={() => { toggleBookmark(selected.id); showToast(isBookmarked ? 'تم إلغاء العلامة' : 'تم التعليم', 'success'); setMenuOpen(false); }} />
                      <MenuItem icon={<PauseCircle className="h-4 w-4" />} label="تعليق (قيد المعالجة)" onClick={handlePauseConv} />
                      <div className="h-px bg-border-light dark:bg-border-dark my-1" />
                      <MenuItem icon={<LayoutGrid className="h-4 w-4" />} label="فتح في نافذة منفصلة" onClick={() => { window.open(`/inbox?conv=${selected.id}`, '_blank'); setMenuOpen(false); }} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 chat-scroll bg-white dark:bg-surface-dark">
              {selected.messages.map((m, i) => {
                const showDate =
                  i === 0 ||
                  new Date(selected.messages[i - 1].timestamp).toDateString() !==
                    new Date(m.timestamp).toDateString();
                const today = new Date().toDateString();
                const msgDate = new Date(m.timestamp).toDateString();
                const dateLabel = msgDate === today
                  ? 'اليوم'
                  : new Date(m.timestamp).toLocaleDateString('ar-OM-u-nu-latn', { day: 'numeric', month: 'long' });
                const agentForMsg = m.direction === 'out' ? (agents.find((a) => a.id === (selected.assignedTo ?? currentUserId))?.name ?? 'الوكيل') : '';
                return (
                  <div key={m.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="inline-block text-[11px] px-3 py-1 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <MessageBubble msg={m} contactName={selectedContact.name} agentName={agentForMsg} />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              className={cn(
                'border-t border-border-light dark:border-border-dark flex-shrink-0',
                inputMode === 'note' ? 'bg-warning/5' : 'bg-white dark:bg-surface-dark'
              )}
            >
              {/* Tabs */}
              <div className="flex items-center px-4 border-b border-border-light dark:border-border-dark">
                <button
                  onClick={() => setInputMode('message')}
                  className={cn(
                    'px-4 py-2.5 text-body font-semibold border-b-2 -mb-px transition-colors',
                    inputMode === 'message'
                      ? 'border-primary text-current'
                      : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
                  )}
                >
                  رسالة
                </button>
                <button
                  onClick={() => setInputMode('note')}
                  className={cn(
                    'px-4 py-2.5 text-body font-semibold border-b-2 -mb-px transition-colors',
                    inputMode === 'note'
                      ? 'border-warning text-current'
                      : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
                  )}
                >
                  ملاحظة
                </button>
              </div>

              {showTemplates && (() => {
                const q = templateSearch.trim().toLowerCase();
                const filteredTemplates = q
                  ? templates.filter((t) => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q))
                  : templates;
                return (
                  <div className="mx-3 mt-3 p-2 rounded-card bg-bg-light dark:bg-bg-dark">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-small font-semibold">الردود السريعة ({filteredTemplates.length})</p>
                      <button onClick={() => { setShowTemplates(false); setTemplateSearch(''); }} className="text-muted-light dark:text-muted-dark p-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="relative mb-2">
                      <Search className="h-3.5 w-3.5 absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                      <input
                        autoFocus
                        type="text"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="ابحث في الردود السريعة..."
                        className="w-full h-8 ps-3 pe-8 rounded-lg bg-white dark:bg-surface-dark border border-transparent text-small focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {filteredTemplates.length === 0 ? (
                        <p className="text-center text-small text-muted-light dark:text-muted-dark py-4">لا توجد ردود مطابقة</p>
                      ) : (
                        filteredTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => insertTemplate(t.body)}
                            className="w-full text-start p-2 rounded-lg hover:bg-white dark:hover:bg-surface-dark text-small"
                          >
                            <p className="font-medium">{t.name}</p>
                            <p className="text-muted-light dark:text-muted-dark text-[11px] truncate">{t.body}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Textarea */}
              <div className="px-4 pt-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={inputMode === 'note' ? 'اكتب ملاحظة داخلية...' : 'اكتب ردك هنا...'}
                  rows={3}
                  className="w-full resize-none bg-transparent border-0 text-body focus:outline-none placeholder:text-muted-light dark:placeholder:text-muted-dark"
                />
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 py-2 relative">
                <div className="flex items-center gap-0.5 relative">
                  <ToolBtn
                    icon={<Sparkles className="h-[18px] w-[18px]" />}
                    label="قوالب"
                    onClick={() => setShowTemplates((v) => !v)}
                  />
                  <ToolBtn
                    icon={<ImageIcon className="h-[18px] w-[18px]" />}
                    label="صورة"
                    onClick={() => imageInputRef.current?.click()}
                  />
                  <ToolBtn
                    icon={<Smile className="h-[18px] w-[18px]" />}
                    label="رمز تعبيري"
                    onClick={() => setShowEmoji((v) => !v)}
                  />
                  <ToolBtn
                    icon={<Paperclip className="h-[18px] w-[18px]" />}
                    label="مرفق"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  {showEmoji && (
                    <EmojiPicker
                      onPick={(emoji) => { setDraft((d) => d + emoji); }}
                      onClose={() => setShowEmoji(false)}
                      align="start"
                    />
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className={cn(
                    'h-10 px-5 rounded-full text-small font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white',
                    inputMode === 'note' ? 'bg-warning hover:opacity-90' : 'bg-primary hover:bg-primary-dark'
                  )}
                  style={{ color: '#fff' }}
                >
                  {inputMode === 'note' ? 'حفظ' : 'إرسال'}
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Details panel */}
      {selected && selectedContact && <DetailsPanel conversation={selected} />}

      {/* Transfer modal */}
      {selected && (
        <TransferModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          conversation={selected}
        />
      )}

      {/* New conv modal */}
      <NewConversationModal open={newConvOpen} onClose={() => setNewConvOpen(false)} />
    </div>
  );
}

function TransferModal({ open, onClose, conversation }: { open: boolean; onClose: () => void; conversation: Conversation }): JSX.Element {
  const agents = useDataStore((s) => s.agents);
  const departments = useDataStore((s) => s.departments);
  const channels = useDataStore((s) => s.channels);
  const assign = useDataStore((s) => s.assignConversation);
  const showToast = useUIStore((s) => s.showToast);
  const [target, setTarget] = useState(conversation.assignedTo ?? '');
  const [note, setNote] = useState('');

  // Eligible agents = those who have access to this channel
  const channel = channels.find((c) => c.id === conversation.channelId);
  const eligibleAgents = channel
    ? agents.filter((a) => a.channels.includes(channel.id))
    : agents;

  const submit = (): void => {
    if (!target) {
      showToast('اختر موظفاً', 'error');
      return;
    }
    assign(conversation.id, target);
    const agent = agents.find((a) => a.id === target);
    showToast(`تم تحويل المحادثة إلى ${agent?.name}`, 'success');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تحويل المحادثة"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
          <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">تحويل</button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-small text-muted-light dark:text-muted-dark">
          الموظفون المُدرجون هم الذين لديهم وصول لـ <strong>{channel?.name}</strong>
        </p>
        <div className="space-y-1.5">
          <label className="text-small font-medium text-muted-light dark:text-muted-dark">حوّل إلى</label>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {eligibleAgents.map((a) => {
              const dept = departments.find((d) => a.departments.includes(d.id));
              return (
                <label
                  key={a.id}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors',
                    target === a.id ? 'border-primary/40 bg-primary/5' : 'border-transparent bg-bg-light dark:bg-bg-dark hover:border-border-light dark:hover:border-border-dark'
                  )}
                >
                  <input type="radio" name="transferTarget" value={a.id} checked={target === a.id} onChange={() => setTarget(a.id)} className="h-4 w-4 accent-primary" />
                  <Avatar name={a.name} size="xs" status={a.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-semibold">{a.name}</p>
                    <p className="text-[10px] text-muted-light dark:text-muted-dark">{dept?.name ?? a.email}</p>
                  </div>
                  {a.status === 'online' && <span className="text-[10px] text-success font-medium">متاح</span>}
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-small font-medium text-muted-light dark:text-muted-dark">ملاحظة داخلية (اختياري)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="السبب أو تفاصيل للموظف..."
            className="w-full px-3 py-2 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
          />
        </div>
      </div>
    </Modal>
  );
}

function NewConversationModal({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const contacts = useDataStore((s) => s.contacts);
  const channels = useDataStore((s) => s.channels);
  const departments = useDataStore((s) => s.departments);
  const agents = useDataStore((s) => s.agents);
  const templates = useDataStore((s) => s.templates);
  const addContact = useDataStore((s) => s.addContact);
  const addConversation = useDataStore((s) => s.addConversation);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);
  const showToast = useUIStore((s) => s.showToast);

  const connectedChannels = channels.filter((c) => c.status === 'connected');

  // Form state
  const [channelId, setChannelId] = useState<string>(connectedChannels[0]?.id ?? '');
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('existing');
  const [existingContactId, setExistingContactId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [message, setMessage] = useState('');

  const channel = channels.find((c) => c.id === channelId) ?? null;
  const existingContact = existingContactId ? contacts.find((c) => c.id === existingContactId) : null;
  const requiresTemplate = channel?.type === 'whatsapp';
  const template = templateId ? templates.find((t) => t.id === templateId) : null;

  // Filtered contacts for search
  const filteredContacts = contacts.filter((c) =>
    !contactSearch ||
    c.name.includes(contactSearch) ||
    c.phone.includes(contactSearch)
  ).slice(0, 8);

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setChannelId(connectedChannels[0]?.id ?? '');
    setContactMode('existing');
    setExistingContactId(null);
    setContactSearch('');
    setNewName('');
    setNewPhone('');
    setDepartmentId('');
    setAgentId('');
    setTemplateId('');
    setMessage('');
  }, [open]);

  // Compute the message preview from template + contact name
  const contactName = contactMode === 'existing'
    ? existingContact?.name ?? ''
    : newName;
  const previewMessage = useMemo(() => {
    if (template) {
      return template.body
        .replace(/{{اسم_العميل}}/g, contactName || '[اسم العميل]')
        .replace(/{{التاريخ}}/g, new Date().toLocaleDateString('ar-OM-u-nu-latn'));
    }
    return message;
  }, [template, message, contactName]);

  // Sync message editable text whenever template changes
  useEffect(() => {
    if (template) {
      setMessage(previewMessage);
    }
  }, [templateId]);

  const validate = (): string | null => {
    if (!channelId) return 'اختر القناة المُرسلة';
    if (contactMode === 'existing' && !existingContactId) return 'اختر جهة الاتصال';
    if (contactMode === 'new' && (!newName.trim() || !newPhone.trim())) return 'املأ اسم العميل والرقم';
    if (requiresTemplate && !templateId) return 'اختر قالب معتمد (مطلوب للواتساب)';
    if (!previewMessage.trim()) return 'الرسالة فارغة';
    return null;
  };

  const submit = (): void => {
    const err = validate();
    if (err) { showToast(err, 'error'); return; }

    // Resolve or create the contact
    let contactId: string;
    let targetName: string;
    if (contactMode === 'existing' && existingContact) {
      contactId = existingContact.id;
      targetName = existingContact.name;
    } else {
      // Create new contact
      addContact({
        name: newName.trim(),
        phone: newPhone.trim(),
        type: 'lead',
        notes: '',
        channels: channel?.type === 'whatsapp' ? ['whatsapp'] : undefined,
      });
      // After addContact, the new contact is at index 0 of contacts (prepended).
      // We pass the trimmed values into addConversation by reading freshly via store.
      const freshContacts = useDataStore.getState().contacts;
      contactId = freshContacts[0]?.id ?? '';
      targetName = newName.trim();
    }

    // Create the conversation with initial message
    const convId = addConversation({
      contactId,
      channelId,
      initialMessage: previewMessage.trim(),
      assignedTo: agentId || undefined,
      departmentId: departmentId || null,
    });

    // Switch to the new conversation
    setSelectedId(convId);

    showToast(`تم بدء المحادثة مع ${targetName} عبر ${channel?.name}`, 'success');
    onClose();
  };

  // Filtered agents: only those who have access to the selected channel
  const eligibleAgents = channelId
    ? agents.filter((a) => a.channels.includes(channelId))
    : agents;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="بدء محادثة جديدة"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
            إلغاء
          </button>
          <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
            <Send className="h-4 w-4" /> إرسال
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* 1. Channel */}
        <FormSection number={1} title="القناة المرسلة" hint="اختر الحساب الذي سترسل منه">
          {connectedChannels.length === 0 ? (
            <div className="p-3 rounded-lg bg-warning/10 text-warning text-small">
              لا توجد قنوات متصلة. اذهب إلى صفحة القنوات لربط حساب.
            </div>
          ) : (
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full h-10 ps-3 pe-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
            >
              {connectedChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.identifier})
                </option>
              ))}
            </select>
          )}
        </FormSection>

        {/* 2. Contact */}
        <FormSection number={2} title="جهة الاتصال" hint="اختر من القائمة أو أضف جهة جديدة">
          <div className="flex items-center border-b border-border-light dark:border-border-dark mb-3">
            <button
              type="button"
              onClick={() => setContactMode('existing')}
              className={cn(
                'px-3 py-2 text-small font-medium border-b-2 -mb-px transition-colors',
                contactMode === 'existing'
                  ? 'border-primary text-current'
                  : 'border-transparent text-muted-light dark:text-muted-dark'
              )}
            >
              موجودة
            </button>
            <button
              type="button"
              onClick={() => setContactMode('new')}
              className={cn(
                'px-3 py-2 text-small font-medium border-b-2 -mb-px transition-colors',
                contactMode === 'new'
                  ? 'border-primary text-current'
                  : 'border-transparent text-muted-light dark:text-muted-dark'
              )}
            >
              جديدة
            </button>
          </div>

          {contactMode === 'existing' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الرقم..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full h-10 ps-3 pe-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
                />
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
                {filteredContacts.length === 0 ? (
                  <p className="p-4 text-small text-muted-light dark:text-muted-dark text-center">لا نتائج</p>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setExistingContactId(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors',
                        existingContactId === c.id && 'bg-primary/5'
                      )}
                    >
                      <Avatar name={c.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-light dark:text-muted-dark truncate font-mono">{formatPhone(c.phone)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                        {contactTypeLabel[c.type]}
                      </span>
                      {existingContactId === c.id && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="اسم العميل"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: أحمد محمد"
              />
              <Input
                label={channel?.type === 'whatsapp' ? 'رقم الواتساب' : 'الرقم/المعرّف'}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+968 9123 4567"
                icon={<Phone className="h-4 w-4" />}
              />
            </div>
          )}
        </FormSection>

        {/* 3. Pre-assignment */}
        <FormSection number={3} title="الإسناد المُسبق" hint="اختياري — يحدد القسم والموظف المسؤول من البداية">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark">القسم</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-10 ps-3 pe-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
              >
                <option value="">بدون قسم</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark">المسؤول</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full h-10 ps-3 pe-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
              >
                <option value="">غير مُسند</option>
                {eligibleAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* 4. Template (required for WhatsApp) */}
        <FormSection
          number={4}
          title="قالب الرسالة"
          hint={requiresTemplate
            ? 'مطلوب — واتساب لا يسمح بالنص الحر لبدء محادثة جديدة. اختر قالباً معتمداً.'
            : 'اختياري — يمكنك اختيار قالب أو كتابة نص حر'}
          required={requiresTemplate}
        >
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full h-10 ps-3 pe-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary mb-2"
          >
            <option value="">{requiresTemplate ? 'اختر قالباً معتمداً...' : 'بدون قالب (نص حر)'}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {template && (
            <p className="text-[11px] text-muted-light dark:text-muted-dark px-1">
              تصنيف: {template.category} · المتغيرات سترتبط تلقائياً باسم العميل
            </p>
          )}
        </FormSection>

        {/* 5. Message preview */}
        <FormSection number={5} title="معاينة الرسالة" hint="يمكنك تعديل النص قبل الإرسال">
          <textarea
            value={previewMessage}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="مرحباً، أتواصل معك بخصوص..."
            className="w-full px-3 py-2 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary leading-relaxed"
          />
          {requiresTemplate && template && (
            <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-info/5 border border-info/20">
              <Sparkles className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-info">
                هذا قالب معتمد من Meta. تعديل النص الأساسي قد يبطل اعتماده.
              </p>
            </div>
          )}
        </FormSection>
      </div>
    </Modal>
  );
}

function FormSection({
  number,
  title,
  hint,
  required,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section>
      <div className="flex items-start gap-2.5 mb-2.5">
        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <div className="flex-1">
          <h3 className="text-body font-bold">
            {title}
            {required && <span className="text-danger ms-1">*</span>}
          </h3>
          {hint && <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="ps-8">{children}</div>
    </section>
  );
}

function DetailsPanel({ conversation }: { conversation: Conversation }): JSX.Element {
  const contacts = useDataStore((s) => s.contacts);
  const agents = useDataStore((s) => s.agents);
  const conversations = useDataStore((s) => s.conversations);
  const departments = useDataStore((s) => s.departments);
  const assign = useDataStore((s) => s.assignConversation);
  const addContactTag = useDataStore((s) => s.addContactTag);
  const removeContactTag = useDataStore((s) => s.removeContactTag);
  const showToast = useUIStore((s) => s.showToast);
  const collapsed = useUIStore((s) => s.detailsCollapsed);
  const toggleDetails = useUIStore((s) => s.toggleDetails);
  const contact = contacts.find((c) => c.id === conversation.contactId);
  const [openAttrs, setOpenAttrs] = useState(true);
  const [openRecent, setOpenRecent] = useState(true);
  const [openTech, setOpenTech] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [groupId, setGroupId] = useState<string>(conversation.departmentId ?? '');

  if (!contact) return <></>;
  const recent = conversations.filter((c) => c.contactId === contact.id && c.id !== conversation.id).slice(0, 3);

  if (collapsed) return <></>;

  const generateSummary = (): void => {
    setGenerating(true);
    setTimeout(() => {
      const last3 = conversation.messages.slice(-3).map((m) => m.content).join(' ');
      setSummary(
        `محادثة مع ${contact.name} (${contactTypeLabel[contact.type]}). آخر طلب: ${last3.slice(0, 120)}${last3.length > 120 ? '...' : ''}`
      );
      setGenerating(false);
      showToast('تم توليد الملخص', 'success');
    }, 700);
  };

  const handleAddTag = (): void => {
    if (!newTag.trim()) { setAddingTag(false); return; }
    addContactTag(contact.id, newTag.trim());
    showToast(`تم إضافة الوسم: ${newTag.trim()}`, 'success');
    setNewTag('');
    setAddingTag(false);
  };

  return (
    <aside className="w-[300px] flex-shrink-0 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card overflow-hidden hidden xl:flex flex-col">
      {/* Section header */}
      <div className="h-[56px] px-4 flex items-center justify-between border-b border-border-light dark:border-border-dark flex-shrink-0">
        <h2 className="text-h3 font-bold">التفاصيل</h2>
        <button
          onClick={toggleDetails}
          title="طيّ التفاصيل"
          className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
      {/* Contact header */}
      <div className="p-5 text-center border-b border-border-light dark:border-border-dark">
        <Avatar name={contact.name} size="lg" className="mx-auto" />
        <p className="text-h3 font-bold mt-3">{contact.name}</p>
        <p className="text-small text-muted-light dark:text-muted-dark mt-0.5 flex items-center justify-center gap-1">
          <Phone className="h-3 w-3" />
          {formatPhone(contact.phone)}
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-small text-muted-light dark:text-muted-dark">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            مسقط، عُمان
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {new Date().toLocaleTimeString('ar-OM-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Assignee/Group */}
      <div className="p-4 border-b border-border-light dark:border-border-dark space-y-3">
        <AssigneeRow
          label="الموظف المسؤول"
          value={conversation.assignedTo}
          options={agents.map((a) => ({ id: a.id, name: a.name }))}
          placeholder="غير مُسند"
          onChange={(id) => { assign(conversation.id, id); showToast(id ? 'تم الإسناد' : 'تم إلغاء الإسناد', 'success'); }}
          renderIndicator={(opt) => opt ? <Avatar name={opt.name} size="xs" /> : <span className="h-5 w-5 rounded-full bg-bg-light dark:bg-bg-dark border border-dashed border-border-light dark:border-border-dark" />}
        />
        <AssigneeRow
          label="المجموعة"
          value={groupId || null}
          options={departments.map((d) => ({ id: d.id, name: d.name, color: d.color }))}
          placeholder="بدون قسم"
          onChange={(id) => { setGroupId(id ?? ''); showToast('تم تحديث القسم', 'success'); }}
          renderIndicator={(opt) => opt ? (
            <span className="h-5 w-5 rounded-full flex-shrink-0" style={{ background: opt.color ?? '#9CA3AF' }} />
          ) : (
            <span className="h-5 w-5 rounded-full bg-bg-light dark:bg-bg-dark border border-dashed border-border-light dark:border-border-dark" />
          )}
        />
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-border-light dark:border-border-dark">
        <p className="text-small text-muted-light dark:text-muted-dark mb-2">الوسوم</p>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-small">
              {t}
              <button
                onClick={() => { removeContactTag(contact.id, t); showToast(`تم إزالة: ${t}`, 'success'); }}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label={`إزالة ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onBlur={handleAddTag}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); if (e.key === 'Escape') { setAddingTag(false); setNewTag(''); } }}
              placeholder="وسم..."
              className="h-6 px-2 rounded-full bg-bg-light dark:bg-bg-dark border border-primary/30 text-small w-24 focus:outline-none focus:border-primary"
            />
          ) : (
            <button onClick={() => setAddingTag(true)} className="inline-flex items-center gap-1 text-small text-muted-light dark:text-muted-dark hover:text-primary px-2 py-0.5 rounded-full border border-dashed border-border-light dark:border-border-dark">
              <Plus className="h-3 w-3" /> إضافة
            </button>
          )}
        </div>
      </div>

      <Collapsible open={openAttrs} onToggle={() => setOpenAttrs((v) => !v)} title="خصائص المحادثة">
        <Attr label="النوع" value={contactTypeLabel[contact.type]} />
        <Attr label="المعرّف" value={`#${conversation.id}`} />
        <Attr label="بدأت" value={timeAgo(conversation.messages[0]?.timestamp ?? conversation.lastMessageAt)} />
        <Attr label="القناة" value="WhatsApp" />
        <Attr label="التصنيف" value={contactTypeLabel[contact.type]} />
        <Attr
          label="الأولوية"
          value={contact.type === 'vip' ? 'عالية' : 'عادية'}
          valueColor={contact.type === 'vip' ? 'text-danger' : undefined}
        />
      </Collapsible>

      <Collapsible open={openRecent} onToggle={() => setOpenRecent((v) => !v)} title="محادثات حديثة">
        {recent.length === 0 ? (
          <p className="text-small text-muted-light dark:text-muted-dark italic px-1">لا محادثات أخرى</p>
        ) : (
          recent.map((c) => (
            <div key={c.id} className="p-2 rounded-lg bg-bg-light dark:bg-bg-dark mb-1.5 text-small">
              <p className="line-clamp-1 font-medium">{c.lastMessage}</p>
              <p className="text-muted-light dark:text-muted-dark text-[11px] mt-0.5">{timeAgo(c.lastMessageAt)}</p>
            </div>
          ))
        )}
      </Collapsible>

      <Collapsible open={openTech} onToggle={() => setOpenTech((v) => !v)} title="معلومات تقنية">
        <Attr label="IP" value="156.220.45.12" icon={<Globe className="h-3 w-3" />} />
        <Attr label="المنصة" value="Android 14" icon={<Monitor className="h-3 w-3" />} />
        <Attr label="المتصفح" value="WhatsApp 2.24" />
      </Collapsible>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-small font-semibold">ملخص المحادثة</p>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        {summary ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-small leading-relaxed">
            {summary}
          </div>
        ) : (
          <button
            onClick={generateSummary}
            disabled={generating}
            className="w-full h-9 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                توليد ملخص
              </>
            )}
          </button>
        )}
      </div>
      </div>
    </aside>
  );
}

function Collapsible({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }): JSX.Element {
  return (
    <div className="border-b border-border-light dark:border-border-dark">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-small font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
        <span>{title}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-1.5">{children}</div>}
    </div>
  );
}

function Attr({ label, value, valueColor, icon }: { label: string; value: string; valueColor?: string; icon?: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between text-small">
      <span className="text-muted-light dark:text-muted-dark flex items-center gap-1.5">{icon}{label}</span>
      <span className={cn('font-medium truncate ms-2', valueColor)}>{value}</span>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start">
      <span className="text-muted-light dark:text-muted-dark">{icon}</span>
      {label}
    </button>
  );
}

function AssigneeRow<T extends { id: string; name: string; color?: string }>({
  label,
  value,
  options,
  placeholder,
  onChange,
  renderIndicator,
}: {
  label: string;
  value: string | null;
  options: T[];
  placeholder: string;
  onChange: (id: string | null) => void;
  renderIndicator: (opt: T | null) => React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const current = value ? options.find((o) => o.id === value) ?? null : null;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-small text-muted-light dark:text-muted-dark flex-shrink-0">{label}</span>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-1 py-0.5 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark transition-colors max-w-[180px]"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {renderIndicator(current)}
          <span className={cn(
            'text-small font-semibold truncate',
            !current && 'text-muted-light dark:text-muted-dark font-normal'
          )}>
            {current?.name ?? placeholder}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-light dark:text-muted-dark opacity-60 flex-shrink-0" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute end-0 mt-1 w-56 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20 max-h-60 overflow-y-auto">
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-small hover:bg-bg-light dark:hover:bg-bg-dark text-start"
              >
                {renderIndicator(null)}
                <span className="flex-1 text-muted-light dark:text-muted-dark">{placeholder}</span>
                {!current && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
              <div className="h-px bg-border-light dark:bg-border-dark my-1" />
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-small hover:bg-bg-light dark:hover:bg-bg-dark text-start"
                >
                  {renderIndicator(opt)}
                  <span className="flex-1 font-medium truncate">{opt.name}</span>
                  {current?.id === opt.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusDropdown({
  status,
  onChange,
}: {
  status: ConversationStatus;
  onChange: (s: ConversationStatus) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const options: { value: ConversationStatus; label: string; dotColor: string }[] = [
    { value: 'new', label: 'مفتوحة', dotColor: 'bg-primary' },
    { value: 'pending', label: 'قيد المعالجة', dotColor: 'bg-warning' },
    { value: 'closed', label: 'مغلقة', dotColor: 'bg-success' },
  ];
  const current = options.find((o) => o.value === status) ?? options[0];
  const triggerClass =
    status === 'closed'
      ? 'bg-success/15 text-success'
      : status === 'pending'
      ? 'bg-warning/15 text-warning'
      : 'bg-primary text-white';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-8 ps-3 pe-2 rounded-full text-small font-medium flex items-center gap-1.5 transition-colors',
          triggerClass
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute end-0 mt-1 w-40 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                role="option"
                aria-selected={opt.value === status}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-small text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors',
                  opt.value === status && 'font-semibold'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', opt.dotColor)} />
                <span className="flex-1">{opt.label}</span>
                {opt.value === status && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InboxFilters({
  view,
  setView,
  selectedChannelId,
  setSelectedChannelId,
  selectedDepartmentId,
  setSelectedDepartmentId,
  channels,
  departments,
  counts,
}: {
  view: InboxView;
  setView: (v: InboxView) => void;
  selectedChannelId: string | null;
  setSelectedChannelId: (id: string | null) => void;
  selectedDepartmentId: string | null;
  setSelectedDepartmentId: (id: string | null) => void;
  channels: Channel[];
  departments: Department[];
  counts: { mine: number; unassigned: number; closed: number; all: number };
}): JSX.Element {
  const [viewOpen, setViewOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<'recent' | 'oldest' | 'unread'>('recent');

  type ViewItem = { key: InboxView; label: string; count: number; icon: JSX.Element; group: 'folder' | 'status' };
  // Colored icons (stroke), Star keeps fill since it reads naturally as filled
  const items: ViewItem[] = [
    { key: 'all', label: 'الكل', count: counts.all, icon: <Globe className="h-4 w-4 text-slate-500" strokeWidth={2} />, group: 'folder' },
    { key: 'mine', label: 'صندوقي', count: counts.mine, icon: <InboxIcon className="h-4 w-4 text-primary" strokeWidth={2} />, group: 'folder' },
    { key: 'unassigned', label: 'غير مسندة', count: counts.unassigned, icon: <UserX className="h-4 w-4 text-warning" strokeWidth={2} />, group: 'folder' },
    { key: 'vip', label: 'VIP', count: 0, icon: <Star className="h-4 w-4 text-yellow-500 fill-current" strokeWidth={2} />, group: 'folder' },
    { key: 'closed', label: 'مغلقة', count: counts.closed, icon: <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} />, group: 'status' },
  ];
  const current = items.find((i) => i.key === view) ?? items[0];
  const sortLabel = { recent: 'الأحدث أولاً', oldest: 'الأقدم أولاً', unread: 'غير المقروءة أولاً' }[sortKey];
  const filterActive = !!selectedChannelId || !!selectedDepartmentId;
  const activeFilterCount = (selectedChannelId ? 1 : 0) + (selectedDepartmentId ? 1 : 0);

  return (
    <div className="flex items-center justify-between gap-2">
      {/* View pill (right/start in RTL) */}
      <div className="relative">
        <button
          onClick={() => setViewOpen((v) => !v)}
          className="h-7 ps-2.5 pe-2 rounded-full bg-bg-light dark:bg-bg-dark text-[12px] font-semibold flex items-center gap-1.5 hover:bg-border-light dark:hover:bg-border-dark transition-colors"
          aria-haspopup="menu"
          aria-expanded={viewOpen}
        >
          <span className="text-muted-light dark:text-muted-dark tabular-nums">{current.count}</span>
          <span>{current.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {viewOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setViewOpen(false)} />
            <div className="absolute start-0 mt-1 w-52 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1.5 z-20">
              {items.filter((i) => i.group === 'folder').map((i) => (
                <ViewOption key={i.key} item={i} active={view === i.key} onClick={() => { setView(i.key); setViewOpen(false); }} />
              ))}
              <div className="h-px bg-border-light dark:bg-border-dark my-1" />
              {items.filter((i) => i.group === 'status').map((i) => (
                <ViewOption key={i.key} item={i} active={view === i.key} onClick={() => { setView(i.key); setViewOpen(false); }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right group: Sort pill + Filter button (left/end in RTL) */}
      <div className="flex items-center gap-1.5">
        {/* Sort pill */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="h-7 ps-2.5 pe-1.5 rounded-full border border-border-light dark:border-border-dark text-[12px] font-medium flex items-center gap-1.5 text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
          >
            <span>{sortLabel}</span>
            <ArrowDownUp className="h-3 w-3" strokeWidth={1.75} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute end-0 mt-1 w-44 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                {(['recent', 'oldest', 'unread'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => { setSortKey(k); setSortOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-small hover:bg-bg-light dark:hover:bg-bg-dark text-start"
                  >
                    <span className="flex-1">{ { recent: 'الأحدث أولاً', oldest: 'الأقدم أولاً', unread: 'غير المقروءة أولاً' }[k] }</span>
                    {sortKey === k && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(true)}
          className={cn(
            'h-7 w-7 rounded-full flex items-center justify-center transition-colors relative',
            filterActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark'
          )}
          aria-expanded={filterOpen}
          title="فلترة"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
          {filterActive && (
            <span className="absolute -top-0.5 -end-0.5 h-3.5 min-w-3.5 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <Drawer open={filterOpen} onClose={() => setFilterOpen(false)} title="تصفية" side="start" width="w-[360px]">
          <div className="space-y-6">
            {filterActive && (
              <button
                onClick={() => { setSelectedChannelId(null); setSelectedDepartmentId(null); }}
                className="w-full h-9 rounded-btn border border-danger/30 text-danger text-small font-medium hover:bg-danger/5 transition-colors"
              >
                مسح كل الفلاتر ({activeFilterCount})
              </button>
            )}
            <FilterPanel
              title="القناة"
              options={channels.map((c) => ({ id: c.id, label: c.name, indicator: <ChannelIcon type={c.type} size={10} className="!h-4 !w-4" /> }))}
              selectedId={selectedChannelId}
              onSelect={setSelectedChannelId}
              allLabel="كل القنوات"
            />
            <FilterPanel
              title="القسم"
              options={departments.map((d) => ({ id: d.id, label: d.name, indicator: <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} /> }))}
              selectedId={selectedDepartmentId}
              onSelect={setSelectedDepartmentId}
              allLabel="كل الأقسام"
            />
          </div>
        </Drawer>
      </div>
    </div>
  );
}

function FilterPanel({
  title,
  options,
  selectedId,
  onSelect,
  allLabel,
}: {
  title: string;
  options: { id: string; label: string; indicator: React.ReactNode }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  allLabel: string;
}): JSX.Element {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark mb-2">
        {title}
      </p>
      <div className="space-y-1">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 h-9 rounded-btn text-small text-start transition-colors',
            selectedId === null
              ? 'bg-primary/10 text-primary font-semibold'
              : 'hover:bg-bg-light dark:hover:bg-bg-dark'
          )}
        >
          <span className="h-4 w-4 rounded-full bg-bg-light dark:bg-bg-dark flex-shrink-0" />
          <span className="flex-1 truncate">{allLabel}</span>
          {selectedId === null && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 h-9 rounded-btn text-small text-start transition-colors',
              selectedId === o.id
                ? 'bg-primary/10 text-primary font-semibold'
                : 'hover:bg-bg-light dark:hover:bg-bg-dark'
            )}
          >
            <span className="flex-shrink-0 flex items-center justify-center">{o.indicator}</span>
            <span className="flex-1 truncate">{o.label}</span>
            {selectedId === o.id && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function ViewOption({ item, active, onClick }: { item: { label: string; count: number; icon: JSX.Element }; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-small text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors',
        active && 'font-semibold'
      )}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
      {item.count > 0 && (
        <span className="text-[11px] font-medium text-muted-light dark:text-muted-dark tabular-nums">
          {item.count}
        </span>
      )}
      <span className="flex-1" />
      {active && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
    </button>
  );
}

function ToolBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="h-9 w-9 rounded-full flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-primary transition-colors"
      title={label}
      aria-label={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function MessageBubble({
  msg,
  contactName,
  agentName,
}: {
  msg: Conversation['messages'][number];
  contactName: string;
  agentName: string;
}): JSX.Element {
  const isOut = msg.direction === 'out';
  const isNote = msg.type === 'note';
  const name = isOut ? agentName : contactName;
  const dateLabel = timeAgo(msg.timestamp);

  // Subtle footer color: gray for note/incoming, light for outgoing (on primary bg)
  const headerMutedClass = isOut && !isNote
    ? 'text-white/70'
    : 'text-muted-light dark:text-muted-dark';

  return (
    <div className={cn('flex gap-3 mb-5', isOut && 'flex-row-reverse')}>
      <div className="flex-shrink-0 pt-1">
        <Avatar name={name} size="sm" />
      </div>
      <div className={cn('flex-1 min-w-0 flex flex-col', isOut ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'max-w-[85%] px-3 py-1.5 text-body',
            isNote
              ? 'bg-warning/15 text-current border border-warning/30 rounded-2xl rounded-tl-sm'
              : isOut
                ? 'bg-primary text-white rounded-2xl rounded-tl-sm'
                : 'bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-2xl rounded-tr-sm'
          )}
        >
          {msg.type === 'image' ? (
            <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /><span>{msg.content}</span></div>
          ) : msg.type === 'document' ? (
            <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{msg.content}</span></div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
          )}
          {/* Footer: small name + date below the message */}
          <div className={cn('flex items-center gap-1.5 text-[10px] mt-1', headerMutedClass)}>
            {isOut ? (
              <>
                <span className="tabular-nums">{dateLabel}</span>
                <span className="font-semibold">· {name}</span>
              </>
            ) : (
              <>
                <span className="font-semibold">{name}</span>
                <span className="tabular-nums">· {dateLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
