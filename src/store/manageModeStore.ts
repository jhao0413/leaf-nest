import { create } from "zustand";

type ManageModeState = {
  manageMode: boolean;
  setManageMode: (manageMode: boolean) => void;
};

export const useManageModeStore = create<ManageModeState>()((set) => ({
  manageMode: false,
  setManageMode: (manageMode) => set({ manageMode }),
}));

type SelectedBookIdsState = {
  selectedBookIds: string[];
  setSelectedBookIds: (ids: string[]) => void;
};

export const useSelectedBookIdsStore = create<SelectedBookIdsState>()((set) => ({
  selectedBookIds: [],
  setSelectedBookIds: (ids) => set({ selectedBookIds: ids }),
}));
