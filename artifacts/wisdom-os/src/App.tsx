import { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { ScreenId, FocusSession } from '@/types';
import { TaskProvider, useTasks } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import BottomNav from '@/components/BottomNav';
import TodayScreen from '@/screens/TodayScreen';
import BrainDumpScreen from '@/screens/BrainDumpScreen';
import ProjectsScreen from '@/screens/ProjectsScreen';
import ReviewScreen from '@/screens/ReviewScreen';
import FocusModeScreen from '@/components/FocusModeScreen';

function AppContent() {
  const [screen, setScreen] = useState<ScreenId>('today');
  const [focusMode, setFocusMode] = useState(false);
  const { tasks, todayPlan, toggleTask, addFocusSession } = useTasks();
  const { user, signOut } = useAuth();

  const bigRockTask = todayPlan?.bigRockTaskId
    ? tasks.find((t) => t.id === todayPlan.bigRockTaskId) ?? null
    : null;

  const handleStartFocus = () => {
    if (!bigRockTask) return;
    setFocusMode(true);
  };

  const handleCompleteTask = () => {
    if (bigRockTask) {
      toggleTask(bigRockTask.id);
    }
  };

  const handleAddSession = (session: FocusSession) => {
    addFocusSession(session);
  };

  if (focusMode && bigRockTask) {
    return (
      <FocusModeScreen
        taskTitle={bigRockTask.title}
        nextAction={bigRockTask.nextAction}
        taskId={bigRockTask.id}
        onCompleteTask={handleCompleteTask}
        onExit={() => setFocusMode(false)}
        onAddSession={handleAddSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 max-w-md mx-auto relative">
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label={`Sign out ${user?.email ?? ''}`}
        title={user?.email ?? 'Sign out'}
        className="absolute right-4 top-4 z-20 rounded-xl border border-ink-800 bg-ink-900/90 p-2 text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-100"
      >
        <LogOut size={15} />
      </button>
      <main className="min-h-screen pb-20">
        {screen === 'today' && <TodayScreen onNavigate={setScreen} onStartFocus={handleStartFocus} />}
        {screen === 'brain-dump' && <BrainDumpScreen />}
        {screen === 'projects' && <ProjectsScreen />}
        {screen === 'review' && <ReviewScreen />}
      </main>

      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}

export default function App() {
  const { status, bootstrapError, retryBootstrap } = useAuth();

  if (status === 'unconfigured' || status === 'signed-out') {
    return <AuthScreen />;
  }

  if (status === 'bootstrap-error') {
    return (
      <AuthScreen
        bootstrapError={bootstrapError}
        onRetryBootstrap={retryBootstrap}
      />
    );
  }

  if (status !== 'authenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 text-center text-ink-300">
        <div>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-accent-400" />
          <p className="text-sm">Preparing your private workspace…</p>
        </div>
      </main>
    );
  }

  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}
