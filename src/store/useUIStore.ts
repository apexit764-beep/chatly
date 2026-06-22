import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  iconSidebarCollapsed: boolean;
  sectionSidebarCollapsed: boolean;
  conversationListCollapsed: boolean;
  detailsCollapsed: boolean;
  notificationsOpen: boolean;
  /** Inbox focus mode: hides the icon sidebar, section sidebar, and top header */
  inboxFocus: boolean;
  toast: { id: number; message: string; type: 'success' | 'error' | 'info' } | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleIconSidebar: () => void;
  toggleSectionSidebar: () => void;
  toggleConversationList: () => void;
  toggleDetails: () => void;
  toggleNotifications: () => void;
  setNotificationsOpen: (v: boolean) => void;
  toggleInboxFocus: () => void;
  setInboxFocus: (v: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  iconSidebarCollapsed: false,
  sectionSidebarCollapsed: false,
  conversationListCollapsed: false,
  detailsCollapsed: false,
  notificationsOpen: false,
  inboxFocus: false,
  toast: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleIconSidebar: () => set((s) => ({ iconSidebarCollapsed: !s.iconSidebarCollapsed })),
  toggleSectionSidebar: () => set((s) => ({ sectionSidebarCollapsed: !s.sectionSidebarCollapsed })),
  toggleConversationList: () => set((s) => ({ conversationListCollapsed: !s.conversationListCollapsed })),
  toggleDetails: () => set((s) => ({ detailsCollapsed: !s.detailsCollapsed })),
  toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
  setNotificationsOpen: (v) => set({ notificationsOpen: v }),
  toggleInboxFocus: () => set((s) => ({ inboxFocus: !s.inboxFocus })),
  setInboxFocus: (v) => set({ inboxFocus: v }),
  showToast: (message, type = 'success') => {
    const id = Date.now();
    set({ toast: { id, message, type } });
    setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : {}));
    }, 3000);
  },
  hideToast: () => set({ toast: null }),
}));
