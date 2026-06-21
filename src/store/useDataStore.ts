import { create } from 'zustand';
import type {
  Agent,
  AppSettings,
  Campaign,
  CampaignTemplate,
  Channel,
  Contact,
  Conversation,
  Department,
  Integration,
  Message,
  Notification,
  Role,
  Template,
  TemplateCategoryItem,
  WidgetConfig,
} from '@/types';
import { defaultRoles } from './rolesData';
import {
  agents as initialAgents,
  campaigns as initialCampaigns,
  campaignTemplates as initialCampaignTemplates,
  channels as initialChannels,
  contacts as initialContacts,
  conversations as initialConversations,
  departments as initialDepartments,
  integrations as initialIntegrations,
  notifications as initialNotifications,
  templateCategories as initialTemplateCategories,
  templates as initialTemplates,
  widgetConfig as initialWidgetConfig,
} from './mockData';

interface DataState {
  currentUserId: string;
  agents: Agent[];
  contacts: Contact[];
  conversations: Conversation[];
  templates: Template[];
  templateCategories: TemplateCategoryItem[];
  campaigns: Campaign[];
  campaignTemplates: CampaignTemplate[];
  notifications: Notification[];
  channels: Channel[];
  departments: Department[];
  roles: Role[];
  integrations: Integration[];
  widgetConfig: WidgetConfig;
  whatsappConnected: boolean;
  appSettings: AppSettings;

  // Conversation actions
  sendMessage: (conversationId: string, content: string, type?: 'text' | 'note') => void;
  assignConversation: (conversationId: string, agentId: string | null) => void;
  setConversationStatus: (conversationId: string, status: Conversation['status']) => void;
  markConversationRead: (conversationId: string) => void;
  addNote: (conversationId: string, note: string) => void;
  addConversation: (data: {
    contactId: string;
    channelId: string;
    initialMessage: string;
    assignedTo?: string | null;
    departmentId?: string | null;
  }) => string;

