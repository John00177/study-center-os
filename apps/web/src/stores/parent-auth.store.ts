import { create } from "zustand";
import type { ParentSessionDto } from "@crm/shared-types";

interface ParentAuthState {
  parent: ParentSessionDto | null;
  setParent: (parent: ParentSessionDto | null) => void;
  logout: () => void;
}

export const useParentAuthStore = create<ParentAuthState>((set) => ({
  parent: null,
  setParent: (parent) => set({ parent }),
  logout: () => set({ parent: null }),
}));
