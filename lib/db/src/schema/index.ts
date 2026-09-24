import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdBy: uuid("created_by").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "workspaces_name_not_blank",
      sql`length(btrim(${table.name})) > 0`,
    ),
  ],
).enableRLS();

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role").notNull().default("owner"),
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      name: "workspace_members_pkey",
      columns: [table.workspaceId, table.userId],
    }),
    check(
      "workspace_members_role_check",
      sql`${table.role} in ('owner', 'admin', 'member')`,
    ),
    index("workspace_members_user_workspace_idx").on(
      table.userId,
      table.workspaceId,
    ),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("ACTIVE"),
    systemKey: text("system_key"),
    legacyId: text("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("categories_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    uniqueIndex("categories_workspace_lower_name_idx").on(
      table.workspaceId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("categories_workspace_system_key_idx")
      .on(table.workspaceId, table.systemKey)
      .where(sql`${table.systemKey} is not null`),
    uniqueIndex("categories_workspace_legacy_id_idx")
      .on(table.workspaceId, table.legacyId)
      .where(sql`${table.legacyId} is not null`),
    uniqueIndex("categories_workspace_id_key").on(
      table.workspaceId,
      table.id,
    ),
    check(
      "categories_status_check",
      sql`${table.status} in ('ACTIVE', 'ARCHIVED')`,
    ),
    check(
      "categories_system_key_check",
      sql`${table.systemKey} is null or ${table.systemKey} in ('MONEY', 'BUILD', 'LEARN', 'ADMIN', 'LATER')`,
    ),
  ],
).enableRLS();

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("ACTIVE"),
    legacyId: text("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("projects_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    uniqueIndex("projects_workspace_lower_name_idx").on(
      table.workspaceId,
      sql`lower(${table.name})`,
    ),
    uniqueIndex("projects_workspace_legacy_id_idx")
      .on(table.workspaceId, table.legacyId)
      .where(sql`${table.legacyId} is not null`),
    uniqueIndex("projects_workspace_id_key").on(table.workspaceId, table.id),
    check(
      "projects_status_check",
      sql`${table.status} in ('ACTIVE', 'ARCHIVED')`,
    ),
  ],
).enableRLS();

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").notNull(),
    title: text("title").notNull(),
    categoryId: uuid("category_id"),
    projectId: uuid("project_id"),
    status: text("status").notNull().default("INBOX"),
    priority: text("priority").notNull().default("NONE"),
    nextAction: text("next_action").notNull().default(""),
    legacyId: text("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    foreignKey({
      name: "tasks_category_workspace_fk",
      columns: [table.workspaceId, table.categoryId],
      foreignColumns: [categories.workspaceId, categories.id],
    }),
    foreignKey({
      name: "tasks_project_workspace_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }),
    uniqueIndex("tasks_workspace_legacy_id_idx")
      .on(table.workspaceId, table.legacyId)
      .where(sql`${table.legacyId} is not null`),
    index("tasks_workspace_status_created_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt.desc(),
    ),
    index("tasks_workspace_project_status_idx").on(
      table.workspaceId,
      table.projectId,
      table.status,
    ),
    index("tasks_workspace_category_status_idx").on(
      table.workspaceId,
      table.categoryId,
      table.status,
    ),
    uniqueIndex("tasks_workspace_id_key").on(table.workspaceId, table.id),
    check(
      "tasks_status_check",
      sql`${table.status} in ('INBOX', 'ACTIVE', 'COMPLETED')`,
    ),
    check(
      "tasks_priority_check",
      sql`${table.priority} in ('BIG_ROCK', 'SUPPORT', 'ADMIN', 'NONE')`,
    ),
    check(
      "tasks_title_not_blank",
      sql`length(btrim(${table.title})) > 0`,
    ),
  ],
).enableRLS();

export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    planDate: date("plan_date", { mode: "string" }).notNull(),
    planningCompleted: boolean("planning_completed").notNull().default(false),
    legacyId: text("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("daily_plans_workspace_user_date_idx").on(
      table.workspaceId,
      table.userId,
      table.planDate,
    ),
    uniqueIndex("daily_plans_workspace_legacy_id_idx")
      .on(table.workspaceId, table.legacyId)
      .where(sql`${table.legacyId} is not null`),
    uniqueIndex("daily_plans_workspace_id_key").on(
      table.workspaceId,
      table.id,
    ),
  ],
).enableRLS();

export const dailyPlanItems = pgTable(
  "daily_plan_items",
  {
    workspaceId: uuid("workspace_id").notNull(),
    dailyPlanId: uuid("daily_plan_id").notNull(),
    taskId: uuid("task_id").notNull(),
    role: text("role").notNull(),
    position: smallint("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({
      name: "daily_plan_items_pkey",
      columns: [table.dailyPlanId, table.taskId],
    }),
    foreignKey({
      name: "daily_plan_items_plan_workspace_fk",
      columns: [table.workspaceId, table.dailyPlanId],
      foreignColumns: [dailyPlans.workspaceId, dailyPlans.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "daily_plan_items_task_workspace_fk",
      columns: [table.workspaceId, table.taskId],
      foreignColumns: [tasks.workspaceId, tasks.id],
    }),
    index("daily_plan_items_plan_role_position_idx").on(
      table.dailyPlanId,
      table.role,
      table.position,
    ),
    index("daily_plan_items_workspace_task_idx").on(
      table.workspaceId,
      table.taskId,
    ),
    check(
      "daily_plan_items_role_check",
      sql`${table.role} in ('BIG_ROCK', 'SUPPORT', 'ADMIN')`,
    ),
    check(
      "daily_plan_items_position_check",
      sql`${table.position} >= 0`,
    ),
  ],
).enableRLS();

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endedAt: timestamp("ended_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: text("status").notNull(),
    pausedRemainingSeconds: integer("paused_remaining_seconds"),
    legacyId: text("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "focus_sessions_task_workspace_fk",
      columns: [table.workspaceId, table.taskId],
      foreignColumns: [tasks.workspaceId, tasks.id],
    }),
    uniqueIndex("focus_sessions_workspace_user_active_idx")
      .on(table.workspaceId, table.userId)
      .where(sql`${table.status} in ('RUNNING', 'PAUSED')`),
    uniqueIndex("focus_sessions_workspace_legacy_id_idx")
      .on(table.workspaceId, table.legacyId)
      .where(sql`${table.legacyId} is not null`),
    index("focus_sessions_workspace_user_started_idx").on(
      table.workspaceId,
      table.userId,
      table.startedAt.desc(),
    ),
    index("focus_sessions_workspace_task_started_idx").on(
      table.workspaceId,
      table.taskId,
      table.startedAt.desc(),
    ),
    check(
      "focus_sessions_status_check",
      sql`${table.status} in ('RUNNING', 'PAUSED', 'COMPLETED', 'ENDED')`,
    ),
    check(
      "focus_sessions_duration_check",
      sql`${table.durationSeconds} > 0`,
    ),
    check(
      "focus_sessions_paused_remaining_check",
      sql`${table.pausedRemainingSeconds} is null or ${table.pausedRemainingSeconds} >= 0`,
    ),
    check(
      "focus_sessions_ended_at_check",
      sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startedAt}`,
    ),
    check(
      "focus_sessions_terminal_ended_at_check",
      sql`(${table.status} in ('RUNNING', 'PAUSED') or ${table.endedAt} is not null)`,
    ),
  ],
).enableRLS();