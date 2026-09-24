CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"system_key" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_status_check" CHECK ("categories"."status" in ('ACTIVE', 'ARCHIVED')),
	CONSTRAINT "categories_system_key_check" CHECK ("categories"."system_key" is null or "categories"."system_key" in ('MONEY', 'BUILD', 'LEARN', 'ADMIN', 'LATER'))
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_plan_items" (
	"workspace_id" uuid NOT NULL,
	"daily_plan_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"role" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_plan_items_pkey" PRIMARY KEY("daily_plan_id","task_id"),
	CONSTRAINT "daily_plan_items_role_check" CHECK ("daily_plan_items"."role" in ('BIG_ROCK', 'SUPPORT', 'ADMIN')),
	CONSTRAINT "daily_plan_items_position_check" CHECK ("daily_plan_items"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "daily_plan_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_date" date NOT NULL,
	"planning_completed" boolean DEFAULT false NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"duration_seconds" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"status" text NOT NULL,
	"paused_remaining_seconds" integer,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "focus_sessions_status_check" CHECK ("focus_sessions"."status" in ('RUNNING', 'PAUSED', 'COMPLETED', 'ENDED')),
	CONSTRAINT "focus_sessions_duration_check" CHECK ("focus_sessions"."duration_seconds" > 0),
	CONSTRAINT "focus_sessions_paused_remaining_check" CHECK ("focus_sessions"."paused_remaining_seconds" is null or "focus_sessions"."paused_remaining_seconds" >= 0),
	CONSTRAINT "focus_sessions_ended_at_check" CHECK ("focus_sessions"."ended_at" is null or "focus_sessions"."ended_at" >= "focus_sessions"."started_at"),
	CONSTRAINT "focus_sessions_terminal_ended_at_check" CHECK (("focus_sessions"."status" in ('RUNNING', 'PAUSED') or "focus_sessions"."ended_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_status_check" CHECK ("projects"."status" in ('ACTIVE', 'ARCHIVED'))
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid,
	"project_id" uuid,
	"status" text DEFAULT 'INBOX' NOT NULL,
	"priority" text DEFAULT 'NONE' NOT NULL,
	"next_action" text DEFAULT '' NOT NULL,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('INBOX', 'ACTIVE', 'COMPLETED')),
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" in ('BIG_ROCK', 'SUPPORT', 'ADMIN', 'NONE')),
	CONSTRAINT "tasks_title_not_blank" CHECK (length(btrim("tasks"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_pkey" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "workspace_members_role_check" CHECK ("workspace_members"."role" in ('owner', 'admin', 'member'))
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_name_not_blank" CHECK (length(btrim("workspaces"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "categories_workspace_status_idx" ON "categories" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_lower_name_idx" ON "categories" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_system_key_idx" ON "categories" USING btree ("workspace_id","system_key") WHERE "categories"."system_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_legacy_id_idx" ON "categories" USING btree ("workspace_id","legacy_id") WHERE "categories"."legacy_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_id_key" ON "categories" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "daily_plan_items_plan_role_position_idx" ON "daily_plan_items" USING btree ("daily_plan_id","role","position");--> statement-breakpoint
CREATE INDEX "daily_plan_items_workspace_task_idx" ON "daily_plan_items" USING btree ("workspace_id","task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_workspace_user_date_idx" ON "daily_plans" USING btree ("workspace_id","user_id","plan_date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_workspace_legacy_id_idx" ON "daily_plans" USING btree ("workspace_id","legacy_id") WHERE "daily_plans"."legacy_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_workspace_id_key" ON "daily_plans" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "focus_sessions_workspace_user_active_idx" ON "focus_sessions" USING btree ("workspace_id","user_id") WHERE "focus_sessions"."status" in ('RUNNING', 'PAUSED');--> statement-breakpoint
CREATE UNIQUE INDEX "focus_sessions_workspace_legacy_id_idx" ON "focus_sessions" USING btree ("workspace_id","legacy_id") WHERE "focus_sessions"."legacy_id" is not null;--> statement-breakpoint
CREATE INDEX "focus_sessions_workspace_user_started_idx" ON "focus_sessions" USING btree ("workspace_id","user_id","started_at");--> statement-breakpoint
CREATE INDEX "focus_sessions_workspace_task_started_idx" ON "focus_sessions" USING btree ("workspace_id","task_id","started_at");--> statement-breakpoint
CREATE INDEX "projects_workspace_status_idx" ON "projects" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_lower_name_idx" ON "projects" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_legacy_id_idx" ON "projects" USING btree ("workspace_id","legacy_id") WHERE "projects"."legacy_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_id_key" ON "projects" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_workspace_legacy_id_idx" ON "tasks" USING btree ("workspace_id","legacy_id") WHERE "tasks"."legacy_id" is not null;--> statement-breakpoint
CREATE INDEX "tasks_workspace_status_created_idx" ON "tasks" USING btree ("workspace_id","status","created_at");--> statement-breakpoint
CREATE INDEX "tasks_workspace_project_status_idx" ON "tasks" USING btree ("workspace_id","project_id","status");--> statement-breakpoint
CREATE INDEX "tasks_workspace_category_status_idx" ON "tasks" USING btree ("workspace_id","category_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_workspace_id_key" ON "tasks" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_workspace_idx" ON "workspace_members" USING btree ("user_id","workspace_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_items" ADD CONSTRAINT "daily_plan_items_plan_workspace_fk" FOREIGN KEY ("workspace_id","daily_plan_id") REFERENCES "public"."daily_plans"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_items" ADD CONSTRAINT "daily_plan_items_task_workspace_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."tasks"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_task_workspace_fk" FOREIGN KEY ("workspace_id","task_id") REFERENCES "public"."tasks"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_workspace_fk" FOREIGN KEY ("workspace_id","category_id") REFERENCES "public"."categories"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_workspace_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_auth_users_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_auth_users_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_auth_users_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_auth_users_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_auth_users_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON "profiles"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER workspaces_set_updated_at
BEFORE UPDATE ON "workspaces"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER workspace_members_set_updated_at
BEFORE UPDATE ON "workspace_members"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON "categories"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER projects_set_updated_at
BEFORE UPDATE ON "projects"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON "tasks"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER daily_plans_set_updated_at
BEFORE UPDATE ON "daily_plans"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER focus_sessions_set_updated_at
BEFORE UPDATE ON "focus_sessions"
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();