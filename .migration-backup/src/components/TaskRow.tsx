import { Circle, CheckCircle2 } from 'lucide-react';
import type { Task } from '@/types';

interface TaskRowProps {
  task: Task;
  onToggle?: (id: string) => void;
}

export default function TaskRow({ task, onToggle }: TaskRowProps) {
  const isCompleted = task.status === 'COMPLETED';
  return (
    <button
      onClick={() => onToggle?.(task.id)}
      className="w-full flex items-start gap-3 py-3 text-left group"
    >
      {isCompleted ? (
        <CheckCircle2 size={20} className="text-accent-500 shrink-0 mt-0.5" />
      ) : (
        <Circle
          size={20}
          className="text-ink-500 shrink-0 mt-0.5 group-hover:text-ink-300 transition-colors"
        />
      )}
      <span
        className={`text-sm leading-relaxed ${
          isCompleted ? 'text-ink-500 line-through' : 'text-ink-200'
        }`}
      >
        {task.title}
      </span>
    </button>
  );
}
