export type TaskCategory = 'MONEY' | 'BUILD' | 'LEARN' | 'ADMIN' | 'LATER';

export type TaskStatus = 'INBOX' | 'ACTIVE' | 'COMPLETED';

export type TaskPriority = 'BIG_ROCK' | 'SUPPORT' | 'ADMIN' | 'NONE';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory | null;
  status: TaskStatus;
  priority: TaskPriority;
  nextAction: string;
  projectId: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface DailyPlan {
  date: string;
  bigRockTaskId: string | null;
  supportTaskIds: string[];
  adminTaskIds: string[];
  planningCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScreenId = 'today' | 'brain-dump' | 'projects' | 'review';

export type FocusSessionStatus = 'COMPLETED' | 'ENDED';

export interface FocusSession {
  id: string;
  taskId: string;
  duration: number;
  startedAt: string;
  endedAt: string;
  status: FocusSessionStatus;
}

export type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ENDED';

export interface ActiveFocusSession {
  id: string;
  taskId: string;
  taskTitle: string;
  nextAction: string;
  duration: number;
  startedAt: number;
  endTime: number;
  state: TimerState;
  pausedRemaining: number | null;
}

export type BrainDumpFilter = 'ALL' | 'INBOX' | 'ORGANIZED';

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  MONEY: 'Money',
  BUILD: 'Build',
  LEARN: 'Learn',
  ADMIN: 'Admin',
  LATER: 'Later',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  BIG_ROCK: 'Big Rock',
  SUPPORT: 'Support Task',
  ADMIN: 'Admin',
  NONE: 'None',
};

export function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
