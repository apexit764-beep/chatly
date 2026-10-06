import { create } from 'zustand';
import type { ConversationStatus } from '@/types';

export type InboxView = 'mine' | 'unassigned' | 'ai' | 'all' | 'vip' | 'today' | 'starred';

/**
 * The chips under «المسندة لي». Several can be on at once: the statuses widen
 * the list (new OR in progress…), «starred» narrows it (…AND starred).
 */
export type AssignedChip = 'new' | 'in_progress' | 'closed' | 'starred';

interface InboxState {
  view: InboxView;
  selectedId: string | null;
  selectedChannelId: string | null;
  selectedDepartmentId: string | null;
  selectedStatus: ConversationStatus | null;
  assignedChips: AssignedChip[];
  settingsTab: string;
  setView: (v: InboxView) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedDepartmentId: (id: string | null) => void;
  setSelectedStatus: (s: ConversationStatus | null) => void;
  toggleAssignedChip: (chip: AssignedChip) => void;
  setSettingsTab: (t: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  view: 'all',
  selectedId: null,
  selectedChannelId: null,
  selectedDepartmentId: null,
  selectedStatus: null,
  assignedChips: [],
  settingsTab: 'profile',
  setView: (v) => set({ view: v }),
  setSelectedId: (id) => set({ selectedId: id }),
  setSelectedChannelId: (id) => set({ selectedChannelId: id, selectedDepartmentId: null }),
  setSelectedDepartmentId: (id) => set({ selectedDepartmentId: id, selectedChannelId: null }),
  setSelectedStatus: (s) => set({ selectedStatus: s }),
  toggleAssignedChip: (chip) => set((st) => ({
    assignedChips: st.assignedChips.includes(chip)
      ? st.assignedChips.filter((c) => c !== chip)
      : [...st.assignedChips, chip],
  })),
  setSettingsTab: (t) => set({ settingsTab: t }),
}));
