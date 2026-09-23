import { useState } from 'react';
import { Play, Calendar, CheckCircle2, Pencil, Timer } from 'lucide-react';
import { useTasks } from '@/context/TaskContext';
import { getTodayDate, formatDateLong } from '@/types';
import TaskRow from '@/components/TaskRow';
import DailyPlanningWizard from '@/components/DailyPlanningWizard';
import NextActionEditor from '@/components/NextActionEditor';

interface TodayScreenProps {
  onNavigate: (screen: 'today' | 'brain-dump' | 'projects' | 'review') => void;
  onStartFocus: () => void;
}

export default function TodayScreen({ onNavigate, onStartFocus }: TodayScreenProps) {
  const { tasks, todayPlan, toggleTask, savePlan, updateNextAction, todayFocusMinutes, todayFocusSessionCount } = useTasks();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [justPlanned, setJustPlanned] = useState(false);

  const today = getTodayDate();
  const plan = todayPlan;
  const isPlanned = plan?.planningCompleted === true;

  const bigRockTask = plan?.bigRockTaskId
    ? tasks.find((t) => t.id === plan.bigRockTaskId) ?? null
    : null;

  const supportTasks = (plan?.supportTaskIds ?? [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const adminTasks = (plan?.adminTaskIds ?? [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const completedInPlan = [bigRockTask, ...supportTasks, ...adminTasks].filter(
    (t) => t && t.status === 'COMPLETED',
  ).length;
  const totalInPlan = [bigRockTask, ...supportTasks, ...adminTasks].filter(Boolean).length;
  const progress = totalInPlan > 0 ? Math.round((completedInPlan / totalInPlan) * 100) : 0;

  const bigRockCompleted = bigRockTask?.status === 'COMPLETED';

  const handleConfirmPlan = (data: {
    bigRockTaskId: string | null;
    supportTaskIds: string[];
    adminTaskIds: string[];
  }) => {
    savePlan(today, data);
    setJustPlanned(true);
    setTimeout(() => setJustPlanned(false), 3000);
  };

  return (
    <div className="px-5 pt-14 pb-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">WISDOM OS</h1>
        <p className="text-sm text-ink-400 mt-0.5">{formatDateLong(new Date())}</p>
      </header>

      {/* Planning button or confirmation */}
      {!isPlanned && (
        <button
          onClick={() => setWizardOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors mb-6"
        >
          <Calendar size={16} />
          Plan My Day
        </button>
      )}

      {isPlanned && (
        <button
          onClick={() => setWizardOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-ink-800 text-ink-300 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors mb-6"
        >
          <Pencil size={14} />
          Edit Today's Plan
        </button>
      )}

      {justPlanned && (
        <div className="flex items-center gap-2 bg-accent-500/10 border border-accent-500/30 rounded-2xl px-4 py-3 mb-6">
          <CheckCircle2 size={16} className="text-accent-400 shrink-0" />
          <p className="text-sm text-accent-300 font-medium">Your day is planned.</p>
        </div>
      )}

      {/* Planned Today content */}
      {isPlanned && bigRockTask && (
        <>
          {/* Big Rock */}
          <section className="mb-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-3">
              Today's Focus
            </p>
            <div className="bg-ink-900 border border-ink-700 rounded-3xl p-5 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-accent-400 bg-accent-500/10 px-2.5 py-1 rounded-full">
                  Big Rock
                </span>
                {bigRockCompleted && (
                  <span className="text-[10px] font-bold tracking-widest uppercase text-accent-500 bg-accent-500/10 px-2.5 py-1 rounded-full">
                    Complete
                  </span>
                )}
              </div>
              <h2
                className={`text-xl font-bold leading-snug mb-4 ${
                  bigRockCompleted ? 'text-ink-500 line-through' : 'text-ink-50'
                }`}
              >
                {bigRockTask.title}
              </h2>
              <div className="bg-ink-850 rounded-2xl p-4">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-ink-400 mb-1.5">
                  Next Action
                </p>
                {bigRockTask.nextAction ? (
                  <p className="text-base text-accent-300 font-medium leading-relaxed">
                    {bigRockTask.nextAction}
                  </p>
                ) : (
                  <p className="text-base text-ink-400 font-medium leading-relaxed italic">
                    Define your next physical action before starting.
                  </p>
                )}
              </div>
            </div>

            {bigRockTask.nextAction && !bigRockCompleted && (
              <button
                onClick={onStartFocus}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
              >
                <Play size={16} fill="currentColor" />
                Start Focus
              </button>
            )}

            {!bigRockTask.nextAction && !bigRockCompleted && (
              <button
                onClick={() => setNextActionOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
              >
                Define Next Action
              </button>
            )}

            {bigRockCompleted && (
              <div className="flex items-center gap-2 bg-accent-500/10 border border-accent-500/30 rounded-2xl px-4 py-3">
                <CheckCircle2 size={16} className="text-accent-400 shrink-0" />
                <p className="text-sm text-accent-300 font-medium">
                  Big Rock complete. Continue with Support Tasks.
                </p>
              </div>
            )}
          </section>

          {/* Focus Today info */}
          {todayFocusSessionCount > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 bg-ink-900 border border-ink-700 rounded-xl px-4 py-3">
                <Timer size={14} className="text-ink-400 shrink-0" />
                <p className="text-xs text-ink-300 font-medium">
                  Focus Today
                </p>
                <p className="text-xs text-ink-400 ml-auto">
                  {todayFocusSessionCount} {todayFocusSessionCount === 1 ? 'session' : 'sessions'} · {todayFocusMinutes} min
                </p>
              </div>
            </section>
          )}

          {/* Support Tasks */}
          <section className="mb-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1 px-1">
              Support Tasks
            </p>
            <div className="px-1 divide-y divide-ink-800">
              {supportTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {supportTasks.length === 0 && (
                <p className="py-3 text-sm text-ink-500 px-1">No support tasks.</p>
              )}
            </div>
          </section>

          {/* Admin */}
          <section className="mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1 px-1">
              Admin
            </p>
            <div className="px-1 divide-y divide-ink-800">
              {adminTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {adminTasks.length === 0 && (
                <p className="py-3 text-sm text-ink-500 px-1">No admin tasks.</p>
              )}
            </div>
          </section>

          {/* Progress */}
          <section className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-ink-400">Daily Progress</p>
              <p className="text-xs font-semibold text-ink-300">{progress}%</p>
            </div>
            <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        </>
      )}

      {/* Unplanned state */}
      {!isPlanned && (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-ink-900 border border-ink-700 flex items-center justify-center mb-4">
            <Calendar size={24} className="text-ink-500" />
          </div>
          <p className="text-sm text-ink-300 font-medium mb-1">Your day isn't planned yet.</p>
          <p className="text-sm text-ink-500">Tap "Plan My Day" to get started.</p>
        </div>
      )}

      {/* Empty plan state */}
      {isPlanned && !bigRockTask && (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-ink-900 border border-ink-700 flex items-center justify-center mb-4">
            <Calendar size={24} className="text-ink-500" />
          </div>
          <p className="text-sm text-ink-300 font-medium mb-1">No Big Rock selected.</p>
          <p className="text-sm text-ink-500 mb-4">Edit your plan to choose what matters most.</p>
          <button
            onClick={() => setWizardOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
          >
            Edit Today's Plan
          </button>
        </div>
      )}

      {/* Modals */}
      <DailyPlanningWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        tasks={tasks}
        existingPlan={plan}
        onConfirm={handleConfirmPlan}
        onGoToBrainDump={() => {
          setWizardOpen(false);
          onNavigate('brain-dump');
        }}
      />

      {bigRockTask && (
        <NextActionEditor
          open={nextActionOpen}
          taskTitle={bigRockTask.title}
          currentNextAction={bigRockTask.nextAction}
          onClose={() => setNextActionOpen(false)}
          onSave={(na) => updateNextAction(bigRockTask.id, na)}
        />
      )}
    </div>
  );
}
