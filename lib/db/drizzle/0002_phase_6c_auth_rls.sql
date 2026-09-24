CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = (SELECT auth.uid())
  );
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.bootstrap_user_workspace(
  p_timezone text DEFAULT 'UTC',
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_timezone text;
  v_display_name text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to bootstrap a workspace';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_user_id::text, 0)
  );

  v_timezone := COALESCE(NULLIF(btrim(p_timezone), ''), 'UTC');
  v_display_name := NULLIF(btrim(p_display_name), '');

  INSERT INTO public.profiles (id, display_name, timezone)
  VALUES (v_user_id, v_display_name, v_timezone)
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        timezone = EXCLUDED.timezone,
        updated_at = now();

  SELECT wm.workspace_id
  INTO v_workspace_id
  FROM public.workspace_members AS wm
  WHERE wm.user_id = v_user_id
  ORDER BY wm.joined_at, wm.workspace_id
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, created_by, timezone)
    VALUES ('My Workspace', v_user_id, v_timezone)
    RETURNING id INTO v_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_user_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.categories (workspace_id, name, system_key)
  SELECT
    v_workspace_id,
    starter.name,
    starter.system_key
  FROM (
    VALUES
      ('Money', 'MONEY'),
      ('Build', 'BUILD'),
      ('Learn', 'LEARN'),
      ('Admin', 'ADMIN'),
      ('Later', 'LATER')
  ) AS starter(name, system_key)
  ON CONFLICT (workspace_id, system_key)
    WHERE system_key IS NOT NULL
    DO NOTHING;

  RETURN v_workspace_id;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.bootstrap_user_workspace(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.bootstrap_user_workspace(text, text) TO authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.prevent_created_by_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS workspaces_created_by_immutable ON public.workspaces;--> statement-breakpoint
CREATE TRIGGER workspaces_created_by_immutable
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.prevent_created_by_change();--> statement-breakpoint
DROP TRIGGER IF EXISTS tasks_created_by_immutable ON public.tasks;--> statement-breakpoint
CREATE TRIGGER tasks_created_by_immutable
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_created_by_change();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.prevent_system_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.system_key IS DISTINCT FROM OLD.system_key THEN
    RAISE EXCEPTION 'system_key cannot be changed after category creation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS categories_system_key_immutable ON public.categories;--> statement-breakpoint
CREATE TRIGGER categories_system_key_immutable
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_key_change();--> statement-breakpoint

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);--> statement-breakpoint
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);--> statement-breakpoint
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);--> statement-breakpoint

CREATE POLICY workspaces_select_member
ON public.workspaces
FOR SELECT
TO authenticated
USING (public.is_workspace_member(id));--> statement-breakpoint
CREATE POLICY workspaces_update_owner
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND public.is_workspace_member(id)
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND public.is_workspace_member(id)
);--> statement-breakpoint
CREATE POLICY workspaces_delete_owner
ON public.workspaces
FOR DELETE
TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND public.is_workspace_member(id)
);--> statement-breakpoint

CREATE POLICY workspace_members_select_member
ON public.workspace_members
FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));--> statement-breakpoint

CREATE POLICY categories_select_member
ON public.categories
FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));--> statement-breakpoint
CREATE POLICY categories_insert_member
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));--> statement-breakpoint
CREATE POLICY categories_update_member
ON public.categories
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));--> statement-breakpoint

CREATE POLICY projects_select_member
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));--> statement-breakpoint
CREATE POLICY projects_insert_member
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));--> statement-breakpoint
CREATE POLICY projects_update_member
ON public.projects
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));--> statement-breakpoint

CREATE POLICY tasks_select_member
ON public.tasks
FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id));--> statement-breakpoint
CREATE POLICY tasks_insert_member
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id)
  AND created_by = (SELECT auth.uid())
);--> statement-breakpoint
CREATE POLICY tasks_update_member
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));--> statement-breakpoint

CREATE POLICY daily_plans_select_own
ON public.daily_plans
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);--> statement-breakpoint
CREATE POLICY daily_plans_insert_own
ON public.daily_plans
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);--> statement-breakpoint
CREATE POLICY daily_plans_update_own
ON public.daily_plans
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);--> statement-breakpoint
CREATE POLICY daily_plans_delete_own
ON public.daily_plans
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);--> statement-breakpoint

CREATE POLICY daily_plan_items_select_own_plan
ON public.daily_plan_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans AS plan
    WHERE plan.id = daily_plan_items.daily_plan_id
      AND plan.workspace_id = daily_plan_items.workspace_id
      AND plan.user_id = (SELECT auth.uid())
      AND public.is_workspace_member(plan.workspace_id)
  )
);--> statement-breakpoint
CREATE POLICY daily_plan_items_insert_own_plan
ON public.daily_plan_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.daily_plans AS plan
    WHERE plan.id = daily_plan_items.daily_plan_id
      AND plan.workspace_id = daily_plan_items.workspace_id
      AND plan.user_id = (SELECT auth.uid())
      AND public.is_workspace_member(plan.workspace_id)
  )
);--> statement-breakpoint
CREATE POLICY daily_plan_items_update_own_plan
ON public.daily_plan_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans AS plan
    WHERE plan.id = daily_plan_items.daily_plan_id
      AND plan.workspace_id = daily_plan_items.workspace_id
      AND plan.user_id = (SELECT auth.uid())
      AND public.is_workspace_member(plan.workspace_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.daily_plans AS plan
    WHERE plan.id = daily_plan_items.daily_plan_id
      AND plan.workspace_id = daily_plan_items.workspace_id
      AND plan.user_id = (SELECT auth.uid())
      AND public.is_workspace_member(plan.workspace_id)
  )
);--> statement-breakpoint
CREATE POLICY daily_plan_items_delete_own_plan
ON public.daily_plan_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans AS plan
    WHERE plan.id = daily_plan_items.daily_plan_id
      AND plan.workspace_id = daily_plan_items.workspace_id
      AND plan.user_id = (SELECT auth.uid())
      AND public.is_workspace_member(plan.workspace_id)
  )
);--> statement-breakpoint

CREATE POLICY focus_sessions_select_own
ON public.focus_sessions
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);--> statement-breakpoint
CREATE POLICY focus_sessions_insert_own
ON public.focus_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);--> statement-breakpoint
CREATE POLICY focus_sessions_update_own
ON public.focus_sessions
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_workspace_member(workspace_id)
);