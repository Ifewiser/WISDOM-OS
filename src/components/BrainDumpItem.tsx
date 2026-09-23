import { Circle, CheckCircle2, ArrowRightCircle } from 'lucide-react';
import type { Task } from '@/types';
import { CATEGORY_LABELS } from '@/types';

interface BrainDumpItemProps {
  task: Task;
  onOrganize: (task: Task) => void;
  onToggle: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  INBOX: 'text-ink-400 bg-ink-800',
  MONEY: 'text-accent-300 bg-accent-500/10',
  BUILD: 'text-accent-300 bg-accent-500/10',
  LEARN: 'text-accent-300 bg-accent-500/10',
  ADMIN: 'text-ink-300 bg-ink-700',
  LATER: 'text-ink-400 bg-ink-800',
};

export default function BrainDumpItem({ task, onOrganize, onToggle }: BrainDumpItemProps) {
  const isOrganized = task.status !== 'INBOX';
  const badgeLabel = isOrganized && task.category ? CATEGORY_LABELS[task.category] : 'INBOX';
  const badgeClass = isOrganized && task.category ? categoryColors[task.category] : categoryColors.INBOX;

  return (
    <div className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(task.id)} className="shrink-0 mt-0.5">
          {task.status === 'COMPLETED' ? (
            <CheckCircle2 size={20} className="text-accent-500" />
          ) : (
            <Circle size={20} className="text-ink-500 hover:text-ink-300 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-relaxed ${
              task.status === 'COMPLETED' ? 'text-ink-500 line-through' : 'text-ink-100'
            }`}
          >
            {task.title}
          </p>

          {task.nextAction && (
            <p className="text-xs text-accent-300 mt-1.5 leading-relaxed">
              {task.nextAction}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full ${badgeClass}`}>
              {badgeLabel}
            </span>
            {isOrganized && (
              <button
                onClick={() => onOrganize(task)}
                className="ml-auto flex items-center gap-1 text-xs text-ink-400 hover:text-ink-200 transition-colors"
              >
                <ArrowRightCircle size={14} />
                Edit
              </button>
            )}
          </div>
        </div>

        {!isOrganized && (
          <button
            onClick={() => onOrganize(task)}
            className="shrink-0 text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors px-3 py-1.5 rounded-lg bg-accent-500/10"
          >
            Organize
          </button>
        )}
      </div>
    </div>
  );
}
