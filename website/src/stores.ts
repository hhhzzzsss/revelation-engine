import { create } from 'zustand';
import { VIEW_STATES, type ViewState } from './components/views/util';
import type { QuantifiedItem } from './item/types';

export interface NavState {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const useNavStore = create<NavState>((set) => ({
  currentView: VIEW_STATES.apotheosis,
  setView: (view) => set({ currentView: view }),
}));

export interface ApotheosisState {
  qItems: (QuantifiedItem | null)[];
  setQItem: (index: number, qItem: QuantifiedItem | null) => void;
}

export const useApotheosisStore = create<ApotheosisState>((set) => ({
  qItems: Array<(QuantifiedItem | null)>(6).fill(null),
  setQItem: (index, qItem) => set((state) => {
    const newQItems = [...state.qItems];
    newQItems[index] = qItem;
    return { qItems: newQItems };
  }),
}));
