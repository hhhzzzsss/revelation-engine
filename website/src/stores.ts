import { create } from 'zustand';
import { VIEW_STATES, type ViewState } from './components/views/util';
import type { Item, QuantifiedItem, Recipe } from './item/types';

export interface NavState {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}
export const useNavStore = create<NavState>((set) => ({
  currentView: VIEW_STATES.apotheosis,
  setView: (view) => set({ currentView: view }),
}));

export interface InfoPanelState {
  isOpen: boolean;
  item: Item | null;
  viewItem: (item: Item) => void;
  close: () => void;
}
export const useInfoPanelStore = create<InfoPanelState>((set) => ({
  isOpen: false,
  item: null,
  viewItem: (item) => set({ isOpen: true, item: item }),
  close: () => set({ isOpen: false, item: null }),
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

export interface AvailableItemsState {
  items: Item[];
  setItems: (items: Item[]) => void;
}
export const useAvailableItemsStore = create<AvailableItemsState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));

export interface EnumerationState {
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
}
export const useEnumerationStore = create<EnumerationState>((set) => ({
  recipes: [],
  setRecipes: (recipes) => set({ recipes }),
}));


export interface DerivationState {
  targetItem?: Item;
  recipes: Recipe[];
  setTargetItem: (item?: Item) => void;
  setRecipes: (recipes: Recipe[]) => void;
}
export const useDerivationStore = create<DerivationState>((set) => ({
  targetItem: undefined,
  recipes: [],
  setTargetItem: (item) => set({ targetItem: item }),
  setRecipes: (recipes) => set({ recipes }),
}));


export interface HoverTooltipState {
  text: string | null;
  setText: (text: string | null) => void;
}
export const useTooltipStore = create<HoverTooltipState>((set) => ({
  text: null,
  setText: (text) => set({ text }),
}));
