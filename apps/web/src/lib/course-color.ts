// Predefined palette (Tailwind-friendly hex values) — a course/branch name is
// hashed to a stable index so the same course always renders the same color.
const PALETTE = [
  { bg: "#EEF2FF", border: "#6366F1", text: "#3730A3" }, // indigo
  { bg: "#ECFDF5", border: "#10B981", text: "#065F46" }, // green
  { bg: "#FFF7ED", border: "#F97316", text: "#9A3412" }, // orange
  { bg: "#FDF2F8", border: "#EC4899", text: "#9D174D" }, // pink
  { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF" }, // blue
  { bg: "#FEFCE8", border: "#EAB308", text: "#854D0E" }, // yellow
  { bg: "#F5F3FF", border: "#8B5CF6", text: "#5B21B6" }, // violet
  { bg: "#FEF2F2", border: "#EF4444", text: "#991B1B" }, // red
  { bg: "#ECFEFF", border: "#06B6D4", text: "#155E75" }, // cyan
  { bg: "#F0FDF4", border: "#22C55E", text: "#166534" }, // emerald
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface CourseColor {
  bg: string;
  border: string;
  text: string;
}

export function getCourseColor(key: string): CourseColor {
  return PALETTE[hashString(key) % PALETTE.length];
}
