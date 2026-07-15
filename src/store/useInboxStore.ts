import { create } from 'zustand';
import type { ConversationStatus } from '@/types';

export type InboxView = 'mine' | 'unassigned' | 'all' | 'vip' | 'today' | 'starred';

interface InboxState {
  view: InboxView;
  selectedId: string | null;
  selectedChannelId: string | null;
  selectedDepartmentId: string | null;
  selectedStatus: ConversationStatus | null;
  settingsTab: string;
  setView: (v: InboxView) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedDepartmentId: (id: string | null) => void;
  setSelectedStatus: (s: ConversationStatus | null) => void;
  setSettingsTab: (t: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  view: 'all',
  selectedId: null,
  selectedChannelId: null,
  selectedDepartmentId: null,
  selectedStatus: null,
  settingsTab: 'profile',
  setView: (v) => set({ view: v }),
  setSelectedId: (id) => set({ selectedId: id }),
  setSelectedChannelId: (id) => set({ selectedChannelId: id, selectedDepartmentId: null }),
  setSelectedDepartmentId: (id) => set({ selectedDepartmentId: id, selectedChannelId: null }),
  setSelectedStatus: (s) => set({ selectedStatus: s }),
  setSettingsTab: (t) => set({ settingsTab: t }),
}));
