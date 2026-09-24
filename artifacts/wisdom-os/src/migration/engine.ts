import type { SupabaseClient } from '@supabase/supabase-js';
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
import { supabase } from '@/lib/supabase';
import type {
  LocalStorageSnapshot,
  MigrationContext,
  MigrationDiagnostic,
  MigrationRunResult,
  MigrationStage,
  MigrationStageResult,
  MigrationState,
  MigrationValidationSummary,
  MigrationVerification,
  RawLocalStorageValue,
} from './types';
import { MIGRATION_SCHEMA_VERSION } from './types';

const WORKSPACE_ID_KEY = 'wisdomos:workspaceId';
const DEFAULT_WORKSPACE_ID = 'local-workspace';
const MIGRATION_STATE_PREFIX = 'wisdomos:migration';

const LEGACY_KEYS = {
  tasks: 'wisdomos:tasks',
  dailyPlans: 'wisdomos:dailyPlans',
  focusSessions: 'wisdomos:focusSessions',
  activeFocusSession: 'wisdomos:activeFocusSession',
} as const;

const COLLECTIONS = [
  'workspace',
  'categories',
  'projects',
  'tasks',
  'dailyPlans',
  'focusSessions',
  'activeFocusSession',
] as const;

type Collection = (typeof COLLECTIONS)[number];
type JsonRecord = Record<string, unknown>;
type DbRow = JsonRecord & { id: string };

interface ValidatedData {
  workspace: Workspace;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  dailyPlans: DailyPlan[];
  focusSessions: FocusSession[];
  activeFocusSession: ActiveFocusSession | null;
  diagnostics: MigrationDiagnostic[];
  summary: MigrationValidationSummary;
}

interface MigrationMaps {
  categories: Map<string, string>;
  projects: Map<string, string>;
  tasks: Map<string, string>;
  dailyPlans: Map<string, string>;
}

interface StageCounters {
  processed: number;
  migrated: number;
  skipped: number;
}

class MigrationStageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationStageError';
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function getLocalStorage(): Storage {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new MigrationStageError('Migration requires browser localStorage.');
  }
  return window.localStorage;
}

function scopedKey(localWorkspaceId: string, collection: Collection): string {
  return `wisdomos:workspace:${localWorkspaceId}:${collection}`;
}

function migrationStateKey(localWorkspaceId: string): string {
  return `${MIGRATION_STATE_PREFIX}:${localWorkspaceId}:v1`;
}

function parseRawValue(key: string, raw: string | null): RawLocalStorageValue {
  if (raw === null) return { key, raw, parsed: null };

  try {
    return { key, raw, parsed: JSON.parse(raw) as unknown };
  } catch {
    return {
      key,
      raw,
      parsed: null,
      parseError: 'Stored value is not valid JSON.',
    };
  }
}

function getBrowserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
      return timezone;
    }
  } catch {
    // Fall through to UTC.
  }
  return 'UTC';
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isLocalDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isStatus(value: unknown): value is 'ACTIVE' | 'ARCHIVED' {
  return value === 'ACTIVE' || value === 'ARCHIVED';
}

function isSystemKey(
  value: unknown,
): value is 'MONEY' | 'BUILD' | 'LEARN' | 'ADMIN' | 'LATER' {
  return (
    value === 'MONEY' ||
    value === 'BUILD' ||
    value === 'LEARN' ||
    value === 'ADMIN' ||
    value === 'LATER'
  );
}

function isTaskStatus(value: unknown): value is Task['status'] {
  return value === 'INBOX' || value === 'ACTIVE' || value === 'COMPLETED';
}

function isTaskPriority(value: unknown): value is Task['priority'] {
  return (
    value === 'BIG_ROCK' ||
    value === 'SUPPORT' ||
    value === 'ADMIN' ||
    value === 'NONE'
  );
}

function isFocusStatus(value: unknown): value is FocusSession['status'] {
  return value === 'COMPLETED' || value === 'ENDED';
}

function isTimerState(value: unknown): value is ActiveFocusSession['state'] {
  return (
    value === 'IDLE' ||
    value === 'RUNNING' ||
    value === 'PAUSED' ||
    value === 'COMPLETED' ||
    value === 'ENDED'
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function addDiagnostic(
  diagnostics: MigrationDiagnostic[],
  input: Omit<MigrationDiagnostic, 'retryable' | 'quarantined'> & {
    retryable?: boolean;
    quarantined?: boolean;
  },
): void {
  diagnostics.push({
    ...input,
    retryable: input.retryable ?? false,
    quarantined: input.quarantined ?? false,
  });
}

function readSnapshotValue(
  snapshot: LocalStorageSnapshot,
  key: string,
): RawLocalStorageValue {
  return (
    snapshot.values[key] ?? {
      key,
      raw: null,
      parsed: null,
    }
  );
}

function readPreferredArray<T>(
  snapshot: LocalStorageSnapshot,
  scopedCollection: Collection,
  legacyKey: string | undefined,
  diagnostics: MigrationDiagnostic[],
): T[] {
  const scoped = readSnapshotValue(
    snapshot,
    scopedKey(snapshot.localWorkspaceId, scopedCollection),
  );
  const legacy = legacyKey ? readSnapshotValue(snapshot, legacyKey) : null;
  const scopedHasValue = scoped.raw !== null;
  const legacyHasValue = legacy?.raw !== null;
  const scopedArray = Array.isArray(scoped.parsed);
  const legacyArray = Array.isArray(legacy?.parsed);

  if (scoped.parseError) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: scoped.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: scoped.parseError,
      quarantined: false,
    });
  } else if (scopedHasValue && !scopedArray) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: scoped.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: 'Expected a JSON array for this collection.',
      quarantined: false,
    });
  }

  if (legacy?.parseError) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: legacy.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: legacy.parseError,
      quarantined: false,
    });
  } else if (legacyHasValue && !legacyArray) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: legacy?.key ?? 'legacy collection',
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: 'Expected a JSON array for this legacy collection.',
      quarantined: false,
    });
  }

  if (scopedArray && legacyArray && stableJson(scoped.parsed) !== stableJson(legacy?.parsed)) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: `${scoped.key},${legacy?.key}`,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message:
        'Scoped and legacy collections both exist with materially different data.',
      quarantined: false,
    });
  }

  if (scopedArray) return scoped.parsed as T[];

  if (legacyArray) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: legacy?.key,
      stage: 'VALIDATION',
      severity: 'INFO',
      message: 'Using the supported legacy collection because the scoped collection is absent.',
    });
    return legacy?.parsed as T[];
  }

  return [];
}

