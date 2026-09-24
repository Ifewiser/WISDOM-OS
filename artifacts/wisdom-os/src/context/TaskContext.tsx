import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  Category,
  Task,
  TaskPriority,
  DailyPlan,
  FocusSession,
  Project,
  Workspace,
} from '@/types';
import { getTodayDate, STARTER_CATEGORIES } from '@/types';
import {
  loadTasks,
  saveTasks,
  loadProjects,
  saveProjects,
  loadCategories,
  saveCategories,
  loadWorkspace,
  saveWorkspace,
  loadDailyPlans,
  saveDailyPlans,
  loadFocusSessions,
  saveFocusSessions,
  resetWorkspaceData,
} from '@/storage';

interface OrganizeData {
  categoryId: string | null;
  priority: TaskPriority;
  projectId: string | null;
  nextAction: string;
}

interface PlanData {
  bigRockTaskId: string | null;
  supportTaskIds: string[];
  adminTaskIds: string[];
}

interface TaskContextValue {
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  workspace: Workspace;
  dailyPlans: DailyPlan[];
  todayPlan: DailyPlan | null;
  focusSessions: FocusSession[];
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  organizeTask: (id: string, data: OrganizeData) => void;
  updateNextAction: (id: string, nextAction: string) => void;
  savePlan: (date: string, data: PlanData) => void;
  getDailyPlan: (date: string) => DailyPlan | null;
  addFocusSession: (session: FocusSession) => void;
  addProject: (name: string, description: string) => void;
  updateProject: (id: string, name: string, description: string) => void;
  archiveProject: (id: string) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  archiveCategory: (id: string) => void;
  updateWorkspaceName: (name: string) => void;
  resetWorkspace: () => void;
  todayFocusMinutes: number;
  todayFocusSessionCount: number;
}

const TaskContext = createContext<TaskContextValue | null>(null);

