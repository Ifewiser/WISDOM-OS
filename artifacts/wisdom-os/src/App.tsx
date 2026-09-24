import { useState } from 'react';
import type { ScreenId, FocusSession } from '@/types';
import { TaskProvider, useTasks } from '@/context/TaskContext';
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
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}
