export type ConversationStatus = 'new' | 'pending' | 'closed';
export type ContactType = 'tenant' | 'owner' | 'seeker' | 'company' | 'vip';
export type AgentRole = 'manager' | 'agent';

export type PermissionKey =
  // Conversations
  | 'conversations.view_all'
  | 'conversations.view_department'
  | 'conversations.view_assigned'
  | 'conversations.reply'
  | 'conversations.transfer'
  | 'conversations.close'
  | 'conversations.delete'
  | 'conversations.export'
  // Contacts
  | 'contacts.view'
  | 'contacts.create'
  | 'contacts.edit'
  | 'contacts.delete'
  | 'contacts.export'
  | 'contacts.import'
  // Channels
  | 'channels.view'
  | 'channels.connect'
  | 'channels.configure'
  | 'channels.delete'
  // Templates & Replies
  | 'templates.view'
  | 'templates.create'
  | 'templates.edit'
  | 'templates.delete'
  // Campaigns
  | 'campaigns.view'
  | 'campaigns.create'
  | 'campaigns.send'
  // Reports
  | 'reports.view'
  | 'reports.export'
  // Team & Departments
  | 'team.view'
  | 'team.invite'
  | 'team.edit_member'
  | 'team.remove_member'
  | 'team.manage_roles'
  | 'departments.view'
  | 'departments.manage'
  // Billing & Settings
  | 'billing.view'
  | 'billing.manage'
  | 'settings.view'
  | 'settings.edit';

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Built-in roles cannot be deleted */
  isSystem: boolean;
  permissions: PermissionKey[];
}
export type AgentStatus = 'online' | 'busy' | 'offline';
export type MessageDirection = 'in' | 'out';
export type MessageType = 'text' | 'image' | 'document' | 'voice' | 'note';
export type CampaignStatus = 'draft' | 'scheduled' | 'completed' | 'failed';
export type TemplateCategory = 'welcome' | 'followup' | 'payment' | 'closing' | 'custom';
export type ChannelType =
  // Communication
  | 'whatsapp' | 'messenger' | 'instagram' | 'telegram' | 'x' | 'widget' | 'email'
  // E-commerce
  | 'salla' | 'zid' | 'shopify' | 'woocommerce';
export type ChannelCategory = 'communication' | 'ecommerce';
export type ChannelStatus = 'connected' | 'disconnected' | 'pending';

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;            // مثلاً "المبيعات الرئيسي"
  identifier: string;      // رقم الواتساب أو username للمنصة
  status: ChannelStatus;
  departmentId: string | null;
  unreadCount: number;
  createdAt: string;
  color?: string;          // for badge / icon background
  /** Connection secrets (API keys, tokens). Demo-only — stored as-is. */
  credentials?: Record<string, string>;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;           // for badge
  channels: string[];      // channel IDs
  agents: string[];        // agent IDs
  createdAt: string;
  /** SLA target — minutes until first response should happen */
  slaMinutes?: number;
  /** Keywords that auto-route incoming conversations here (case-insensitive) */
  routingKeywords?: string[];
}

export type InvitationStatus = 'active' | 'pending' | 'suspended';

export interface WorkingHours {
  enabled: boolean;
  /** 24h format "HH:mm" */
  start: string;
  end: string;
  /** Days the agent works — 0=Sunday … 6=Saturday */
  days: number[];
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  /** Legacy role kept for backwards compatibility — derived from roleId */
  role: AgentRole;
  /** New: references roles[].id — drives permissions */
  roleId: string;
  /** Account status: active = working, pending = invited but not yet accepted, suspended = blocked */
  invitationStatus: InvitationStatus;
  /** When invitation was sent (for pending agents) */
  invitedAt?: string;
  status: AgentStatus;
  avatar?: string;
  active: boolean;
  lastActive: string;
  channels: string[];      // channels this agent can access
  departments: string[];   // departments this agent belongs to
  /** Max simultaneous open conversations this agent can handle. 0 = unlimited */
  maxConcurrent?: number;
  /** Agent's preferred timezone (e.g., 'Asia/Muscat') */
  timezone?: string;
  /** Working hours — used for routing + status display */
  workingHours?: WorkingHours;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  notes?: string;
  tags: string[];
  blocked: boolean;
  conversationCount: number;
  lastContact: string;
  createdAt: string;
  channels?: ChannelType[]; // which channels this contact uses
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  timestamp: string;
  read: boolean;
  delivered: boolean;
}

