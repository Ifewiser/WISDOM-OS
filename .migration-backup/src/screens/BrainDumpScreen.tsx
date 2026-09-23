import { useState } from 'react';
import { Brain } from 'lucide-react';
import { useTasks } from '@/context/TaskContext';
import type { Task, BrainDumpFilter } from '@/types';
import BrainDumpItem from '@/components/BrainDumpItem';
import OrganizeSheet from '@/components/OrganizeSheet';

const filters: { id: BrainDumpFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'INBOX', label: 'Inbox' },
  { id: 'ORGANIZED', label: 'Organized' },
];

export default function BrainDumpScreen() {
  const { tasks, addTask, toggleTask, organizeTask } = useTasks();
  const [content, setContent] = useState('');
  const [activeFilter, setActiveFilter] = useState<BrainDumpFilter>('ALL');
  const [organizingTask, setOrganizingTask] = useState<Task | null>(null);

  const handleDump = () => {
    if (!content.trim()) return;
    addTask(content);
    setContent('');
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'INBOX') return t.status === 'INBOX';
    if (activeFilter === 'ORGANIZED') return t.status !== 'INBOX';
    return true;
  });

  const isEmpty = filteredTasks.length === 0;

  return (
    <div className="px-5 pt-14 pb-4">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={20} className="text-accent-400" />
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">Brain Dump</h1>
        </div>
        <p className="text-sm text-ink-400">Get everything out of your head.</p>
      </header>

      <div className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleDump();
            }
          }}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full bg-ink-900 border border-ink-700 rounded-2xl p-4 text-base text-ink-100 placeholder:text-ink-500 resize-none focus:outline-none focus:border-accent-500 transition-colors"
        />
        <button
          onClick={handleDump}
          disabled={!content.trim()}
          className="w-full mt-3 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Dump It
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === f.id
                ? 'bg-ink-700 text-ink-100'
                : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-ink-900 border border-ink-700 flex items-center justify-center mb-4">
            <Brain size={24} className="text-ink-500" />
          </div>
          <p className="text-sm text-ink-300 font-medium">
            {activeFilter === 'INBOX' ? 'No unorganized items.' : 'Nothing here yet.'}
          </p>
          <p className="text-sm text-ink-500 mt-1">
            {activeFilter === 'INBOX'
              ? 'Everything has been organized.'
              : 'Dump everything that\'s taking up mental space.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <BrainDumpItem
              key={task.id}
              task={task}
              onOrganize={setOrganizingTask}
              onToggle={toggleTask}
            />
          ))}
        </div>
      )}

      <OrganizeSheet
        task={organizingTask}
        onClose={() => setOrganizingTask(null)}
        onOrganize={organizeTask}
      />
    </div>
  );
}
