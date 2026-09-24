import { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  FolderKanban,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import type { Project } from '@/types';
import { useTasks } from '@/context/TaskContext';

export default function ProjectsScreen() {
  const {
    tasks,
    projects,
    categories,
    workspace,
    addProject,
    updateProject,
    archiveProject,
    addCategory,
    updateCategory,
    archiveCategory,
    updateWorkspaceName,
    resetWorkspace,
  } = useTasks();
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setWorkspaceName(workspace.name);
  }, [workspace.name]);

  const visibleProjects = projects.filter(
    (project) => project.status === 'ACTIVE' || showArchived,
  );
  const activeCategories = categories.filter((category) => category.status === 'ACTIVE');
  const archivedCategories = categories.filter((category) => category.status === 'ARCHIVED');

  const openNewProject = () => {
    setEditingProjectId(null);
    setProjectName('');
    setProjectDescription('');
    setProjectFormOpen(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description);
    setProjectFormOpen(true);
  };

  const saveProject = () => {
    if (editingProjectId) {
      updateProject(editingProjectId, projectName, projectDescription);
    } else {
      addProject(projectName, projectDescription);
    }
    setProjectFormOpen(false);
    setEditingProjectId(null);
  };

  const saveWorkspace = () => {
    updateWorkspaceName(workspaceName);
  };

  const createCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName);
    setNewCategoryName('');
  };

  const saveCategory = (id: string) => {
    updateCategory(id, categoryDraft);
    setEditingCategoryId(null);
  };

  return (
    <div className="px-5 pt-14 pb-4">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban size={20} className="text-accent-400" />
              <h1 className="text-2xl font-bold tracking-tight text-ink-50">Projects</h1>
            </div>
            <p className="text-sm text-ink-400">Containers for your work.</p>
          </div>
          <button
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-800 border border-ink-700 text-xs font-medium text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
          >
            <Settings size={14} />
            Manage
          </button>
        </div>
      </header>

      <button
        onClick={openNewProject}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors mb-5"
      >
        <Plus size={17} />
        New Project
      </button>

      {projectFormOpen && (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink-50">
              {editingProjectId ? 'Edit Project' : 'New Project'}
            </h2>
            <button
              onClick={() => setProjectFormOpen(false)}
              className="text-ink-400 hover:text-ink-100"
              aria-label="Close project form"
            >
              <X size={18} />
            </button>
          </div>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            className="w-full bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent-500 mb-3"
          />
          <textarea
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-ink-100 placeholder:text-ink-500 resize-none focus:outline-none focus:border-accent-500 mb-3"
          />
          <button
            onClick={saveProject}
            disabled={!projectName.trim()}
            className="w-full py-3 rounded-xl bg-accent-500 text-ink-950 font-semibold text-sm disabled:opacity-40"
          >
            {editingProjectId ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <button
          onClick={() => setShowArchived((value) => !value)}
          className="text-xs text-ink-400 hover:text-ink-200 mb-3 transition-colors"
        >
          {showArchived ? 'Hide archived projects' : 'Show archived projects'}
        </button>
      )}

      <div className="space-y-3">
        {visibleProjects.map((project) => {
          const activeCount = tasks.filter(
            (task) => task.projectId === project.id && task.status === 'ACTIVE',
          ).length;
          const archived = project.status === 'ARCHIVED';

          return (
            <div
              key={project.id}
              className={`bg-ink-900 border rounded-2xl p-4 transition-colors ${
                archived ? 'border-ink-800 opacity-75' : 'border-ink-700 hover:border-ink-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-ink-50">{project.name}</h3>
                    {archived && (
                      <span className="text-[10px] uppercase tracking-wide text-ink-500 border border-ink-700 rounded-full px-2 py-0.5">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-400 leading-relaxed">
                    {project.description || 'No description yet.'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-ink-100">{activeCount}</p>
                  <p className="text-[10px] font-medium tracking-wide uppercase text-ink-500">
                    Active
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-ink-800">
                <button
                  onClick={() => openEditProject(project)}
                  className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-100"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                {!archived && (
                  <button
                    onClick={() => archiveProject(project.id)}
                    className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-amber-300"
                  >
                    <Archive size={14} />
                    Archive
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {visibleProjects.length === 0 && (
          <div className="text-center py-14">
            <FolderKanban size={28} className="mx-auto text-ink-600 mb-3" />
            <p className="text-sm text-ink-300 font-medium">No projects yet.</p>
            <p className="text-sm text-ink-500 mt-1">Create one to group related tasks.</p>
          </div>
        )}
      </div>

      {manageOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/85 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar bg-ink-900 border border-ink-700 rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent-400 mb-1">
                  Workspace
                </p>
                <h2 className="text-xl font-bold text-ink-50">Manage your space</h2>
              </div>
              <button
                onClick={() => setManageOpen(false)}
                className="text-ink-400 hover:text-ink-100"
                aria-label="Close workspace management"
              >
                <X size={20} />
              </button>
            </div>

            <section className="mb-8">
              <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2">
                Workspace name
              </p>
              <div className="flex gap-2">
                <input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  className="min-w-0 flex-1 bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-ink-100 focus:outline-none focus:border-accent-500"
                />
                <button
                  onClick={saveWorkspace}
                  disabled={!workspaceName.trim()}
                  className="px-4 rounded-xl bg-accent-500 text-ink-950 disabled:opacity-40"
                  aria-label="Save workspace name"
                >
                  <Check size={17} />
                </button>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-widest uppercase text-ink-400">
                  Categories
                </p>
                <span className="text-[10px] text-ink-500">{activeCategories.length} active</span>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') createCategory();
                  }}
                  placeholder="New category"
                  className="min-w-0 flex-1 bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent-500"
                />
                <button
                  onClick={createCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 rounded-xl bg-ink-800 border border-ink-700 text-accent-400 disabled:opacity-40"
                  aria-label="Add category"
                >
                  <Plus size={17} />
                </button>
              </div>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center gap-2 rounded-xl bg-ink-850 px-3 py-2.5 ${
                      category.status === 'ARCHIVED' ? 'opacity-60' : ''
                    }`}
                  >
                    {editingCategoryId === category.id ? (
                      <>
                        <input
                          autoFocus
                          value={categoryDraft}
                          onChange={(event) => setCategoryDraft(event.target.value)}
                          className="min-w-0 flex-1 bg-ink-900 border border-ink-700 rounded-lg px-2 py-1.5 text-sm text-ink-100 focus:outline-none focus:border-accent-500"
                        />
                        <button
                          onClick={() => saveCategory(category.id)}
                          className="text-accent-400"
                          aria-label="Save category"
                        >
                          <Check size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 text-sm text-ink-200">
                          {category.name}
                          {category.status === 'ARCHIVED' && (
                            <span className="ml-2 text-[10px] uppercase text-ink-500">Archived</span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setCategoryDraft(category.name);
                          }}
                          className="text-ink-500 hover:text-ink-200"
                          aria-label={`Rename ${category.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        {category.status === 'ACTIVE' && (
                          <button
                            onClick={() => archiveCategory(category.id)}
                            className="text-ink-500 hover:text-amber-300"
                            aria-label={`Archive ${category.name}`}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              {archivedCategories.length > 0 && (
                <p className="text-xs text-ink-500 mt-3">
                  Archived categories remain attached to existing tasks.
                </p>
              )}
            </section>

            <section className="border-t border-ink-800 pt-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2">
                Reset workspace
              </p>
              <p className="text-sm text-ink-500 leading-relaxed mb-3">
                Remove local tasks, projects, plans, sessions, and workspace settings. Starter
                categories will be restored.
              </p>
              <button
                onClick={() => setResetConfirmOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-red-300 hover:text-red-200"
              >
                <RotateCcw size={15} />
                Reset local workspace
              </button>
            </section>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-ink-950/90 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-ink-900 border border-ink-700 rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-ink-50 mb-2">Reset this workspace?</h2>
            <p className="text-sm text-ink-400 leading-relaxed mb-6">
              This will permanently remove this workspace's local tasks, projects, plans, focus
              history, and settings. This cannot be undone.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  resetWorkspace();
                  setResetConfirmOpen(false);
                  setManageOpen(false);
                }}
                className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold text-sm"
              >
                Reset Workspace
              </button>
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700"
              >
                Keep My Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}