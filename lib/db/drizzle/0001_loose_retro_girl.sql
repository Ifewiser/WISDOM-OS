DROP INDEX "focus_sessions_workspace_user_started_idx";--> statement-breakpoint
DROP INDEX "focus_sessions_workspace_task_started_idx";--> statement-breakpoint
DROP INDEX "tasks_workspace_status_created_idx";--> statement-breakpoint
CREATE INDEX "focus_sessions_workspace_user_started_idx" ON "focus_sessions" USING btree ("workspace_id","user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "focus_sessions_workspace_task_started_idx" ON "focus_sessions" USING btree ("workspace_id","task_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tasks_workspace_status_created_idx" ON "tasks" USING btree ("workspace_id","status","created_at" DESC NULLS LAST);