function validateWorkspace(
  snapshot: LocalStorageSnapshot,
  diagnostics: MigrationDiagnostic[],
): Workspace {
  const entry = readSnapshotValue(
    snapshot,
    scopedKey(snapshot.localWorkspaceId, 'workspace'),
  );
  if (entry.parseError || !isRecord(entry.parsed)) {
    if (entry.raw !== null) {
      addDiagnostic(diagnostics, {
        entityType: 'WORKSPACE',
        sourceKey: entry.key,
        stage: 'VALIDATION',
        severity: 'WARNING',
        message: 'Workspace data was malformed; using a safe local default.',
      });
    }
    return {
      id: snapshot.localWorkspaceId,
      name: 'My Workspace',
      createdAt: snapshot.capturedAt,
      updatedAt: snapshot.capturedAt,
    };
  }

  const raw = entry.parsed;
  if (
    !isString(raw.id) ||
    !isString(raw.name) ||
    !raw.name.trim() ||
    !isValidDateString(raw.createdAt) ||
    !isValidDateString(raw.updatedAt)
  ) {
    addDiagnostic(diagnostics, {
      entityType: 'WORKSPACE',
      localId: snapshot.localWorkspaceId,
      sourceKey: entry.key,
      stage: 'VALIDATION',
      severity: 'WARNING',
      message: 'Workspace fields were incomplete; using a safe local default.',
    });
    return {
      id: snapshot.localWorkspaceId,
      name: 'My Workspace',
      createdAt: snapshot.capturedAt,
      updatedAt: snapshot.capturedAt,
    };
  }

  return {
    id: snapshot.localWorkspaceId,
    name: raw.name.trim(),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function validateCategories(
  rawCategories: unknown[],
  sourceKey: string,
  diagnostics: MigrationDiagnostic[],
): Category[] {
  const result: Category[] = [];
  const seen = new Set<string>();

  rawCategories.forEach((raw, index) => {
    const localId = isRecord(raw) && isString(raw.id) ? raw.id : undefined;
    if (
      !isRecord(raw) ||
      !isString(raw.id) ||
      !isString(raw.name) ||
      !raw.name.trim() ||
      !isStatus(raw.status) ||
      !isValidDateString(raw.createdAt) ||
      !isValidDateString(raw.updatedAt) ||
      (raw.description !== undefined && !isString(raw.description)) ||
      (raw.systemKey !== undefined && !isSystemKey(raw.systemKey))
    ) {
      addDiagnostic(diagnostics, {
        entityType: 'CATEGORY',
        localId,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: `Invalid category at array index ${index}.`,
        quarantined: true,
      });
      return;
    }

    if (seen.has(raw.id)) {
      addDiagnostic(diagnostics, {
        entityType: 'CATEGORY',
        localId: raw.id,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: 'Duplicate local category ID.',
        quarantined: true,
      });
      return;
    }

    seen.add(raw.id);
    result.push({
      id: raw.id,
      name: raw.name.trim(),
      description: raw.description,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      systemKey: raw.systemKey,
    });
  });

  return result;
}

function validateProjects(
  rawProjects: unknown[],
  sourceKey: string,
  diagnostics: MigrationDiagnostic[],
): Project[] {
  const result: Project[] = [];
  const seen = new Set<string>();

  rawProjects.forEach((raw, index) => {
    const localId = isRecord(raw) && isString(raw.id) ? raw.id : undefined;
    if (
      !isRecord(raw) ||
      !isString(raw.id) ||
      !isString(raw.name) ||
      !raw.name.trim() ||
      !isString(raw.description) ||
      !isStatus(raw.status) ||
      !isValidDateString(raw.createdAt) ||
      !isValidDateString(raw.updatedAt)
    ) {
      addDiagnostic(diagnostics, {
        entityType: 'PROJECT',
        localId,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: `Invalid project at array index ${index}.`,
        quarantined: true,
      });
      return;
    }

    if (seen.has(raw.id)) {
      addDiagnostic(diagnostics, {
        entityType: 'PROJECT',
        localId: raw.id,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: 'Duplicate local project ID.',
        quarantined: true,
      });
      return;
    }

    seen.add(raw.id);
    result.push({
      id: raw.id,
      name: raw.name.trim(),
      description: raw.description.trim(),
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  });

  return result;
}

function validateTasks(
  rawTasks: unknown[],
  sourceKey: string,
  diagnostics: MigrationDiagnostic[],
): Task[] {
  const result: Task[] = [];
  const seen = new Set<string>();

  rawTasks.forEach((raw, index) => {
    const localId = isRecord(raw) && isString(raw.id) ? raw.id : undefined;
    const legacyCategory =
      isRecord(raw) && isSystemKey(raw.category) ? raw.category : null;
    const categoryId =
      isRecord(raw) && isNullableString(raw.categoryId)
        ? raw.categoryId ?? (legacyCategory ? LEGACY_CATEGORY_IDS[legacyCategory] : null)
        : undefined;
    const projectId =
      isRecord(raw) && isNullableString(raw.projectId) ? raw.projectId ?? null : undefined;
    const nextAction =
      isRecord(raw) && (raw.nextAction === undefined || isString(raw.nextAction))
        ? raw.nextAction ?? ''
        : undefined;

    if (
      !isRecord(raw) ||
      !isString(raw.id) ||
      !isString(raw.title) ||
      !raw.title.trim() ||
      !isTaskStatus(raw.status) ||
      !isTaskPriority(raw.priority) ||
      nextAction === undefined ||
      categoryId === undefined ||
      projectId === undefined ||
      !isValidDateString(raw.createdAt) ||
      (raw.category !== undefined && raw.category !== null && !isSystemKey(raw.category))
    ) {
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: `Invalid task at array index ${index}.`,
        quarantined: true,
      });
      return;
    }

    if (seen.has(raw.id)) {
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId: raw.id,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: 'Duplicate local task ID.',
        quarantined: true,
      });
      return;
    }

    seen.add(raw.id);
    result.push({
      id: raw.id,
      title: raw.title.trim(),
      categoryId,
      category: legacyCategory,
      status: raw.status,
      priority: raw.priority,
      nextAction,
      projectId,
      createdAt: raw.createdAt,
    });
  });

  return result;
}

