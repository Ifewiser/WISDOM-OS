export type LegacyTaskCategory = 'MONEY' | 'BUILD' | 'LEARN' | 'ADMIN' | 'LATER';
export type CategorySystemKey = LegacyTaskCategory;

export type RecordStatus = 'ACTIVE' | 'ARCHIVED';

export interface Category {
  id: string;
  name: string;
  description?: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
  systemKey?: CategorySystemKey;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'INBOX' | 'ACTIVE' | 'COMPLETED';

export type TaskPriority = 'BIG_ROCK' | 'SUPPORT' | 'ADMIN' | 'NONE';

export interface Task {
  id: string;
  title: string;
  categoryId: string | null;
  /** Kept only so legacy localStorage records can be migrated safely. */
  category?: LegacyTaskCategory | null;
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
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
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

export const STARTER_CATEGORIES: Category[] = [
  { id: 'category-money', name: 'Money', systemKey: 'MONEY', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'category-build', name: 'Build', systemKey: 'BUILD', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'category-learn', name: 'Learn', systemKey: 'LEARN', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'category-admin', name: 'Admin', systemKey: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'category-later', name: 'Later', systemKey: 'LATER', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

export const LEGACY_CATEGORY_IDS: Record<LegacyTaskCategory, string> = {
  MONEY: 'category-money',
  BUILD: 'category-build',
  LEARN: 'category-learn',
  ADMIN: 'category-admin',
  LATER: 'category-later',
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
