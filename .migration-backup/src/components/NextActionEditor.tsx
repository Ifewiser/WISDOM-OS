import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface NextActionEditorProps {
  open: boolean;
  taskTitle: string;
  currentNextAction: string;
  onClose: () => void;
  onSave: (nextAction: string) => void;
}

export default function NextActionEditor({
  open,
  taskTitle,
  currentNextAction,
  onClose,
  onSave,
}: NextActionEditorProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(currentNextAction);
  }, [open, currentNextAction]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    onSave(value.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-ink-900 border border-ink-700 rounded-t-3xl p-5 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink-50">Define Next Action</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-ink-300 mb-4 leading-relaxed bg-ink-850 rounded-xl p-3">
          {taskTitle}
        </p>

        <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2.5">
          What's the next physical action?
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Open n8n and create a Shopify webhook node"
          autoFocus
          className="w-full bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent-500 transition-colors"
        />

        <button
          onClick={handleSave}
          className="w-full mt-4 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