  // Contact actions
  addContact: (c: Omit<Contact, 'id' | 'conversationCount' | 'lastContact' | 'createdAt' | 'tags' | 'blocked'>) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // Template actions
  addTemplate: (t: Omit<Template, 'id' | 'usageCount' | 'createdAt'>) => void;
  updateTemplate: (id: string, patch: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;

  // Template category actions
  addTemplateCategory: (c: Omit<TemplateCategoryItem, 'id'>) => void;
  updateTemplateCategory: (id: string, patch: Partial<TemplateCategoryItem>) => void;
  deleteTemplateCategory: (id: string) => void;

  // Agent actions
  addAgent: (a: Omit<Agent, 'id' | 'lastActive' | 'status'>) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  inviteAgent: (data: { email: string; name: string; roleId: string; departments: string[]; channels: string[] }) => void;
  resendInvitation: (id: string) => void;
  cancelInvitation: (id: string) => void;

  // Campaign actions
  addCampaign: (c: Omit<Campaign, 'id' | 'sentCount' | 'openRate' | 'createdAt'>) => void;

  // Campaign template actions
  addCampaignTemplate: (t: Omit<CampaignTemplate, 'id' | 'usageCount' | 'createdAt'>) => void;
  updateCampaignTemplate: (id: string, patch: Partial<CampaignTemplate>) => void;
  deleteCampaignTemplate: (id: string) => void;
  incrementCampaignTemplateUsage: (id: string) => void;

  // Channel actions
  addChannel: (c: Omit<Channel, 'id' | 'createdAt' | 'unreadCount'>) => void;
  updateChannel: (id: string, patch: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;

  // Department actions
  addDepartment: (d: Omit<Department, 'id' | 'createdAt'>) => void;
  updateDepartment: (id: string, patch: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;

  // Role actions
  addRole: (r: Omit<Role, 'id' | 'isSystem'>) => void;
  updateRole: (id: string, patch: Partial<Role>) => void;
  deleteRole: (id: string) => void;

  // Integration
  toggleIntegration: (id: string) => void;

  // Widget config
  updateWidgetConfig: (patch: Partial<WidgetConfig>) => void;

  // App settings
  updateAppSettings: (patch: Partial<AppSettings>) => void;

  // Notifications
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  markNotificationRead: (id: string) => void;

  // Tags / bookmarks
  addContactTag: (contactId: string, tag: string) => void;
  removeContactTag: (contactId: string, tag: string) => void;
  toggleBookmark: (conversationId: string) => void;
  bookmarkedConvIds: Set<string>;

  // Attachments
  sendAttachment: (conversationId: string, type: 'image' | 'document', name: string, dataUrl?: string) => void;
}

const newId = (): string => Math.random().toString(36).slice(2, 10);

export const useDataStore = create<DataState>((set) => ({
  currentUserId: 'a1',
  agents: initialAgents,
  contacts: initialContacts,
  conversations: initialConversations,
  templates: initialTemplates,
  templateCategories: initialTemplateCategories,
  campaigns: initialCampaigns,
  campaignTemplates: initialCampaignTemplates,
  notifications: initialNotifications,
  channels: initialChannels,
  departments: initialDepartments,
  roles: defaultRoles,
  integrations: initialIntegrations,
  appSettings: {
    siteName: 'Chatly',
    siteUrl: 'yourstore.com',
    whatsappPhoneNumberId: '',
    whatsappAccessToken: '',
    whatsappVerifyToken: '',
    businessHoursEnabled: true,
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    notifyNewConversation: true,
    notifyNewMessage: true,
    notifyCampaigns: false,
    notifyBrowser: true,
    notifySound: true,
    theme: 'light',
    twoFactorEnabled: false,
    language: 'ar',
    timezone: 'Asia/Muscat',
    dateFormat: 'DD/MM/YYYY',
  } as AppSettings,
  widgetConfig: initialWidgetConfig,
  whatsappConnected: true,

  sendMessage: (conversationId, content, type = 'text') =>
    set((state) => {
      const message: Message = {
        id: newId(),
        conversationId,
        direction: 'out',
        type,
        content,
        timestamp: new Date().toISOString(),
        read: true,
        delivered: true,
      };
      const isNote = type === 'note';
      return {
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, message],
                // Notes don't update last-customer-message preview
                lastMessage: isNote ? c.lastMessage : content,
                lastMessageAt: isNote ? c.lastMessageAt : message.timestamp,
              }
            : c
        ),
      };
    }),

  assignConversation: (conversationId, agentId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, assignedTo: agentId } : c
      ),
    })),

  setConversationStatus: (conversationId, status) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, status } : c
      ),
    })),

  markConversationRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c
      ),
    })),

  addNote: (conversationId, note) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, notes: [...c.notes, note] } : c
      ),
    })),

  addConversation: (data) => {
    const id = 'conv_' + newId();
    const now = new Date().toISOString();
    const message: Message = {
      id: newId(),
      conversationId: id,
      direction: 'out',
      type: 'text',
      content: data.initialMessage,
      timestamp: now,
      read: true,
      delivered: true,
    };
    set((state) => ({
      conversations: [
        {
          id,
          contactId: data.contactId,
          channelId: data.channelId,
          assignedTo: data.assignedTo ?? state.currentUserId,
          departmentId: data.departmentId ?? null,
          status: 'new',
          lastMessage: data.initialMessage,
          lastMessageAt: now,
          unreadCount: 0,
          messages: [message],
          notes: [],
          activityLog: [],
        },
        ...state.conversations,
      ],
    }));
    return id;
  },

  addContact: (c) =>
    set((state) => ({
      contacts: [
        {
          ...c,
          id: newId(),
          tags: [],
          blocked: false,
          conversationCount: 0,
          lastContact: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        ...state.contacts,
      ],
    })),

  updateContact: (id, patch) =>
    set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  deleteContact: (id) =>
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) })),

  addTemplate: (t) =>
    set((state) => ({
      templates: [
        { ...t, id: newId(), usageCount: 0, createdAt: new Date().toISOString() },
        ...state.templates,
      ],
    })),

  updateTemplate: (id, patch) =>
    set((state) => ({ templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  deleteTemplate: (id) =>
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

  addTemplateCategory: (c) =>
    set((state) => ({
      templateCategories: [...state.templateCategories, { ...c, id: newId() }],
    })),
  updateTemplateCategory: (id, patch) =>
    set((state) => ({
      templateCategories: state.templateCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  deleteTemplateCategory: (id) =>
    set((state) => ({
      templateCategories: state.templateCategories.filter((c) => c.id !== id),
      // Re-assign templates with this category to 'custom' so they don't break
      templates: state.templates.map((t) => (t.category === id ? { ...t, category: 'custom' } : t)),
    })),

  addAgent: (a) =>
    set((state) => ({
      agents: [...state.agents, { ...a, id: newId(), status: 'offline', lastActive: new Date().toISOString() }],
    })),

  updateAgent: (id, patch) =>
    set((state) => ({ agents: state.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

  deleteAgent: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),
  inviteAgent: (data) =>
    set((state) => {
      const id = 'a_' + newId();
      const role = state.roles.find((r) => r.id === data.roleId);
      const legacyRole: 'manager' | 'agent' = role?.id === 'role_owner' || role?.id === 'role_manager' ? 'manager' : 'agent';
      const newAgent: Agent = {
        id,
        name: data.name || data.email.split('@')[0],
        email: data.email,
        role: legacyRole,
        roleId: data.roleId,
        invitationStatus: 'pending',
        invitedAt: new Date().toISOString(),
        status: 'offline',
        active: false,
        lastActive: new Date().toISOString(),
        channels: data.channels,
        departments: data.departments,
      };
      return { agents: [...state.agents, newAgent] };
    }),
  resendInvitation: (id) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, invitedAt: new Date().toISOString() } : a
      ),
    })),
  cancelInvitation: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),

  addCampaign: (c) =>
    set((state) => ({
      campaigns: [
        { ...c, id: newId(), sentCount: 0, openRate: 0, createdAt: new Date().toISOString() },
        ...state.campaigns,
      ],
    })),

  addCampaignTemplate: (t) =>
    set((state) => ({
      campaignTemplates: [
        { ...t, id: newId(), usageCount: 0, createdAt: new Date().toISOString() },
        ...state.campaignTemplates,
      ],
    })),
  updateCampaignTemplate: (id, patch) =>
    set((state) => ({
      campaignTemplates: state.campaignTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  deleteCampaignTemplate: (id) =>
    set((state) => ({ campaignTemplates: state.campaignTemplates.filter((t) => t.id !== id) })),
  incrementCampaignTemplateUsage: (id) =>
    set((state) => ({
      campaignTemplates: state.campaignTemplates.map((t) =>
        t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
      ),
    })),

  addChannel: (c) =>
    set((state) => ({
      channels: [
        ...state.channels,
        { ...c, id: newId(), unreadCount: 0, createdAt: new Date().toISOString() },
      ],
    })),

  updateChannel: (id, patch) =>
    set((state) => ({ channels: state.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  deleteChannel: (id) =>
    set((state) => ({ channels: state.channels.filter((c) => c.id !== id) })),

  addDepartment: (d) =>
    set((state) => ({
      departments: [
        ...state.departments,
        { ...d, id: newId(), createdAt: new Date().toISOString() },
      ],
    })),

  updateDepartment: (id, patch) =>
    set((state) => ({ departments: state.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

  deleteDepartment: (id) =>
    set((state) => ({ departments: state.departments.filter((d) => d.id !== id) })),

  addRole: (r) =>
    set((state) => ({
      roles: [
        ...state.roles,
        { ...r, id: 'role_' + newId(), isSystem: false },
      ],
    })),
  updateRole: (id, patch) =>
    set((state) => ({
      roles: state.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  deleteRole: (id) =>
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== id || r.isSystem),
    })),

  toggleIntegration: (id) =>
    set((state) => ({
      integrations: state.integrations.map((i) =>
        i.id === id
          ? { ...i, connected: !i.connected, lastSync: !i.connected ? new Date().toISOString() : i.lastSync }
          : i
      ),
    })),

  updateWidgetConfig: (patch) =>
    set((state) => ({ widgetConfig: { ...state.widgetConfig, ...patch } })),

  updateAppSettings: (patch) =>
    set((state) => ({ appSettings: { ...state.appSettings, ...patch } })),

  markAllNotificationsRead: () =>
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),

  clearNotifications: () => set({ notifications: [] }),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  // Tags
  addContactTag: (contactId, tag) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === contactId && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c
      ),
    })),

  removeContactTag: (contactId, tag) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === contactId ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      ),
    })),

  // Bookmarks
  bookmarkedConvIds: new Set<string>(),
  toggleBookmark: (conversationId) =>
    set((state) => {
      const next = new Set(state.bookmarkedConvIds);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return { bookmarkedConvIds: next };
    }),

  // Attachments
  sendAttachment: (conversationId, type, name) =>
    set((state) => {
      const message: Message = {
        id: newId(),
        conversationId,
        direction: 'out',
        type,
        content: name,
        timestamp: new Date().toISOString(),
        read: true,
        delivered: true,
      };
      return {
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, message],
                lastMessage: type === 'image' ? `📷 صورة: ${name}` : `📎 ملف: ${name}`,
                lastMessageAt: message.timestamp,
              }
            : c
        ),
      };
    }),
}));
