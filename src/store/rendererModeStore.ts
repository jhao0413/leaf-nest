import { MOBILE_BREAKPOINT } from "@/utils/const";
import { create } from "zustand";

type rendererModeType = "single" | "double";

type rendererModeStore = {
  rendererMode: rendererModeType;
  setRendererMode: (mode: rendererModeType) => void;
};

export const useRendererModeStore = create<rendererModeStore>((set) => ({
  rendererMode: window?.innerWidth < MOBILE_BREAKPOINT ? "single" : "double",
  setRendererMode: (mode: rendererModeType) => set({ rendererMode: mode }),
}));