export interface Conversation {
  id: string;
  contactId: string;
  assignedTo: string | null;
  status: ConversationStatus;
  channelId: string;            // which channel this conv came in on
  departmentId: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
  notes: string[];
  activityLog: ActivityEvent[];
}

export interface ActivityEvent {
  id: string;
  type: 'assign' | 'status' | 'tag' | 'note';
  description: string;
  by: string;
  timestamp: string;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  usageCount: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  targetCount: number;
  sentCount: number;
  openRate: number;
  status: CampaignStatus;
  scheduledAt: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'message' | 'conversation' | 'campaign' | 'system';
}

export interface Integration {
  id: string;
  type: 'messenger' | 'instagram' | 'telegram' | 'x' | 'zapier' | 'slack' | 'webhook';
  name: string;
  description: string;
  connected: boolean;
  accountName?: string;
  lastSync?: string;
}

export interface AppSettings {
  // General
  siteName: string;
  siteUrl: string;
  // WhatsApp business config
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappVerifyToken: string;
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  // Notifications
  notifyNewConversation: boolean;
  notifyNewMessage: boolean;
  notifyCampaigns: boolean;
  notifyBrowser: boolean;
  notifySound: boolean;
  // Appearance
  theme: 'light' | 'dark';
  // Security
  twoFactorEnabled: boolean;
  // Language & region
  language: 'ar' | 'en';
  timezone: string;
  dateFormat: string;
}

export interface WidgetConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  welcomeMessage: string;
  teamName: string;
  responseTime: string;
  showAvatar: boolean;
  collectEmail: boolean;
  enabled: boolean;
  bubbleIcon: 'chat' | 'message' | 'help';
  showBusinessHours: boolean;
  allowAttachments: boolean;
  allowVoice: boolean;
  soundNotification: boolean;
}

// =====================================================================
// ADMIN (SaaS) layer types
// =====================================================================

export interface Country {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  currency: string;
  symbol: string;
  /** USD → local rate, for fast display only */
  usdRate: number;
}

export type PlanTier = 'starter' | 'pro' | 'business' | 'enterprise';

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  nameAr: string;
  tagline: string;
  /** features in Arabic */
  features: string[];
  limits: {
    agents: number; // -1 = unlimited
    channels: number;
    conversations: number;
    contacts: number;
  };
  /** keyed by country code; price in local currency (monthly) */
  pricesPerCountry: Record<string, { monthly: number; yearly: number }>;
  popular?: boolean;
  active: boolean;
  createdAt: string;
}

export type ClientStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';

export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  status: ClientStatus;
  planId: string | null;
  subscriptionId: string | null;
  trialEndsAt?: string;
  agentCount: number;
  channelCount: number;
  conversationCount: number;
  /** Monthly recurring revenue, in their local currency */
  mrr: number;
  currency: string;
  /** subdomain or full URL of their dashboard */
  dashboardUrl: string;
  logo?: string;
  joinedAt: string;
  lastActiveAt: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface Subscription {
  id: string;
  clientId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt?: string;
  paymentMethod?: {
    brand: 'visa' | 'mastercard';
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  subscriptionId?: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  notes?: string;
  createdAt: string;
}

export type TransactionStatus = 'succeeded' | 'failed' | 'pending' | 'refunded';

export interface Transaction {
  id: string;
  invoiceId?: string;
  clientId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  method: 'visa' | 'mastercard';
  last4: string;
  paymobOrderId: string;
  paymobTransactionId: string;
  failureReason?: string;
  createdAt: string;
}

export interface PaymobConfig {
  enabled: boolean;
  testMode: boolean;
  apiKey: string;
  publicKey: string;
  hmacSecret: string;
  iframeId: string;
  integrationCardId: string;
  webhookUrl: string;
  /** Per-country integration IDs (Paymob differs per region) */
  integrationsByCountry: Record<string, string>;
}

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'finance';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastActive: string;
  createdAt: string;
}
