import type {
  ActiveFocusSession,
  Category,
  DailyPlan,
  FocusSession,
  Project,
  Task,
  Workspace,
} from '@/types';
import { LEGACY_CATEGORY_IDS, STARTER_CATEGORIES } from '@/types';
import { sampleProjects } from '@/mockData';

const WORKSPACE_ID_KEY = 'wisdomos:workspaceId';
const LEGACY_TASKS_KEY = 'wisdomos:tasks';
const LEGACY_PLANS_KEY = 'wisdomos:dailyPlans';
const LEGACY_SESSIONS_KEY = 'wisdomos:focusSessions';
const LEGACY_ACTIVE_SESSION_KEY = 'wisdomos:activeFocusSession';
const DEFAULT_WORKSPACE_ID = 'local-workspace';

type WorkspaceCollection =
  | 'tasks'
  | 'projects'
  | 'categories'
  | 'dailyPlans'
  | 'focusSessions'
  | 'activeFocusSession'
  | 'workspace';

function getKey(collection: WorkspaceCollection): string {
  return `wisdomos:workspace:${getWorkspaceId()}:${collection}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is best effort; the in-memory app remains usable.
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function getWorkspaceId(): string {
  try {
    const existing = localStorage.getItem(WORKSPACE_ID_KEY);
    if (existing) return existing;
    localStorage.setItem(WORKSPACE_ID_KEY, DEFAULT_WORKSPACE_ID);
  } catch {
    // Use a stable fallback if localStorage is unavailable.
  }
  return DEFAULT_WORKSPACE_ID;
}

export function loadWorkspace(): Workspace {
  return (
    readJson<Workspace>(getKey('workspace')) ?? {
      id: getWorkspaceId(),
      name: 'My Workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
}

export function saveWorkspace(workspace: Workspace): void {
  writeJson(getKey('workspace'), workspace);
}

function normalizeTask(raw: Task & { category?: Task['category'] }): Task {
  const legacyCategory = raw.category ?? null;
  return {
    ...raw,
    categoryId:
      raw.categoryId ??
      (legacyCategory ? LEGACY_CATEGORY_IDS[legacyCategory] : null),
    ...(legacyCategory ? { category: legacyCategory } : {}),
  };
}

function loadLegacyTasks(): Task[] | null {
  const legacy = readJson<Array<Task & { category?: Task['category'] }>>(
    LEGACY_TASKS_KEY,
  );
  return Array.isArray(legacy) ? legacy.map(normalizeTask) : null;
}

export function loadTasks(): Task[] | null {
  const scoped = readJson<Task[]>(getKey('tasks'));
  if (Array.isArray(scoped)) return scoped.map(normalizeTask);

  const legacy = loadLegacyTasks();
  if (legacy) {
    saveTasks(legacy);
    return legacy;
  }
  return null;
}

export function saveTasks(tasks: Task[]): void {
  writeJson(getKey('tasks'), tasks);
}

export function loadProjects(): Project[] | null {
  const scoped = readJson<Project[]>(getKey('projects'));
  if (Array.isArray(scoped)) return scoped;

  // Older versions only kept project definitions in mockData. Preserve only
  // projects still referenced by migrated legacy tasks.
  const legacyTasks = loadLegacyTasks();
  if (legacyTasks) {
    const referencedIds = new Set(
      legacyTasks.map((task) => task.projectId).filter(Boolean),
    );
    return sampleProjects
      .filter((project) => referencedIds.has(project.id))
      .map((project) => ({ ...project }));
  }
  return null;
}

export function saveProjects(projects: Project[]): void {
  writeJson(getKey('projects'), projects);
}

export function loadCategories(): Category[] | null {
  const scoped = readJson<Category[]>(getKey('categories'));
  return Array.isArray(scoped)
    ? scoped
    : STARTER_CATEGORIES.map((category) => ({ ...category }));
}

export function saveCategories(categories: Category[]): void {
  writeJson(getKey('categories'), categories);
}

export function loadDailyPlans(): DailyPlan[] | null {
  const scoped = readJson<DailyPlan[]>(getKey('dailyPlans'));
  if (Array.isArray(scoped)) return scoped;
  const legacy = readJson<DailyPlan[]>(LEGACY_PLANS_KEY);
  if (Array.isArray(legacy)) {
    saveDailyPlans(legacy);
    return legacy;
  }
  return null;
}

export function saveDailyPlans(plans: DailyPlan[]): void {
  writeJson(getKey('dailyPlans'), plans);
}

export function loadFocusSessions(): FocusSession[] | null {
  const scoped = readJson<FocusSession[]>(getKey('focusSessions'));
  if (Array.isArray(scoped)) return scoped;
  const legacy = readJson<FocusSession[]>(LEGACY_SESSIONS_KEY);
  if (Array.isArray(legacy)) {
    saveFocusSessions(legacy);
    return legacy;
  }
  return null;
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  writeJson(getKey('focusSessions'), sessions);
}

export function loadActiveFocusSession(): ActiveFocusSession | null {
  const scoped = readJson<ActiveFocusSession>(getKey('activeFocusSession'));
  if (scoped) return scoped;
  const legacy = readJson<ActiveFocusSession>(LEGACY_ACTIVE_SESSION_KEY);
  if (legacy) {
    saveActiveFocusSession(legacy);
    return legacy;
  }
  return null;
}

export function saveActiveFocusSession(session: ActiveFocusSession | null): void {
  if (session) writeJson(getKey('activeFocusSession'), session);
  else removeKey(getKey('activeFocusSession'));
}

export function resetWorkspaceData(): void {
  saveTasks([]);
  saveProjects([]);
  saveCategories(STARTER_CATEGORIES.map((category) => ({ ...category })));
  saveDailyPlans([]);
  saveFocusSessions([]);
  saveActiveFocusSession(null);
  saveWorkspace({
    id: getWorkspaceId(),
    name: 'My Workspace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}