function validateDailyPlans(
  rawPlans: unknown[],
  sourceKey: string,
  diagnostics: MigrationDiagnostic[],
): DailyPlan[] {
  const result: DailyPlan[] = [];
  const seenDates = new Set<string>();

  rawPlans.forEach((raw, index) => {
    const localId = isRecord(raw) && isString(raw.date) ? raw.date : undefined;
    const validTaskList = (value: unknown): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === 'string');

    if (
      !isRecord(raw) ||
      !isLocalDate(raw.date) ||
      !(raw.bigRockTaskId === null || isString(raw.bigRockTaskId)) ||
      !validTaskList(raw.supportTaskIds) ||
      !validTaskList(raw.adminTaskIds) ||
      typeof raw.planningCompleted !== 'boolean' ||
      !isValidDateString(raw.createdAt) ||
      !isValidDateString(raw.updatedAt)
    ) {
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN',
        localId,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: `Invalid daily plan at array index ${index}.`,
        quarantined: true,
      });
      return;
    }

    if (seenDates.has(raw.date)) {
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN',
        localId: raw.date,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: 'Duplicate local daily-plan date.',
        quarantined: true,
      });
      return;
    }

    seenDates.add(raw.date);
    result.push({
      date: raw.date,
      bigRockTaskId: raw.bigRockTaskId,
      supportTaskIds: [...raw.supportTaskIds],
      adminTaskIds: [...raw.adminTaskIds],
      planningCompleted: raw.planningCompleted,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  });

  return result;
}

function validateFocusSessions(
  rawSessions: unknown[],
  sourceKey: string,
  diagnostics: MigrationDiagnostic[],
): FocusSession[] {
  const result: FocusSession[] = [];
  const seen = new Set<string>();

  rawSessions.forEach((raw, index) => {
    const localId = isRecord(raw) && isString(raw.id) ? raw.id : undefined;
    if (
      !isRecord(raw) ||
      !isString(raw.id) ||
      !isString(raw.taskId) ||
      typeof raw.duration !== 'number' ||
      !Number.isFinite(raw.duration) ||
      raw.duration <= 0 ||
      !isValidDateString(raw.startedAt) ||
      !isValidDateString(raw.endedAt) ||
      !isFocusStatus(raw.status) ||
      Date.parse(raw.endedAt) < Date.parse(raw.startedAt)
    ) {
      addDiagnostic(diagnostics, {
        entityType: 'FOCUS_SESSION',
        localId,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: `Invalid historical focus session at array index ${index}.`,
        quarantined: true,
      });
      return;
    }

    if (seen.has(raw.id)) {
      addDiagnostic(diagnostics, {
        entityType: 'FOCUS_SESSION',
        localId: raw.id,
        sourceKey,
        stage: 'VALIDATION',
        severity: 'ERROR',
        message: 'Duplicate local focus-session ID.',
        quarantined: true,
      });
      return;
    }

    seen.add(raw.id);
    result.push({
      id: raw.id,
      taskId: raw.taskId,
      duration: raw.duration,
      startedAt: raw.startedAt,
      endedAt: raw.endedAt,
      status: raw.status,
    });
  });

  return result;
}

function validateActiveFocusSession(
  snapshot: LocalStorageSnapshot,
  diagnostics: MigrationDiagnostic[],
): ActiveFocusSession | null {
  const scoped = readSnapshotValue(
    snapshot,
    scopedKey(snapshot.localWorkspaceId, 'activeFocusSession'),
  );
  const legacy = readSnapshotValue(snapshot, LEGACY_KEYS.activeFocusSession);
  if (
    scoped.raw !== null &&
    legacy.raw !== null &&
    stableJson(scoped.parsed) !== stableJson(legacy.parsed)
  ) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: `${scoped.key},${legacy.key}`,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message:
        'Scoped and legacy active focus state both exist with materially different data.',
      quarantined: false,
    });
  }
  const entry =
    isRecord(scoped.parsed) ? scoped : isRecord(legacy.parsed) ? legacy : null;

  if (scoped.parseError || legacy.parseError) {
    addDiagnostic(diagnostics, {
      entityType: 'ACTIVE_FOCUS_SESSION',
      sourceKey: scoped.parseError ? scoped.key : legacy.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: 'Active focus-session data was not valid JSON.',
      quarantined: true,
    });
    return null;
  }

  if (!entry) return null;

  const raw = entry.parsed;
  if (
    !isRecord(raw) ||
    !isString(raw.id) ||
    !isString(raw.taskId) ||
    !isString(raw.taskTitle) ||
    !isString(raw.nextAction) ||
    typeof raw.duration !== 'number' ||
    !Number.isFinite(raw.duration) ||
    raw.duration <= 0 ||
    typeof raw.startedAt !== 'number' ||
    !Number.isFinite(raw.startedAt) ||
    typeof raw.endTime !== 'number' ||
    !Number.isFinite(raw.endTime) ||
    !isTimerState(raw.state) ||
    !(raw.pausedRemaining === null ||
      (typeof raw.pausedRemaining === 'number' &&
        Number.isFinite(raw.pausedRemaining) &&
        raw.pausedRemaining >= 0))
  ) {
    addDiagnostic(diagnostics, {
      entityType: 'ACTIVE_FOCUS_SESSION',
      localId: isRecord(raw) && isString(raw.id) ? raw.id : undefined,
      sourceKey: entry.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: 'Active focus-session data is malformed and was quarantined.',
      quarantined: true,
    });
    return null;
  }

  addDiagnostic(diagnostics, {
    entityType: 'ACTIVE_FOCUS_SESSION',
    localId: raw.id,
    sourceKey: entry.key,
    stage: 'VALIDATION',
    severity: 'INFO',
    message:
      'Active focus state remains local-only and will not be inserted as historical cloud data.',
  });

  return {
    id: raw.id,
    taskId: raw.taskId,
    taskTitle: raw.taskTitle,
    nextAction: raw.nextAction,
    duration: raw.duration,
    startedAt: raw.startedAt,
    endTime: raw.endTime,
    state: raw.state,
    pausedRemaining: raw.pausedRemaining,
  };
}

function buildSummary(
  diagnostics: MigrationDiagnostic[],
  collectionCounts: Record<string, number>,
): MigrationValidationSummary {
  const errors = diagnostics.filter((item) => item.severity === 'ERROR').length;
  const warnings = diagnostics.filter((item) => item.severity === 'WARNING').length;
  const infos = diagnostics.filter((item) => item.severity === 'INFO').length;
  const quarantined = diagnostics.filter((item) => item.quarantined).length;
  const blockingErrors = diagnostics.filter(
    (item) => item.severity === 'ERROR' && !item.quarantined,
  ).length;

  return {
    valid: blockingErrors === 0,
    totalDiagnostics: diagnostics.length,
    errors,
    warnings,
    infos,
    quarantined,
    collectionCounts,
  };
}

