import { create } from 'zustand';

export type InboxView = 'mine' | 'unassigned' | 'closed' | 'all' | 'vip' | 'today' | 'starred';

interface InboxState {
  view: InboxView;
  selectedId: string | null;
  selectedChannelId: string | null;     // null = all channels
  selectedDepartmentId: string | null;  // null = all departments
  settingsTab: string;
  setView: (v: InboxView) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedDepartmentId: (id: string | null) => void;
  setSettingsTab: (t: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  view: 'all',
  selectedId: null,
  selectedChannelId: null,
  selectedDepartmentId: null,
  settingsTab: 'general',
  setView: (v) => set({ view: v }),
  setSelectedId: (id) => set({ selectedId: id }),
  setSelectedChannelId: (id) => set({ selectedChannelId: id, selectedDepartmentId: null }),
  setSelectedDepartmentId: (id) => set({ selectedDepartmentId: id, selectedChannelId: null }),
  setSettingsTab: (t) => set({ settingsTab: t }),
}));
