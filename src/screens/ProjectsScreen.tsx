import { FolderKanban } from 'lucide-react';
import { useTasks } from '@/context/TaskContext';
import { projects } from '@/mockData';

export default function ProjectsScreen() {
  const { tasks } = useTasks();

  return (
    <div className="px-5 pt-14 pb-4">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FolderKanban size={20} className="text-accent-400" />
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">Projects</h1>
        </div>
        <p className="text-sm text-ink-400">Containers for your work.</p>
      </header>

      <div className="space-y-3">
        {projects.map((project) => {
          const activeCount = tasks.filter(
            (t) => t.projectId === project.id && t.status === 'ACTIVE',
          ).length;

          return (
            <div
              key={project.id}
              className="bg-ink-900 border border-ink-700 rounded-2xl p-4 hover:border-ink-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-ink-50 mb-1">{project.name}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed">{project.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-ink-100">{activeCount}</p>
                  <p className="text-[10px] font-medium tracking-wide uppercase text-ink-500">
                    Active
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
