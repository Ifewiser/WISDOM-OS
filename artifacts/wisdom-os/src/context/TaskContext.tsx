import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Task, TaskCategory, TaskPriority, DailyPlan, FocusSession, ActiveFocusSession } from '@/types';
import { getTodayDate } from '@/types';
import { initialTasks } from '@/mockData';
import { loadTasks, saveTasks, loadDailyPlans, saveDailyPlans, loadFocusSessions, saveFocusSessions, loadActiveFocusSession, saveActiveFocusSession } from '@/storage';

interface OrganizeData {
  category: TaskCategory;
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
  todayFocusMinutes: number;
  todayFocusSessionCount: number;
}

const TaskContext = createContext<TaskContextValue | null>(null);

let idCounter = 1000;

function generateId(): string {
  idCounter += 1;
  return `task-${idCounter}`;
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
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks() ?? initialTasks);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(() => loadDailyPlans() ?? []);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => loadFocusSessions() ?? []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveDailyPlans(dailyPlans);
  }, [dailyPlans]);

  useEffect(() => {
    saveFocusSessions(focusSessions);
  }, [focusSessions]);

  const today = getTodayDate();
  const todayPlan = dailyPlans.find((p) => p.date === today) ?? null;

  const addTask = useCallback((title: string) => {
    const newTask: Task = {
      id: generateId(),
      title: title.trim(),
      category: null,
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
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED' }
          : t,
      ),
    );
  }, []);

  const organizeTask = useCallback((id: string, data: OrganizeData) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              category: data.category,
              priority: data.priority,
              projectId: data.projectId,
              nextAction: data.nextAction,
              status: 'ACTIVE',
            }
          : t,
      ),
    );
  }, []);

  const updateNextAction = useCallback((id: string, nextAction: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, nextAction } : t)),
    );
  }, []);

  const getDailyPlan = useCallback(
    (date: string): DailyPlan | null => {
      return dailyPlans.find((p) => p.date === date) ?? null;
    },
    [dailyPlans],
  );

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

        const newPlan: DailyPlan = {
          ...createEmptyPlan(date),
          bigRockTaskId: data.bigRockTaskId,
          supportTaskIds: data.supportTaskIds,
          adminTaskIds: data.adminTaskIds,
          planningCompleted: true,
          updatedAt: now,
        };
        return [...prev, newPlan];
      });

      // Update task priorities to match the plan
      setTasks((prev) => {
        const newPlanTaskIds = new Set([
          data.bigRockTaskId,
          ...data.supportTaskIds,
          ...data.adminTaskIds,
        ].filter(Boolean) as string[]);

        // All task IDs that were in the old plan but are NOT in the new plan
        const removedIds = new Set(
          [
            existing?.bigRockTaskId,
            ...(existing?.supportTaskIds ?? []),
            ...(existing?.adminTaskIds ?? []),
          ]
            .filter(Boolean)
            .filter((id): id is string => !newPlanTaskIds.has(id as string)),
        );

        let updated = prev.map((t) => {
          if (removedIds.has(t.id)) {
            return { ...t, priority: 'NONE' as TaskPriority };
          }
          return t;
        });

        // Clear BIG_ROCK from any task not in the new plan
        if (data.bigRockTaskId) {
          updated = updated.map((t) =>
            t.id === data.bigRockTaskId
              ? { ...t, priority: 'BIG_ROCK' as TaskPriority }
              : t.priority === 'BIG_ROCK'
                ? { ...t, priority: 'SUPPORT' as TaskPriority }
                : t,
          );
        }

        // Assign Support
        data.supportTaskIds.forEach((sid) => {
          updated = updated.map((t) =>
            t.id === sid ? { ...t, priority: 'SUPPORT' as TaskPriority } : t,
          );
        });

        // Assign Admin
        data.adminTaskIds.forEach((aid) => {
          updated = updated.map((t) =>
            t.id === aid ? { ...t, priority: 'ADMIN' as TaskPriority } : t,
          );
        });

        return updated;
      });
    },
    [dailyPlans],
  );

  const addFocusSession = useCallback((session: FocusSession) => {
    setFocusSessions((prev) => [...prev, session]);
  }, []);

  const todaySessions = focusSessions.filter((s) => s.startedAt.startsWith(today));
  const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  const todayFocusSessionCount = todaySessions.length;

  return (
    <TaskContext.Provider
      value={{
        tasks,
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
        todayFocusMinutes,
        todayFocusSessionCount,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within TaskProvider');
  return ctx;
}
