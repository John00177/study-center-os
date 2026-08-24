const STORAGE_KEY = "offline-queue:attendance";

export interface QueuedAttendanceAction {
  id: string;
  groupId: string;
  date: string;
  records: { studentId: string; status: string; notes?: string }[];
  queuedAt: string;
}

function readQueue(): QueuedAttendanceAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAttendanceAction[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAttendanceAction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueAttendanceAction(action: Omit<QueuedAttendanceAction, "id" | "queuedAt">) {
  const queue = readQueue();
  queue.push({ ...action, id: crypto.randomUUID(), queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

export function getQueuedAttendanceActions() {
  return readQueue();
}

export function removeQueuedAttendanceAction(id: string) {
  writeQueue(readQueue().filter((a) => a.id !== id));
}

export function getQueueLength() {
  return readQueue().length;
}