export async function captureLocalStorageSnapshot(
  context: MigrationContext,
): Promise<LocalStorageSnapshot> {
  const client = requireSupabaseClient();
  const sessionResult = await client.auth.getSession();
  if (sessionResult.error || !sessionResult.data.session) {
    throw new MigrationStageError('An authenticated Supabase session is required.');
  }

  const userId = sessionResult.data.session.user.id;
  const storage = getLocalStorage();
  const selector = storage.getItem(WORKSPACE_ID_KEY);
  const localWorkspaceId = selector || DEFAULT_WORKSPACE_ID;
  const keys = [
    WORKSPACE_ID_KEY,
    ...COLLECTIONS.map((collection) => scopedKey(localWorkspaceId, collection)),
    LEGACY_KEYS.tasks,
    LEGACY_KEYS.dailyPlans,
    LEGACY_KEYS.focusSessions,
    LEGACY_KEYS.activeFocusSession,
  ];
  const values: Record<string, RawLocalStorageValue> = {};

  for (const key of keys) {
    values[key] = parseRawValue(key, storage.getItem(key));
  }

  return {
    schemaVersion: MIGRATION_SCHEMA_VERSION,
    localWorkspaceId,
    cloudWorkspaceId: context.cloudWorkspaceId,
    authenticatedUserId: userId,
    workspaceTimezone: getBrowserTimezone(),
    capturedAt: nowIso(),
    values,
  };
}

export function getMigrationState(
  localWorkspaceId: string,
): MigrationState | null {
  const storage = getLocalStorage();
  const raw = storage.getItem(migrationStateKey(localWorkspaceId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MigrationState;
    if (
      parsed.schemaVersion !== MIGRATION_SCHEMA_VERSION ||
      parsed.localWorkspaceId !== localWorkspaceId ||
      !parsed.cloudWorkspaceId ||
      !parsed.userId ||
      !parsed.status ||
      !parsed.currentStage ||
      !parsed.stageResults
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveMigrationState(state: MigrationState): void {
  getLocalStorage().setItem(
    migrationStateKey(state.localWorkspaceId),
    JSON.stringify(state),
  );
}

export function validateLocalSnapshot(
  snapshot: LocalStorageSnapshot,
): ValidatedData {
  const diagnostics: MigrationDiagnostic[] = [];
  const workspace = validateWorkspace(snapshot, diagnostics);
  const tasksRaw = readPreferredArray<unknown>(
    snapshot,
    'tasks',
    LEGACY_KEYS.tasks,
    diagnostics,
  );
  const dailyPlansRaw = readPreferredArray<unknown>(
    snapshot,
    'dailyPlans',
    LEGACY_KEYS.dailyPlans,
    diagnostics,
  );
  const focusSessionsRaw = readPreferredArray<unknown>(
    snapshot,
    'focusSessions',
    LEGACY_KEYS.focusSessions,
    diagnostics,
  );

  const categoriesEntry = readSnapshotValue(
    snapshot,
    scopedKey(snapshot.localWorkspaceId, 'categories'),
  );
  if (categoriesEntry.parseError) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: categoriesEntry.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: categoriesEntry.parseError,
      quarantined: false,
    });
  } else if (categoriesEntry.raw !== null && !Array.isArray(categoriesEntry.parsed)) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: categoriesEntry.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: 'Expected a JSON array for the scoped categories collection.',
      quarantined: false,
    });
  }
  const categoriesRaw = Array.isArray(categoriesEntry.parsed)
    ? categoriesEntry.parsed
    : STARTER_CATEGORIES.map((category) => ({ ...category }));
  if (!Array.isArray(categoriesEntry.parsed)) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: categoriesEntry.key,
      stage: 'VALIDATION',
      severity: 'INFO',
      message: 'No scoped categories were found; using the application starter categories.',
    });
  }

  const projectsEntry = readSnapshotValue(
    snapshot,
    scopedKey(snapshot.localWorkspaceId, 'projects'),
  );
  if (projectsEntry.parseError) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: projectsEntry.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: projectsEntry.parseError,
      quarantined: false,
    });
  } else if (projectsEntry.raw !== null && !Array.isArray(projectsEntry.parsed)) {
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      sourceKey: projectsEntry.key,
      stage: 'VALIDATION',
      severity: 'ERROR',
      message: 'Expected a JSON array for the scoped projects collection.',
      quarantined: false,
    });
  }
  let projectsRaw: unknown[] = Array.isArray(projectsEntry.parsed)
    ? projectsEntry.parsed
    : [];
  if (!Array.isArray(projectsEntry.parsed) && tasksRaw.length > 0) {
    const referencedIds = new Set(
      tasksRaw
        .filter(isRecord)
        .map((task) => task.projectId)
        .filter(isString),
    );
    projectsRaw = sampleProjects
      .filter((project) => referencedIds.has(project.id))
      .map((project) => ({ ...project }));
    if (projectsRaw.length > 0) {
      addDiagnostic(diagnostics, {
        entityType: 'SNAPSHOT',
        sourceKey: projectsEntry.key,
        stage: 'VALIDATION',
        severity: 'INFO',
        message:
          'No scoped projects were found; preserving legacy referenced sample projects.',
      });
    }
  }

  const categorySource = categoriesEntry.key;
  const projectSource = projectsEntry.key;
  const taskSource =
    readSnapshotValue(
      snapshot,
      scopedKey(snapshot.localWorkspaceId, 'tasks'),
    ).raw !== null
      ? scopedKey(snapshot.localWorkspaceId, 'tasks')
      : LEGACY_KEYS.tasks;
  const planSource =
    readSnapshotValue(
      snapshot,
      scopedKey(snapshot.localWorkspaceId, 'dailyPlans'),
    ).raw !== null
      ? scopedKey(snapshot.localWorkspaceId, 'dailyPlans')
      : LEGACY_KEYS.dailyPlans;
  const focusSource =
    readSnapshotValue(
      snapshot,
      scopedKey(snapshot.localWorkspaceId, 'focusSessions'),
    ).raw !== null
      ? scopedKey(snapshot.localWorkspaceId, 'focusSessions')
      : LEGACY_KEYS.focusSessions;

  const categories = validateCategories(categoriesRaw, categorySource, diagnostics);
  const projects = validateProjects(projectsRaw, projectSource, diagnostics);
  const tasks = validateTasks(tasksRaw, taskSource, diagnostics);
  const dailyPlans = validateDailyPlans(dailyPlansRaw, planSource, diagnostics);
  const focusSessions = validateFocusSessions(
    focusSessionsRaw,
    focusSource,
    diagnostics,
  );
  const activeFocusSession = validateActiveFocusSession(snapshot, diagnostics);

  return {
    workspace,
    categories,
    projects,
    tasks,
    dailyPlans,
    focusSessions,
    activeFocusSession,
    diagnostics,
    summary: buildSummary(diagnostics, {
      categories: categories.length,
      projects: projects.length,
      tasks: tasks.length,
      dailyPlans: dailyPlans.length,
      focusSessions: focusSessions.length,
      activeFocusSession: activeFocusSession ? 1 : 0,
    }),
  };
}

function requireSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new MigrationStageError('Supabase is not configured for this app.');
  }
  return supabase;
}

