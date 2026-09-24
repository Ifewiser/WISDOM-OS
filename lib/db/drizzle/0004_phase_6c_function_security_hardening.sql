ALTER FUNCTION public.set_updated_at()
SET search_path = public, pg_temp;--> statement-breakpoint
ALTER FUNCTION public.prevent_created_by_change()
SET search_path = public, pg_temp;--> statement-breakpoint
ALTER FUNCTION public.prevent_system_key_change()
SET search_path = public, pg_temp;--> statement-breakpoint
ALTER FUNCTION public.rls_auto_enable()
SET search_path = public, pg_temp;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.rls_auto_enable() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.rls_auto_enable() FROM anon;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON FUNCTION public.rls_auto_enable() FROM authenticated;