let idCounter = 1000;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function createEmptyPlan(date: string): DailyPlan {
  const now = new Date().toISOString();
  return {
    date,
    bigRockTaskId: null,
    supportTaskIds: [],
    adminTaskIds: [],
    planningCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks() ?? []);
  const [projects, setProjects] = useState<Project[]>(() => loadProjects() ?? []);
  const [categories, setCategories] = useState<Category[]>(
    () => loadCategories() ?? STARTER_CATEGORIES.map((category) => ({ ...category })),
  );
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace());
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(
    () => loadDailyPlans() ?? [],
  );
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(
    () => loadFocusSessions() ?? [],
  );

  useEffect(() => saveTasks(tasks), [tasks]);
  useEffect(() => saveProjects(projects), [projects]);
  useEffect(() => saveCategories(categories), [categories]);
  useEffect(() => saveWorkspace(workspace), [workspace]);
  useEffect(() => saveDailyPlans(dailyPlans), [dailyPlans]);
  useEffect(() => saveFocusSessions(focusSessions), [focusSessions]);

  const today = getTodayDate();
  const todayPlan = dailyPlans.find((p) => p.date === today) ?? null;

  const addTask = useCallback((title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const newTask: Task = {
      id: generateId('task'),
      title: trimmedTitle,
      categoryId: null,
      status: 'INBOX',
      priority: 'NONE',
      nextAction: '',
      projectId: null,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED',
            }
          : task,
      ),
    );
  }, []);

  const organizeTask = useCallback((id: string, data: OrganizeData) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              categoryId: data.categoryId,
              category: undefined,
              priority: data.priority,
              projectId: data.projectId,
              nextAction: data.nextAction,
              status: 'ACTIVE',
            }
          : task,
      ),
    );
  }, []);

  const updateNextAction = useCallback((id: string, nextAction: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, nextAction } : task)),
    );
  }, []);

  const savePlan = useCallback(
    (date: string, data: PlanData) => {
      const existing = dailyPlans.find((p) => p.date === date);
      const now = new Date().toISOString();

      setDailyPlans((prev) => {
        if (existing) {
          const updated: DailyPlan = {
            ...existing,
            bigRockTaskId: data.bigRockTaskId,
            supportTaskIds: data.supportTaskIds,
            adminTaskIds: data.adminTaskIds,
            planningCompleted: true,
            updatedAt: now,
          };
          return prev.map((p) => (p.date === date ? updated : p));
        }

        return [
          ...prev,
          {
            ...createEmptyPlan(date),
            bigRockTaskId: data.bigRockTaskId,
            supportTaskIds: data.supportTaskIds,
            adminTaskIds: data.adminTaskIds,
            planningCompleted: true,
            updatedAt: now,
          },
        ];
      });

      setTasks((prev) => {
        const newPlanTaskIds = new Set(
          [
            data.bigRockTaskId,
            ...data.supportTaskIds,
            ...data.adminTaskIds,
          ].filter(Boolean) as string[],
        );
        const oldPlanIds = [
          existing?.bigRockTaskId,
          ...(existing?.supportTaskIds ?? []),
          ...(existing?.adminTaskIds ?? []),
        ].filter(Boolean) as string[];
        const removedIds = new Set(
          oldPlanIds.filter((id) => !newPlanTaskIds.has(id)),
        );

        let updated = prev.map((task) =>
          removedIds.has(task.id)
            ? { ...task, priority: 'NONE' as TaskPriority }
            : task,
        );

        if (data.bigRockTaskId) {
          updated = updated.map((task) =>
            task.id === data.bigRockTaskId
              ? { ...task, priority: 'BIG_ROCK' as TaskPriority }
              : task.priority === 'BIG_ROCK'
                ? { ...task, priority: 'SUPPORT' as TaskPriority }
                : task,
          );
        }

        data.supportTaskIds.forEach((id) => {
          updated = updated.map((task) =>
            task.id === id
              ? { ...task, priority: 'SUPPORT' as TaskPriority }
              : task,
          );
        });

        data.adminTaskIds.forEach((id) => {
          updated = updated.map((task) =>
            task.id === id
              ? { ...task, priority: 'ADMIN' as TaskPriority }
              : task,
          );
        });

        return updated;
      });
    },
    [dailyPlans],
  );

  const getDailyPlan = useCallback(
    (date: string): DailyPlan | null =>
      dailyPlans.find((plan) => plan.date === date) ?? null,
    [dailyPlans],
  );

  const addFocusSession = useCallback((session: FocusSession) => {
    setFocusSessions((prev) => [...prev, session]);
  }, []);

  const addProject = useCallback((name: string, description: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const now = new Date().toISOString();
    setProjects((prev) => [
      ...prev,
      {
        id: generateId('project'),
        name: trimmedName,
        description: description.trim(),
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }, []);

  const updateProject = useCallback(
    (id: string, name: string, description: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id
            ? {
                ...project,
                name: trimmedName,
                description: description.trim(),
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
      );
    },
    [],
  );

  const archiveProject = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id
          ? { ...project, status: 'ARCHIVED', updatedAt: new Date().toISOString() }
          : project,
      ),
    );
  }, []);

  const addCategory = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const now = new Date().toISOString();
    setCategories((prev) => [
      ...prev,
      {
        id: generateId('category'),
        name: trimmedName,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }, []);

  const updateCategory = useCallback((id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setCategories((prev) =>
      prev.map((category) =>
        category.id === id
          ? { ...category, name: trimmedName, updatedAt: new Date().toISOString() }
          : category,
      ),
    );
  }, []);

  const archiveCategory = useCallback((id: string) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === id
          ? { ...category, status: 'ARCHIVED', updatedAt: new Date().toISOString() }
          : category,
      ),
    );
  }, []);

  const updateWorkspaceName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setWorkspace((prev) => ({
      ...prev,
      name: trimmedName,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const resetWorkspace = useCallback(() => {
    resetWorkspaceData();
    const now = new Date().toISOString();
    setTasks([]);
    setProjects([]);
    setCategories(STARTER_CATEGORIES.map((category) => ({ ...category })));
    setDailyPlans([]);
    setFocusSessions([]);
    setWorkspace({
      id: workspace.id,
      name: 'My Workspace',
      createdAt: now,
      updatedAt: now,
    });
  }, [workspace.id]);

  const todaySessions = focusSessions.filter((session) =>
    session.startedAt.startsWith(today),
  );
  const todayFocusMinutes = todaySessions.reduce(
    (sum, session) => sum + Math.round(session.duration / 60),
    0,
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        projects,
        categories,
        workspace,
        dailyPlans,
        todayPlan,
        focusSessions,
        addTask,
        toggleTask,
        organizeTask,
        updateNextAction,
        savePlan,
        getDailyPlan,
        addFocusSession,
        addProject,
        updateProject,
        archiveProject,
        addCategory,
        updateCategory,
        archiveCategory,
        updateWorkspaceName,
        resetWorkspace,
        todayFocusMinutes,
        todayFocusSessionCount: todaySessions.length,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within TaskProvider');
  return context;
}