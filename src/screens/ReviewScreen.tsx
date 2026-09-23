import { ClipboardCheck } from 'lucide-react';
import { useTasks } from '@/context/TaskContext';

export default function ReviewScreen() {
  const { tasks, todayPlan } = useTasks();

  const bigRockTask = todayPlan?.bigRockTaskId
    ? tasks.find((t) => t.id === todayPlan.bigRockTaskId) ?? null
    : null;

  const planTaskIds = new Set([
    todayPlan?.bigRockTaskId,
    ...(todayPlan?.supportTaskIds ?? []),
    ...(todayPlan?.adminTaskIds ?? []),
  ].filter(Boolean) as string[]);

  const completedTasks = tasks.filter((t) => planTaskIds.has(t.id) && t.status === 'COMPLETED');
  const unfinishedTasks = tasks.filter((t) => planTaskIds.has(t.id) && t.status !== 'COMPLETED');

  return (
    <div className="px-5 pt-14 pb-4">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={20} className="text-accent-400" />
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">Review</h1>
        </div>
        <p className="text-sm text-ink-400">Reflect, adjust, and prepare.</p>
      </header>

      <div className="space-y-4">
        {/* Today's Big Rock */}
        <section className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-accent-400 mb-3">
            Today's Big Rock
          </h2>
          {bigRockTask ? (
            <div>
              <p className="text-sm font-semibold text-ink-100 mb-1">{bigRockTask.title}</p>
              {bigRockTask.nextAction && (
                <p className="text-xs text-accent-300">{bigRockTask.nextAction}</p>
              )}
              <div className="mt-2">
                {bigRockTask.status === 'COMPLETED' ? (
                  <span className="text-xs text-accent-400 font-medium">Completed</span>
                ) : (
                  <span className="text-xs text-ink-400 font-medium">In progress</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-500">No Big Rock planned for today.</p>
          )}
        </section>

        {/* Completed */}
        <section className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-accent-400 mb-3">
            Completed
          </h2>
          {completedTasks.length > 0 ? (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 text-sm text-ink-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                  {task.title}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">Nothing completed yet.</p>
          )}
        </section>

        {/* Unfinished */}
        <section className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-ink-300 mb-3">
            Unfinished
          </h2>
          {unfinishedTasks.length > 0 ? (
            <div className="space-y-2">
              {unfinishedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 text-sm text-ink-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-500" />
                  {task.title}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-500">Everything is done.</p>
          )}
        </section>

        {/* Tomorrow */}
        <section className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-ink-300 mb-3">
            Tomorrow
          </h2>
          <p className="text-sm text-ink-300 mb-3">
            What is the ONE thing that matters most tomorrow?
          </p>
          <div className="bg-ink-850 rounded-xl p-3.5">
            <p className="text-sm text-ink-100 font-medium leading-relaxed">
              Complete the webhook authentication setup and send a successful test payload.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
