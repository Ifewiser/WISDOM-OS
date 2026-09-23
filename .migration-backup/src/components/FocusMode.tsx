import { useEffect } from 'react';
import { X, Timer } from 'lucide-react';

interface FocusModeProps {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  nextAction: string;
}

export default function FocusMode({ open, onClose, taskTitle, nextAction }: FocusModeProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-ink-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-ink-900 border border-ink-700 rounded-3xl p-7">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-accent-400">
            <Timer size={18} strokeWidth={2} />
            <span className="text-sm font-semibold tracking-widest uppercase">Focus Mode</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-ink-400 mb-2">
              Current task
            </p>
            <p className="text-lg font-semibold text-ink-100 leading-snug">{taskTitle}</p>
          </div>

          <div className="h-px bg-ink-700" />

          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-ink-400 mb-2">
              Next action
            </p>
            <p className="text-base text-accent-300 font-medium leading-relaxed">{nextAction}</p>
          </div>
        </div>

        <div className="mt-8 space-y-2.5">
          <button className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors">
            Start 25 min
          </button>
          <button className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors">
            Start 50 min
          </button>
          <button className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors">
            Start 90 min
          </button>
        </div>
      </div>
    </div>
  );
}
