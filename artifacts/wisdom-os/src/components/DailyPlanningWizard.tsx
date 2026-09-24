import { useState, useEffect } from 'react';
import { X, Check, ChevronLeft, AlertTriangle } from 'lucide-react';
import type { Task, DailyPlan } from '@/types';
import { projects } from '@/mockData';

interface DailyPlanningWizardProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  existingPlan: DailyPlan | null;
  onConfirm: (data: {
    bigRockTaskId: string | null;
    supportTaskIds: string[];
    adminTaskIds: string[];
  }) => void;
  onGoToBrainDump: () => void;
}

type Step = 'big-rock' | 'big-rock-confirm' | 'support' | 'admin' | 'summary';

function projectName(projectId: string | null): string {
  if (!projectId) return 'No project';
  return projects.find((p) => p.id === projectId)?.name ?? 'No project';
}

function TaskSelectCard({
  task,
  selected,
  onClick,
  showNextAction = true,
  showProject = true,
}: {
  task: Task;
  selected: boolean;
  onClick: () => void;
  showNextAction?: boolean;
  showProject?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-ink-900 border rounded-2xl p-4 transition-colors ${
        selected ? 'border-accent-500 bg-accent-500/5' : 'border-ink-700 hover:border-ink-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {selected ? (
            <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
              <Check size={14} className="text-ink-950" strokeWidth={3} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-ink-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed text-ink-100">{task.title}</p>
          {showProject && (
            <p className="text-xs text-ink-500 mt-1">{projectName(task.projectId)}</p>
          )}
          {showNextAction && task.nextAction && (
            <p className="text-xs text-accent-300 mt-1.5 leading-relaxed">{task.nextAction}</p>
          )}
          {showNextAction && !task.nextAction && (
            <p className="text-xs text-ink-500 mt-1.5 italic">No next action defined</p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function DailyPlanningWizard({
  open,
  onClose,
  tasks,
  existingPlan,
  onConfirm,
  onGoToBrainDump,
}: DailyPlanningWizardProps) {
  const [step, setStep] = useState<Step>('big-rock');
  const [bigRockId, setBigRockId] = useState<string | null>(null);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [supportWarning, setSupportWarning] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('big-rock');
      setBigRockId(existingPlan?.bigRockTaskId ?? null);
      setSupportIds(existingPlan?.supportTaskIds ?? []);
      setAdminIds(existingPlan?.adminTaskIds ?? []);
      setSupportWarning(false);
    }
  }, [open, existingPlan]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const eligibleBigRock = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'INBOX' && t.category !== 'LATER',
  );

  const eligibleSupport = eligibleBigRock.filter((t) => t.id !== bigRockId);
  const eligibleAdmin = tasks.filter(
    (t) => t.status === 'ACTIVE' && t.category === 'ADMIN',
  );

  const bigRockTask = tasks.find((t) => t.id === bigRockId) ?? null;

  if (eligibleBigRock.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-ink-950/80 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-ink-900 border border-ink-700 rounded-3xl p-7 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-ink-400 hover:text-ink-100 transition-colors"
          >
            <X size={20} />
          </button>
          <p className="text-base font-semibold text-ink-100 mb-2">Your task list is empty.</p>
          <p className="text-sm text-ink-400 mb-6">
            Use Brain Dump to get everything out of your head first.
          </p>
          <button
            onClick={onGoToBrainDump}
            className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
          >
            Go to Brain Dump
          </button>
        </div>
      </div>
    );
  }

  const toggleSupport = (id: string) => {
    setSupportWarning(false);
    if (supportIds.includes(id)) {
      setSupportIds(supportIds.filter((s) => s !== id));
    } else {
      if (supportIds.length >= 2) {
        setSupportWarning(true);
        return;
      }
      setSupportIds([...supportIds, id]);
    }
  };

  const toggleAdmin = (id: string) => {
    if (adminIds.includes(id)) {
      setAdminIds(adminIds.filter((a) => a !== id));
    } else {
      setAdminIds([...adminIds, id]);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      bigRockTaskId: bigRockId,
      supportTaskIds: supportIds,
      adminTaskIds: adminIds,
    });
    onClose();
  };

  const goBack = () => {
    if (step === 'big-rock-confirm') setStep('big-rock');
    else if (step === 'support') setStep('big-rock-confirm');
    else if (step === 'admin') setStep('support');
    else if (step === 'summary') setStep('admin');
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-14 pb-4 border-b border-ink-800">
        <div className="flex items-center gap-3">
          {step !== 'big-rock' && (
            <button onClick={goBack} className="text-ink-400 hover:text-ink-100 transition-colors">
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-semibold text-ink-50">Plan My Day</h1>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-100 transition-colors p-1">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6">
        {step === 'big-rock' && (
          <div>
            <h2 className="text-xl font-bold text-ink-50 mb-2">What matters most today?</h2>
            <p className="text-sm text-ink-400 mb-6">
              If you accomplish only one meaningful thing today, what should it be?
            </p>
            <div className="space-y-3">
              {eligibleBigRock.map((task) => (
                <TaskSelectCard
                  key={task.id}
                  task={task}
                  selected={bigRockId === task.id}
                  onClick={() => setBigRockId(task.id)}
                />
              ))}
            </div>
            <button
              onClick={() => setStep('big-rock-confirm')}
              disabled={!bigRockId}
              className="w-full mt-6 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'big-rock-confirm' && bigRockTask && (
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-3">
              Today's Big Rock
            </p>
            <div className="bg-ink-900 border border-ink-700 rounded-3xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-accent-400 bg-accent-500/10 px-2.5 py-1 rounded-full">
                  Big Rock
                </span>
              </div>
              <h3 className="text-lg font-bold text-ink-50 leading-snug mb-4">
                {bigRockTask.title}
              </h3>
              <div className="bg-ink-850 rounded-2xl p-4">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-ink-400 mb-1.5">
                  Next Action
                </p>
                {bigRockTask.nextAction ? (
                  <p className="text-sm text-accent-300 font-medium leading-relaxed">
                    {bigRockTask.nextAction}
                  </p>
                ) : (
                  <p className="text-sm text-amber-400 font-medium leading-relaxed">
                    Your Big Rock needs a clear next action.
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-ink-300 mb-6">
              Is this genuinely the most important thing today?
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => setStep('support')}
                className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
              >
                Yes, make it my Big Rock
              </button>
              <button
                onClick={() => setStep('big-rock')}
                className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
              >
                Choose another
              </button>
            </div>
          </div>
        )}

        {step === 'support' && (
          <div>
            <h2 className="text-xl font-bold text-ink-50 mb-2">What else needs to get done?</h2>
            <p className="text-sm text-ink-400 mb-6">
              Choose up to two supporting tasks. These should support your Big Rock or handle
              important work that cannot wait.
            </p>
            {supportWarning && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  You already have two Support Tasks. Keep today's workload realistic.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {eligibleSupport.map((task) => (
                <TaskSelectCard
                  key={task.id}
                  task={task}
                  selected={supportIds.includes(task.id)}
                  onClick={() => toggleSupport(task.id)}
                />
              ))}
              {eligibleSupport.length === 0 && (
                <p className="text-sm text-ink-500 py-4">No other eligible tasks available.</p>
              )}
            </div>
            <button
              onClick={() => setStep('admin')}
              className="w-full mt-6 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'admin' && (
          <div>
            <h2 className="text-xl font-bold text-ink-50 mb-2">What small tasks need attention?</h2>
            <p className="text-sm text-ink-400 mb-2">
              Low-energy admin tasks. Select any that need doing today.
            </p>
            <p className="text-xs text-ink-500 mb-6 italic">
              Keep admin small. These tasks should not consume your best focus hours.
            </p>
            <div className="space-y-3">
              {eligibleAdmin.map((task) => (
                <TaskSelectCard
                  key={task.id}
                  task={task}
                  selected={adminIds.includes(task.id)}
                  onClick={() => toggleAdmin(task.id)}
                  showNextAction={false}
                  showProject={false}
                />
              ))}
              {eligibleAdmin.length === 0 && (
                <p className="text-sm text-ink-500 py-4">No admin tasks available.</p>
              )}
            </div>
            <button
              onClick={() => setStep('summary')}
              className="w-full mt-6 py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'summary' && (
          <div>
            <h2 className="text-xl font-bold text-ink-50 mb-6">Your Day</h2>

            {bigRockTask && (
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent-400 mb-2">
                  Big Rock
                </p>
                <div className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-ink-100 mb-2">{bigRockTask.title}</p>
                  {bigRockTask.nextAction && (
                    <p className="text-xs text-accent-300">{bigRockTask.nextAction}</p>
                  )}
                </div>
              </div>
            )}

            {supportIds.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2">
                  Support
                </p>
                <div className="space-y-2">
                  {supportIds.map((sid) => {
                    const t = tasks.find((task) => task.id === sid);
                    return t ? (
                      <div key={sid} className="flex items-center gap-2 text-sm text-ink-200">
                        <span className="w-4 h-4 rounded border-2 border-ink-600" />
                        {t.title}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {adminIds.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2">
                  Admin
                </p>
                <div className="space-y-2">
                  {adminIds.map((aid) => {
                    const t = tasks.find((task) => task.id === aid);
                    return t ? (
                      <div key={aid} className="flex items-center gap-2 text-sm text-ink-200">
                        <span className="w-4 h-4 rounded border-2 border-ink-600" />
                        {t.title}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <p className="text-sm text-ink-400 mb-6 italic">
              Keep everything else out of today's plan.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
              >
                Confirm My Day
              </button>
              <button
                onClick={() => setStep('admin')}
                className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
