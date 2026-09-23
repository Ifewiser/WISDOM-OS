import type { Task, DailyPlan, FocusSession, ActiveFocusSession } from '@/types';

const TASKS_KEY = 'wisdomos:tasks';
const PLANS_KEY = 'wisdomos:dailyPlans';
const SESSIONS_KEY = 'wisdomos:focusSessions';
const ACTIVE_SESSION_KEY = 'wisdomos:activeFocusSession';

export function loadTasks(): Task[] | null {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Task[];
  } catch {
    return null;
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

export function loadDailyPlans(): DailyPlan[] | null {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyPlan[];
  } catch {
    return null;
  }
}

export function saveDailyPlans(plans: DailyPlan[]): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch {
    // ignore
  }
}

export function loadFocusSessions(): FocusSession[] | null {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FocusSession[];
  } catch {
    return null;
  }
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

export function loadActiveFocusSession(): ActiveFocusSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveFocusSession;
  } catch {
    return null;
  }
}

export function saveActiveFocusSession(session: ActiveFocusSession | null): void {
  try {
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}
