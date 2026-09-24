import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, TaskPriority } from '@/types';
import { PRIORITY_LABELS } from '@/types';
import { useTasks } from '@/context/TaskContext';

interface OrganizeSheetProps {
  task: Task | null;
  onClose: () => void;
  onOrganize: (id: string, data: {
    categoryId: string | null;
    priority: TaskPriority;
    projectId: string | null;
    nextAction: string;
  }) => void;
}

const priorities: TaskPriority[] = ['BIG_ROCK', 'SUPPORT', 'ADMIN', 'NONE'];

export default function OrganizeSheet({ task, onClose, onOrganize }: OrganizeSheetProps) {
  const { categories, projects } = useTasks();
  const activeCategories = categories.filter((category) => category.status === 'ACTIVE');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('SUPPORT');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState('');

  useEffect(() => {
    if (task) {
      const categoryExists = categories.some((category) => category.id === task.categoryId);
      setCategoryId(
        categoryExists
          ? task.categoryId
          : activeCategories[0]?.id ?? null,
      );
      setPriority(task.priority === 'NONE' ? 'SUPPORT' : task.priority);
      setProjectId(task.projectId);
      setNextAction(task.nextAction);
    }
  }, [task, categories, activeCategories]);

  useEffect(() => {
    if (task) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [task]);

  if (!task) return null;

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const isLater = selectedCategory?.systemKey === 'LATER';
  const visibleCategories = categories.filter(
    (category) => category.status === 'ACTIVE' || category.id === categoryId,
  );
  const visibleProjects = projects.filter(
    (project) => project.status === 'ACTIVE' || project.id === projectId,
  );

  const handleSave = () => {
    onOrganize(task.id, {
      categoryId,
      priority: isLater ? 'NONE' : priority,
      projectId,
      nextAction: isLater ? '' : nextAction.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-ink-900 border border-ink-700 rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink-50">Organize Task</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-ink-300 mb-5 leading-relaxed bg-ink-850 rounded-xl p-3">
          {task.title}
        </p>

        {/* Category */}
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2.5">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  categoryId === cat.id
                    ? 'bg-accent-500 text-ink-950'
                    : 'bg-ink-800 text-ink-300 border border-ink-700 hover:border-ink-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        {!isLater && (
          <div className="mb-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2.5">
              Priority
            </p>
            <div className="flex flex-wrap gap-2">
              {priorities.filter((p) => p !== 'NONE').map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    priority === p
                      ? 'bg-accent-500 text-ink-950'
                      : 'bg-ink-800 text-ink-300 border border-ink-700 hover:border-ink-600'
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project */}
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2.5">
            Project
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setProjectId(null)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                projectId === null
                  ? 'bg-accent-500 text-ink-950'
                  : 'bg-ink-800 text-ink-300 border border-ink-700 hover:border-ink-600'
              }`}
            >
              None
            </button>
            {visibleProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => setProjectId(p.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  projectId === p.id
                    ? 'bg-accent-500 text-ink-950'
                    : 'bg-ink-800 text-ink-300 border border-ink-700 hover:border-ink-600'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Next Action */}
        {!isLater && (
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2.5">
              What's the next physical action?
            </p>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Open n8n and create a Shopify webhook node"
              className="w-full bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent-500 transition-colors"
            />
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
