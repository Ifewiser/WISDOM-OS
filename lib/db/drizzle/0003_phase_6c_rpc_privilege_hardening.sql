REVOKE ALL PRIVILEGES ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.is_workspace_member(uuid) FROM anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.bootstrap_user_workspace(text, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.bootstrap_user_workspace(text, text) FROM anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bootstrap_user_workspace(text, text) TO authenticated;