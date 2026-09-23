import { Sun, Brain, FolderKanban, ClipboardCheck } from 'lucide-react';
import type { ScreenId } from '@/types';

interface BottomNavProps {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
}

const items: { id: ScreenId; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'brain-dump', label: 'Brain Dump', icon: Brain },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-ink-900/95 backdrop-blur-md border-t border-ink-700">
      <div className="mx-auto max-w-md flex">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-accent-400' : 'text-ink-400'}
              />
              <span
                className={`text-[11px] font-medium tracking-wide ${
                  isActive ? 'text-accent-400' : 'text-ink-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