async function readRows(
  client: SupabaseClient,
  table: string,
  workspaceId: string,
): Promise<DbRow[]> {
  const { data, error } = await client
    .from(table)
    .select('*')
    .eq('workspace_id', workspaceId);
  if (error) throw new MigrationStageError(error.message);
  return (data ?? []) as DbRow[];
}

async function writeRow(
  client: SupabaseClient,
  table: string,
  existingId: string | undefined,
  payload: JsonRecord,
): Promise<DbRow> {
  const query = existingId
    ? client.from(table).update(payload).eq('id', existingId).select('*').single()
    : client.from(table).insert(payload).select('*').single();
  const { data, error } = await query;
  if (error || !data) {
    throw new MigrationStageError(error?.message || `Could not write ${table}.`);
  }
  return data as DbRow;
}

function caseFold(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function ensureStageResult(
  state: MigrationState,
  stage: MigrationStage,
): MigrationStageResult {
  return (
    state.stageResults[stage] ?? {
      status: 'PENDING',
      processed: 0,
      migrated: 0,
      skipped: 0,
      diagnostics: 0,
    }
  );
}

function updateState(
  state: MigrationState,
  patch: Partial<MigrationState>,
): MigrationState {
  const next = {
    ...state,
    ...patch,
    updatedAt: nowIso(),
  };
  saveMigrationState(next);
  return next;
}

async function migrateWorkspace(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  data: ValidatedData,
  diagnostics: MigrationDiagnostic[],
): Promise<StageCounters> {
  const { data: rows, error } = await client
    .from('workspaces')
    .select('id,created_by,name,timezone')
    .eq('id', snapshot.cloudWorkspaceId)
    .limit(1);
  if (error || !rows?.[0]) {
    throw new MigrationStageError(
      error?.message || 'The authenticated cloud workspace could not be read.',
    );
  }

  const workspace = rows[0] as DbRow;
  if (workspace.created_by !== snapshot.authenticatedUserId) {
    addDiagnostic(diagnostics, {
      entityType: 'WORKSPACE',
      localId: snapshot.localWorkspaceId,
      stage: 'WORKSPACE',
      severity: 'ERROR',
      message: 'The bootstrapped workspace is not owned by the authenticated user.',
      quarantined: false,
    });
    throw new MigrationStageError('Cloud workspace ownership verification failed.');
  }

  const { error: updateError } = await client
    .from('workspaces')
    .update({
      name: data.workspace.name,
      timezone: snapshot.workspaceTimezone,
    })
    .eq('id', snapshot.cloudWorkspaceId);
  if (updateError) throw new MigrationStageError(updateError.message);

  return { processed: 1, migrated: 1, skipped: 0 };
}

async function migrateCategories(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  categories: Category[],
  diagnostics: MigrationDiagnostic[],
  maps: MigrationMaps,
): Promise<StageCounters> {
  const rows = await readRows(client, 'categories', snapshot.cloudWorkspaceId);
  const byLegacy = new Map(rows.map((row) => [row.legacy_id as string, row]));
  const bySystem = new Map(
    rows
      .filter((row) => isString(row.system_key))
      .map((row) => [row.system_key as string, row]),
  );
  const byName = new Map(rows.map((row) => [caseFold(String(row.name)), row]));
  const counters: StageCounters = { processed: categories.length, migrated: 0, skipped: 0 };

  for (const category of categories) {
    const existing =
      (category.systemKey ? bySystem.get(category.systemKey) : undefined) ??
      byLegacy.get(category.id);
    const nameConflict = byName.get(caseFold(category.name));

    if (nameConflict && (!existing || nameConflict.id !== existing.id)) {
      addDiagnostic(diagnostics, {
        entityType: 'CATEGORY',
        localId: category.id,
        stage: 'CATEGORIES',
        severity: 'ERROR',
        message: 'Cloud category name conflicts with a different category.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const row = await writeRow(client, 'categories', existing?.id, {
      workspace_id: snapshot.cloudWorkspaceId,
      name: category.name,
      description: category.description ?? null,
      status: category.status,
      system_key: category.systemKey ?? null,
      legacy_id: category.id,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    });
    maps.categories.set(category.id, row.id);
    byLegacy.set(category.id, row);
    if (category.systemKey) bySystem.set(category.systemKey, row);
    byName.set(caseFold(category.name), row);
    counters.migrated += 1;
  }

  return counters;
}

async function migrateProjects(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  projects: Project[],
  diagnostics: MigrationDiagnostic[],
  maps: MigrationMaps,
): Promise<StageCounters> {
  const rows = await readRows(client, 'projects', snapshot.cloudWorkspaceId);
  const byLegacy = new Map(rows.map((row) => [row.legacy_id as string, row]));
  const byName = new Map(rows.map((row) => [caseFold(String(row.name)), row]));
  const counters: StageCounters = { processed: projects.length, migrated: 0, skipped: 0 };

  for (const project of projects) {
    const existing = byLegacy.get(project.id);
    const nameConflict = byName.get(caseFold(project.name));
    if (nameConflict && (!existing || nameConflict.id !== existing.id)) {
      addDiagnostic(diagnostics, {
        entityType: 'PROJECT',
        localId: project.id,
        stage: 'PROJECTS',
        severity: 'ERROR',
        message: 'Cloud project name conflicts with a different project.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const row = await writeRow(client, 'projects', existing?.id, {
      workspace_id: snapshot.cloudWorkspaceId,
      name: project.name,
      description: project.description,
      status: project.status,
      legacy_id: project.id,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    });
    maps.projects.set(project.id, row.id);
    byLegacy.set(project.id, row);
    byName.set(caseFold(project.name), row);
    counters.migrated += 1;
  }

  return counters;
}

async function migrateTasks(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  tasks: Task[],
  diagnostics: MigrationDiagnostic[],
  maps: MigrationMaps,
): Promise<StageCounters> {
  const rows = await readRows(client, 'tasks', snapshot.cloudWorkspaceId);
  const byLegacy = new Map(rows.map((row) => [row.legacy_id as string, row]));
  const counters: StageCounters = { processed: tasks.length, migrated: 0, skipped: 0 };

  for (const task of tasks) {
    const categoryId =
      task.categoryId === null ? null : maps.categories.get(task.categoryId);
    const projectId =
      task.projectId === null ? null : maps.projects.get(task.projectId);
    if (task.categoryId !== null && !categoryId) {
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId: task.id,
        stage: 'TASKS',
        severity: 'ERROR',
        message: 'Task category could not be resolved to a migrated cloud category.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }
    if (task.projectId !== null && !projectId) {
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId: task.id,
        stage: 'TASKS',
        severity: 'ERROR',
        message: 'Task project could not be resolved to a migrated cloud project.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const existing = byLegacy.get(task.id);
    if (existing && existing.created_by !== snapshot.authenticatedUserId) {
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId: task.id,
        stage: 'TASKS',
        severity: 'ERROR',
        message: 'Existing cloud task is owned by a different authenticated user.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const row = await writeRow(client, 'tasks', existing?.id, {
      workspace_id: snapshot.cloudWorkspaceId,
      created_by: snapshot.authenticatedUserId,
      title: task.title,
      category_id: categoryId ?? null,
      project_id: projectId ?? null,
      status: task.status,
      priority: task.priority,
      next_action: task.nextAction,
      legacy_id: task.id,
      created_at: task.createdAt,
    });
    maps.tasks.set(task.id, row.id);
    byLegacy.set(task.id, row);
    counters.migrated += 1;
  }

  return counters;
}

async function migrateDailyPlans(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  plans: DailyPlan[],
  diagnostics: MigrationDiagnostic[],
  maps: MigrationMaps,
): Promise<StageCounters> {
  const rows = await readRows(client, 'daily_plans', snapshot.cloudWorkspaceId);
  const ownRows = rows.filter(
    (row) => row.user_id === snapshot.authenticatedUserId,
  );
  const byLegacy = new Map(ownRows.map((row) => [row.legacy_id as string, row]));
  const byDate = new Map(ownRows.map((row) => [String(row.plan_date), row]));
  const counters: StageCounters = { processed: plans.length, migrated: 0, skipped: 0 };

  for (const plan of plans) {
    const legacyId = `daily-plan:${plan.date}`;
    const byLegacyRow = byLegacy.get(legacyId);
    const byDateRow = byDate.get(plan.date);
    if (byLegacyRow && byDateRow && byLegacyRow.id !== byDateRow.id) {
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN',
        localId: plan.date,
        stage: 'DAILY_PLANS',
        severity: 'ERROR',
        message: 'Cloud daily-plan legacy identity and date identity conflict.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const existing = byLegacyRow ?? byDateRow;
    const row = await writeRow(client, 'daily_plans', existing?.id, {
      workspace_id: snapshot.cloudWorkspaceId,
      user_id: snapshot.authenticatedUserId,
      plan_date: plan.date,
      planning_completed: plan.planningCompleted,
      legacy_id: legacyId,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    });
    maps.dailyPlans.set(plan.date, row.id);
    byLegacy.set(legacyId, row);
    byDate.set(plan.date, row);
    counters.migrated += 1;
  }

  return counters;
}

interface PlannedItem {
  planDate: string;
  taskId: string;
  role: 'BIG_ROCK' | 'SUPPORT' | 'ADMIN';
  position: number;
}

function flattenPlanItems(
  plan: DailyPlan,
  diagnostics: MigrationDiagnostic[],
): PlannedItem[] {
  const items: PlannedItem[] = [];
  const seen = new Map<string, string>();
  const add = (
    taskId: string | null,
    role: PlannedItem['role'],
    position: number,
  ) => {
    if (!taskId) return;
    const previousRole = seen.get(taskId);
    if (previousRole) {
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN_ITEM',
        localId: taskId,
        stage: 'DAILY_PLAN_ITEMS',
        severity: 'ERROR',
        message: `Task appears more than once in plan ${plan.date} (${previousRole}, ${role}).`,
        quarantined: true,
      });
      return;
    }
    seen.set(taskId, role);
    items.push({ planDate: plan.date, taskId, role, position });
  };

  add(plan.bigRockTaskId, 'BIG_ROCK', 0);
  plan.supportTaskIds.forEach((taskId, index) => add(taskId, 'SUPPORT', index));
  plan.adminTaskIds.forEach((taskId, index) => add(taskId, 'ADMIN', index));
  return items;
}

async function migrateDailyPlanItems(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  plans: DailyPlan[],
  diagnostics: MigrationDiagnostic[],
  maps: MigrationMaps,
): Promise<StageCounters> {
  const rows = await readRows(
    client,
    'daily_plan_items',
    snapshot.cloudWorkspaceId,
  );
  const byKey = new Map(
    rows.map((row) => [`${row.daily_plan_id}:${row.task_id}`, row]),
  );
  const items = plans.flatMap((plan) => flattenPlanItems(plan, diagnostics));
  const counters: StageCounters = { processed: items.length, migrated: 0, skipped: 0 };

  for (const item of items) {
    const planId = maps.dailyPlans.get(item.planDate);
    const taskId = maps.tasks.get(item.taskId);
    if (!planId || !taskId) {
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN_ITEM',
        localId: item.taskId,
        stage: 'DAILY_PLAN_ITEMS',
        severity: 'ERROR',
        message: 'Daily-plan item references a plan or task that was not migrated.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const key = `${planId}:${taskId}`;
    const existing = byKey.get(key);
    const row = existing
      ? await client
          .from('daily_plan_items')
          .update({
            workspace_id: snapshot.cloudWorkspaceId,
            role: item.role,
            position: item.position,
          })
          .eq('daily_plan_id', planId)
          .eq('task_id', taskId)
          .select('*')
          .single()
      : await client
          .from('daily_plan_items')
          .insert({
            workspace_id: snapshot.cloudWorkspaceId,
            daily_plan_id: planId,
            task_id: taskId,
            role: item.role,
            position: item.position,
          })
          .select('*')
          .single();
    if (row.error || !row.data) {
      throw new MigrationStageError(
        row.error?.message || 'Could not migrate a daily-plan item.',
      );
    }
    byKey.set(key, row.data as DbRow);
    counters.migrated += 1;
  }

  return counters;
}

async function migrateFocusSessions(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  sessions: FocusSession[],
  diagnostics: MigrationDiagnostic[],
  maps: MigrationMaps,
): Promise<StageCounters> {
  const rows = await readRows(
    client,
    'focus_sessions',
    snapshot.cloudWorkspaceId,
  );
  const byLegacy = new Map(rows.map((row) => [row.legacy_id as string, row]));
  const counters: StageCounters = {
    processed: sessions.length,
    migrated: 0,
    skipped: 0,
  };

  for (const session of sessions) {
    const taskId = maps.tasks.get(session.taskId);
    if (!taskId) {
      addDiagnostic(diagnostics, {
        entityType: 'FOCUS_SESSION',
        localId: session.id,
        stage: 'FOCUS_SESSIONS',
        severity: 'ERROR',
        message: 'Focus session task could not be resolved.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const existing = byLegacy.get(session.id);
    if (existing && existing.user_id !== snapshot.authenticatedUserId) {
      addDiagnostic(diagnostics, {
        entityType: 'FOCUS_SESSION',
        localId: session.id,
        stage: 'FOCUS_SESSIONS',
        severity: 'ERROR',
        message: 'Existing cloud focus session is owned by a different user.',
        quarantined: true,
      });
      counters.skipped += 1;
      continue;
    }

    const row = await writeRow(client, 'focus_sessions', existing?.id, {
      workspace_id: snapshot.cloudWorkspaceId,
      user_id: snapshot.authenticatedUserId,
      task_id: taskId,
      duration_seconds: Math.round(session.duration),
      started_at: session.startedAt,
      ended_at: session.endedAt,
      status: session.status,
      paused_remaining_seconds: null,
      legacy_id: session.id,
    });
    byLegacy.set(session.id, row);
    counters.migrated += 1;
  }

  return counters;
}

async function verifyMigration(
  client: SupabaseClient,
  snapshot: LocalStorageSnapshot,
  data: ValidatedData,
  maps: MigrationMaps,
  diagnostics: MigrationDiagnostic[],
): Promise<MigrationVerification> {
  const expectedItems = data.dailyPlans.flatMap((plan) =>
    flattenPlanItems(plan, []).filter(
      (item) => maps.dailyPlans.has(item.planDate) && maps.tasks.has(item.taskId),
    ),
  );
  const expected = {
    categories: data.categories.length,
    projects: data.projects.length,
    tasks: data.tasks.filter((task) => maps.tasks.has(task.id)).length,
    dailyPlans: data.dailyPlans.filter((plan) => maps.dailyPlans.has(plan.date)).length,
    dailyPlanItems: expectedItems.length,
    focusSessions: data.focusSessions.filter((session) =>
      maps.tasks.has(session.taskId),
    ).length,
  };

  const [categories, projects, tasks, plans, items, sessions] = await Promise.all([
    readRows(client, 'categories', snapshot.cloudWorkspaceId),
    readRows(client, 'projects', snapshot.cloudWorkspaceId),
    readRows(client, 'tasks', snapshot.cloudWorkspaceId),
    readRows(client, 'daily_plans', snapshot.cloudWorkspaceId),
    readRows(client, 'daily_plan_items', snapshot.cloudWorkspaceId),
    readRows(client, 'focus_sessions', snapshot.cloudWorkspaceId),
  ]);
  const found = {
    categories: data.categories.filter((item) =>
      categories.some((row) => row.id === maps.categories.get(item.id)),
    ).length,
    projects: data.projects.filter((item) =>
      projects.some((row) => row.id === maps.projects.get(item.id)),
    ).length,
    tasks: data.tasks.filter((item) =>
      tasks.some((row) => row.id === maps.tasks.get(item.id)),
    ).length,
    dailyPlans: data.dailyPlans.filter((item) =>
      plans.some((row) => row.id === maps.dailyPlans.get(item.date)),
    ).length,
    dailyPlanItems: 0,
    focusSessions: data.focusSessions.filter((item) =>
      sessions.some((row) => row.legacy_id === item.id),
    ).length,
  };

  let relationshipErrors = 0;
  for (const item of expectedItems) {
    const cloudPlanId = maps.dailyPlans.get(item.planDate);
    const cloudTaskId = maps.tasks.get(item.taskId);
    const cloudItem = items.find(
      (row) =>
        row.daily_plan_id === cloudPlanId && row.task_id === cloudTaskId,
    );
    if (
      !cloudItem ||
      cloudItem.role !== item.role ||
      Number(cloudItem.position) !== item.position
    ) {
      relationshipErrors += 1;
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN_ITEM',
        localId: item.taskId,
        stage: 'VERIFICATION',
        severity: 'ERROR',
        message: 'Cloud daily-plan role or position did not match the local mapping.',
        quarantined: false,
      });
    } else {
      found.dailyPlanItems += 1;
    }
  }

  for (const plan of data.dailyPlans) {
    const cloudPlan = plans.find((row) => row.id === maps.dailyPlans.get(plan.date));
    if (
      !cloudPlan ||
      cloudPlan.user_id !== snapshot.authenticatedUserId ||
      cloudPlan.plan_date !== plan.date ||
      cloudPlan.planning_completed !== plan.planningCompleted
    ) {
      relationshipErrors += 1;
      addDiagnostic(diagnostics, {
        entityType: 'DAILY_PLAN',
        localId: plan.date,
        stage: 'VERIFICATION',
        severity: 'ERROR',
        message: 'Cloud daily-plan identity or completion state did not match the local plan.',
        quarantined: false,
      });
    }
  }

  for (const task of data.tasks) {
    const cloudTask = tasks.find((row) => row.id === maps.tasks.get(task.id));
    if (!cloudTask) continue;
    if (
      task.categoryId !== null &&
      cloudTask.category_id !== maps.categories.get(task.categoryId)
    ) {
      relationshipErrors += 1;
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId: task.id,
        stage: 'VERIFICATION',
        severity: 'ERROR',
        message: 'Cloud task category relationship did not match the local mapping.',
        quarantined: false,
      });
    }
    if (
      task.projectId !== null &&
      cloudTask.project_id !== maps.projects.get(task.projectId)
    ) {
      relationshipErrors += 1;
      addDiagnostic(diagnostics, {
        entityType: 'TASK',
        localId: task.id,
        stage: 'VERIFICATION',
        severity: 'ERROR',
        message: 'Cloud task project relationship did not match the local mapping.',
        quarantined: false,
      });
    }
  }

  for (const session of data.focusSessions) {
    const cloudSession = sessions.find((row) => row.legacy_id === session.id);
    const cloudTaskId = maps.tasks.get(session.taskId);
    if (
      !cloudSession ||
      cloudSession.user_id !== snapshot.authenticatedUserId ||
      cloudSession.task_id !== cloudTaskId ||
      cloudSession.status !== session.status ||
      Number(cloudSession.duration_seconds) !== Math.round(session.duration)
    ) {
      relationshipErrors += 1;
      addDiagnostic(diagnostics, {
        entityType: 'FOCUS_SESSION',
        localId: session.id,
        stage: 'VERIFICATION',
        severity: 'ERROR',
        message: 'Cloud focus-session ownership, task, status, or duration did not match.',
        quarantined: false,
      });
    }
  }

  const valid =
    relationshipErrors === 0 &&
    Object.keys(expected).every(
      (key) => expected[key as keyof typeof expected] === found[key as keyof typeof found],
    );
  return { valid, expected, found, relationshipErrors };
}

export async function runLocalCloudMigration(
  context: MigrationContext,
): Promise<MigrationRunResult> {
  const client = requireSupabaseClient();
  const snapshot = await captureLocalStorageSnapshot(context);
  const existingState = getMigrationState(snapshot.localWorkspaceId);

  if (
    existingState &&
    (existingState.userId !== snapshot.authenticatedUserId ||
      existingState.cloudWorkspaceId !== snapshot.cloudWorkspaceId)
  ) {
    throw new MigrationStageError(
      'The local workspace is already associated with a different authenticated cloud workspace.',
    );
  }

  let state: MigrationState = existingState ?? {
    schemaVersion: MIGRATION_SCHEMA_VERSION,
    localWorkspaceId: snapshot.localWorkspaceId,
    cloudWorkspaceId: snapshot.cloudWorkspaceId,
    userId: snapshot.authenticatedUserId,
    status: 'NOT_STARTED',
    currentStage: 'SNAPSHOT',
    startedAt: nowIso(),
    updatedAt: nowIso(),
    stageResults: {},
  };

  state = updateState(state, {
    status: 'VALIDATING',
    currentStage: 'SNAPSHOT',
  });
  const data = validateLocalSnapshot(snapshot);
  const diagnostics = [...data.diagnostics];
  state = updateState(state, {
    status: data.summary.valid ? 'READY' : 'FAILED',
    currentStage: 'VALIDATION',
    validationSummary: data.summary,
    stageResults: {
      ...state.stageResults,
      SNAPSHOT: {
        status: 'SUCCESS',
        startedAt: snapshot.capturedAt,
        completedAt: nowIso(),
        processed: Object.keys(snapshot.values).length,
        migrated: 0,
        skipped: 0,
        diagnostics: 0,
      },
      VALIDATION: {
        status: data.summary.valid ? 'SUCCESS' : 'FAILED',
        startedAt: snapshot.capturedAt,
        completedAt: nowIso(),
        processed: Object.values(data.summary.collectionCounts).reduce(
          (sum, count) => sum + count,
          0,
        ),
        migrated: 0,
        skipped: data.summary.quarantined,
        diagnostics: data.diagnostics.length,
      },
    },
  });

  if (!data.summary.valid) {
    return { state, snapshot, diagnostics };
  }

  const maps: MigrationMaps = {
    categories: new Map(),
    projects: new Map(),
    tasks: new Map(),
    dailyPlans: new Map(),
  };

  const stages: Array<{
    name: MigrationStage;
    status: MigrationState['status'];
    run: () => Promise<StageCounters>;
  }> = [
    {
      name: 'WORKSPACE',
      status: 'MIGRATING',
      run: () => migrateWorkspace(client, snapshot, data, diagnostics),
    },
    {
      name: 'CATEGORIES',
      status: 'MIGRATING',
      run: () => migrateCategories(client, snapshot, data.categories, diagnostics, maps),
    },
    {
      name: 'PROJECTS',
      status: 'MIGRATING',
      run: () => migrateProjects(client, snapshot, data.projects, diagnostics, maps),
    },
    {
      name: 'TASKS',
      status: 'MIGRATING',
      run: () => migrateTasks(client, snapshot, data.tasks, diagnostics, maps),
    },
    {
      name: 'DAILY_PLANS',
      status: 'MIGRATING',
      run: () => migrateDailyPlans(client, snapshot, data.dailyPlans, diagnostics, maps),
    },
    {
      name: 'DAILY_PLAN_ITEMS',
      status: 'MIGRATING',
      run: () =>
        migrateDailyPlanItems(
          client,
          snapshot,
          data.dailyPlans,
          diagnostics,
          maps,
        ),
    },
    {
      name: 'FOCUS_SESSIONS',
      status: 'MIGRATING',
      run: () =>
        migrateFocusSessions(
          client,
          snapshot,
          data.focusSessions,
          diagnostics,
          maps,
        ),
    },
  ];

  for (const stage of stages) {
    const startedAt = nowIso();
    state = updateState(state, {
      status: stage.status,
      currentStage: stage.name,
      stageResults: {
        ...state.stageResults,
        [stage.name]: {
          ...ensureStageResult(state, stage.name),
          status: 'PENDING',
          startedAt,
        },
      },
    });

    try {
      const counters = await stage.run();
      const stageDiagnostics = diagnostics.filter(
        (item) => item.stage === stage.name,
      ).length;
      state = updateState(state, {
        stageResults: {
          ...state.stageResults,
          [stage.name]: {
            status: 'SUCCESS',
            startedAt,
            completedAt: nowIso(),
            ...counters,
            diagnostics: stageDiagnostics,
          },
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Migration stage failed.';
      addDiagnostic(diagnostics, {
        entityType: 'SNAPSHOT',
        stage: stage.name,
        severity: 'ERROR',
        message,
        retryable: true,
        quarantined: false,
      });
      state = updateState(state, {
        status: 'FAILED',
        currentStage: stage.name,
        stageResults: {
          ...state.stageResults,
          [stage.name]: {
            status: 'FAILED',
            startedAt,
            completedAt: nowIso(),
            processed: 0,
            migrated: 0,
            skipped: 0,
            diagnostics: 1,
          },
        },
      });
      return { state, snapshot, diagnostics };
    }
  }

  state = updateState(state, {
    status: 'VERIFYING',
    currentStage: 'VERIFICATION',
  });
  try {
    const verification = await verifyMigration(
      client,
      snapshot,
      data,
      maps,
      diagnostics,
    );
    if (!verification.valid) {
      state = updateState(state, {
        status: 'FAILED',
        currentStage: 'VERIFICATION',
      });
      return { state, snapshot, diagnostics, verification };
    }

    state = updateState(state, {
      status: 'SUCCESS',
      currentStage: 'COMPLETE',
      completedAt: nowIso(),
      stageResults: {
        ...state.stageResults,
        VERIFICATION: {
          status: 'SUCCESS',
          startedAt: nowIso(),
          completedAt: nowIso(),
          processed: Object.values(verification.expected).reduce(
            (sum, count) => sum + count,
            0,
          ),
          migrated: Object.values(verification.found).reduce(
            (sum, count) => sum + count,
            0,
          ),
          skipped: 0,
          diagnostics: diagnostics.filter(
            (item) => item.stage === 'VERIFICATION',
          ).length,
        },
        COMPLETE: {
          status: 'SUCCESS',
          startedAt: nowIso(),
          completedAt: nowIso(),
          processed: 1,
          migrated: 1,
          skipped: 0,
          diagnostics: 0,
        },
      },
    });
    return { state, snapshot, diagnostics, verification };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Migration verification failed.';
    addDiagnostic(diagnostics, {
      entityType: 'SNAPSHOT',
      stage: 'VERIFICATION',
      severity: 'ERROR',
      message,
      retryable: true,
      quarantined: false,
    });
    state = updateState(state, {
      status: 'FAILED',
      currentStage: 'VERIFICATION',
    });
    return { state, snapshot, diagnostics };
  }
}