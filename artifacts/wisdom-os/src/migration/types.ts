export const MIGRATION_SCHEMA_VERSION = 1;

export type MigrationStatus =
  | 'NOT_STARTED'
  | 'VALIDATING'
  | 'READY'
  | 'MIGRATING'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED';

export type MigrationStage =
  | 'SNAPSHOT'
  | 'VALIDATION'
  | 'WORKSPACE'
  | 'CATEGORIES'
  | 'PROJECTS'
  | 'TASKS'
  | 'DAILY_PLANS'
  | 'DAILY_PLAN_ITEMS'
  | 'FOCUS_SESSIONS'
  | 'VERIFICATION'
  | 'COMPLETE';

export type DiagnosticSeverity = 'INFO' | 'WARNING' | 'ERROR';

export type MigrationEntityType =
  | 'WORKSPACE'
  | 'CATEGORY'
  | 'PROJECT'
  | 'TASK'
  | 'DAILY_PLAN'
  | 'DAILY_PLAN_ITEM'
  | 'FOCUS_SESSION'
  | 'ACTIVE_FOCUS_SESSION'
  | 'SNAPSHOT';

export interface MigrationDiagnostic {
  entityType: MigrationEntityType;
  localId?: string;
  sourceKey?: string;
  stage: MigrationStage;
  severity: DiagnosticSeverity;
  message: string;
  retryable: boolean;
  quarantined: boolean;
}

export interface RawLocalStorageValue {
  key: string;
  raw: string | null;
  parsed: unknown;
  parseError?: string;
}

export interface LocalStorageSnapshot {
  schemaVersion: number;
  localWorkspaceId: string;
  cloudWorkspaceId: string;
  authenticatedUserId: string;
  workspaceTimezone: string;
  capturedAt: string;
  values: Record<string, RawLocalStorageValue>;
}

export type StageResultStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export interface MigrationStageResult {
  status: StageResultStatus;
  startedAt?: string;
  completedAt?: string;
  processed: number;
  migrated: number;
  skipped: number;
  diagnostics: number;
}

export interface MigrationValidationSummary {
  valid: boolean;
  totalDiagnostics: number;
  errors: number;
  warnings: number;
  infos: number;
  quarantined: number;
  collectionCounts: Record<string, number>;
}

export interface MigrationState {
  schemaVersion: number;
  localWorkspaceId: string;
  cloudWorkspaceId: string;
  userId: string;
  status: MigrationStatus;
  currentStage: MigrationStage;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  validationSummary?: MigrationValidationSummary;
  stageResults: Partial<Record<MigrationStage, MigrationStageResult>>;
}

export interface MigrationContext {
  cloudWorkspaceId: string;
}

export interface MigrationVerification {
  valid: boolean;
  expected: Record<string, number>;
  found: Record<string, number>;
  relationshipErrors: number;
}

export interface MigrationRunResult {
  state: MigrationState;
  snapshot: LocalStorageSnapshot;
  diagnostics: MigrationDiagnostic[];
  verification?: MigrationVerification;
}