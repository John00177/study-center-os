import { create } from "zustand";
import type { StudentSessionDto } from "@crm/shared-types";

interface StudentAuthState {
  student: StudentSessionDto | null;
  setStudent: (student: StudentSessionDto | null) => void;
  logout: () => void;
}

export const useStudentAuthStore = create<StudentAuthState>((set) => ({
  student: null,
  setStudent: (student) => set({ student }),
  logout: () => set({ student: null }),
}));
