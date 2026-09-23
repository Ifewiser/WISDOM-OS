import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Pause, Play, Square, AlertTriangle, Check } from 'lucide-react';
import type { ActiveFocusSession, TimerState, FocusSession } from '@/types';
import { getTodayDate } from '@/types';
import { loadActiveFocusSession, saveActiveFocusSession } from '@/storage';

interface FocusModeScreenProps {
  taskTitle: string;
  nextAction: string;
  taskId: string;
  onCompleteTask: () => void;
  onExit: () => void;
  onAddSession: (session: FocusSession) => void;
}

type View = 'duration' | 'timer' | 'completed' | 'procrastination' | 'five-min' | 'five-min-done';

const DURATIONS = [
  { label: '25 MIN', value: 25 * 60 },
  { label: '50 MIN', value: 50 * 60 },
  { label: '90 MIN', value: 90 * 60 },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

let sessionCounter = 0;
function generateSessionId(): string {
  sessionCounter += 1;
  return `fs-${Date.now()}-${sessionCounter}`;
}

export default function FocusModeScreen({
  taskTitle,
  nextAction,
  taskId,
  onCompleteTask,
  onExit,
  onAddSession,
}: FocusModeScreenProps) {
  const [view, setView] = useState<View>('duration');
  const [timerState, setTimerState] = useState<TimerState>('IDLE');
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const endTimeRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>('');
  const startedAtRef = useRef<number>(0);

  // Restore active session on mount
  useEffect(() => {
    const stored = loadActiveFocusSession();
    if (stored && stored.state !== 'COMPLETED' && stored.state !== 'ENDED') {
      sessionIdRef.current = stored.id;
      setDuration(stored.duration);
      startedAtRef.current = stored.startedAt;

      if (stored.state === 'PAUSED' && stored.pausedRemaining !== null) {
        pausedRemainingRef.current = stored.pausedRemaining;
        setRemaining(stored.pausedRemaining);
        setTimerState('PAUSED');
        setView('timer');
      } else {
        const now = Date.now();
        const rem = stored.endTime - now;
        if (rem <= 0) {
          // Session should be completed
          setRemaining(0);
          setTimerState('COMPLETED');
          setView('completed');
          saveActiveFocusSession(null);
        } else {
          endTimeRef.current = stored.endTime;
          setRemaining(Math.ceil(rem / 1000));
          setTimerState('RUNNING');
          setView('timer');
        }
      }
    }
  }, []);

  // Timer tick
  const tick = useCallback(() => {
    if (timerState !== 'RUNNING') return;
    const rem = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(rem);
    if (rem <= 0) {
      setTimerState('COMPLETED');
      setView('completed');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Save session
      const session: FocusSession = {
        id: sessionIdRef.current,
        taskId,
        duration,
        startedAt: new Date(startedAtRef.current).toISOString(),
        endedAt: new Date().toISOString(),
        status: 'COMPLETED',
      };
      onAddSession(session);
      saveActiveFocusSession(null);
    }
  }, [timerState, duration, taskId, onAddSession]);

  useEffect(() => {
    if (timerState === 'RUNNING') {
      intervalRef.current = setInterval(tick, 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState, tick]);

  // Persist active session
  const persistSession = useCallback((state: TimerState, pausedRem: number | null = null) => {
    if (state === 'IDLE') {
      saveActiveFocusSession(null);
      return;
    }
    const session: ActiveFocusSession = {
      id: sessionIdRef.current,
      taskId,
      taskTitle,
      nextAction,
      duration,
      startedAt: startedAtRef.current,
      endTime: endTimeRef.current,
      state,
      pausedRemaining: pausedRem,
    };
    saveActiveFocusSession(session);
  }, [taskId, taskTitle, nextAction, duration]);

  // Visibility change — recalculate
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState === 'RUNNING') {
        const rem = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setRemaining(rem);
        if (rem <= 0) {
          setTimerState('COMPLETED');
          setView('completed');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState]);

  const startSession = (dur: number) => {
    setDuration(dur);
    setRemaining(dur);
    sessionIdRef.current = generateSessionId();
    startedAtRef.current = Date.now();
    endTimeRef.current = Date.now() + dur * 1000;
    setTimerState('RUNNING');
    setView('timer');
    persistSession('RUNNING');
  };

  const handlePause = () => {
    const rem = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    pausedRemainingRef.current = rem;
    setRemaining(rem);
    setTimerState('PAUSED');
    persistSession('PAUSED', rem);
  };

  const handleResume = () => {
    const rem = pausedRemainingRef.current ?? remaining;
    endTimeRef.current = Date.now() + rem * 1000;
    pausedRemainingRef.current = null;
    setTimerState('RUNNING');
    persistSession('RUNNING');
  };

  const handleEndSession = () => {
    setShowEndConfirm(true);
  };

  const confirmEndSession = () => {
    setShowEndConfirm(false);
    setTimerState('ENDED');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const session: FocusSession = {
      id: sessionIdRef.current,
      taskId,
      duration,
      startedAt: new Date(startedAtRef.current).toISOString(),
      endedAt: new Date().toISOString(),
      status: 'ENDED',
    };
    onAddSession(session);
    saveActiveFocusSession(null);
    onExit();
  };

  const handleDone = () => {
    onCompleteTask();
    saveActiveFocusSession(null);
    onExit();
  };

  const handleContinueWorking = () => {
    setTimerState('IDLE');
    setView('duration');
    setRemaining(0);
    saveActiveFocusSession(null);
  };

  // Five-minute reset
  const [fiveMinRemaining, setFiveMinRemaining] = useState(300);
  const fiveMinEndRef = useRef<number>(0);
  const fiveMinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startFiveMinutes = () => {
    setFiveMinRemaining(300);
    fiveMinEndRef.current = Date.now() + 300 * 1000;
    setView('five-min');
    fiveMinIntervalRef.current = setInterval(() => {
      const rem = Math.max(0, Math.ceil((fiveMinEndRef.current - Date.now()) / 1000));
      setFiveMinRemaining(rem);
      if (rem <= 0) {
        if (fiveMinIntervalRef.current) {
          clearInterval(fiveMinIntervalRef.current);
          fiveMinIntervalRef.current = null;
        }
        setView('five-min-done');
      }
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (fiveMinIntervalRef.current) {
        clearInterval(fiveMinIntervalRef.current);
      }
    };
  }, []);

  // DURATION VIEW
  if (view === 'duration') {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <div className="flex items-center gap-2 text-accent-400">
            <Timer size={18} />
            <span className="text-sm font-semibold tracking-widest uppercase">Focus Mode</span>
          </div>
          <button onClick={onExit} className="text-ink-400 hover:text-ink-100 transition-colors p-1">
            <Square size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-5 pb-10">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2">
              Big Rock
            </p>
            <p className="text-lg font-semibold text-ink-50 leading-snug mb-5">{taskTitle}</p>
            <div className="bg-ink-900 border border-ink-700 rounded-2xl p-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-ink-400 mb-1.5">
                Next Action
              </p>
              <p className="text-base text-accent-300 font-medium leading-relaxed">
                {nextAction || 'Define the next physical action.'}
              </p>
            </div>
          </div>

          <p className="text-base text-ink-200 font-medium mb-4">How long do you want to focus?</p>
          <div className="space-y-3">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => startSession(d.value)}
                className="w-full py-5 rounded-2xl bg-ink-900 border border-ink-700 text-ink-100 font-bold text-lg tracking-widest hover:border-accent-500 hover:text-accent-300 transition-colors"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TIMER VIEW
  if (view === 'timer') {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
        {showEndConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-5 bg-ink-950/90 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-ink-900 border border-ink-700 rounded-3xl p-6 text-center">
              <p className="text-base font-semibold text-ink-50 mb-2">End this focus session?</p>
              <p className="text-sm text-ink-400 mb-6">You still have time remaining.</p>
              <div className="space-y-2.5">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
                >
                  Keep Focusing
                </button>
                <button
                  onClick={confirmEndSession}
                  className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <div className="flex items-center gap-2 text-accent-400">
            <Timer size={18} />
            <span className="text-sm font-semibold tracking-widest uppercase">Focus Mode</span>
          </div>
          {timerState === 'PAUSED' && (
            <span className="text-sm text-ink-400 font-medium">Focus paused.</span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
          {/* Timer */}
          <div className="mb-10">
            <p
              className="text-6xl font-bold text-ink-50 tabular-nums tracking-tight text-center"
              aria-label={`Time remaining: ${formatTime(remaining)}`}
            >
              {formatTime(remaining)}
            </p>
          </div>

          {/* Task info */}
          <div className="w-full mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-2">
              Big Rock
            </p>
            <p className="text-sm font-medium text-ink-200 leading-snug mb-4">{taskTitle}</p>
            <div className="bg-ink-900 border border-ink-700 rounded-2xl p-3.5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-ink-400 mb-1">
                Next Action
              </p>
              <p className="text-sm text-accent-300 font-medium leading-relaxed">
                {nextAction || 'Define the next physical action.'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full space-y-3">
            {timerState === 'RUNNING' && (
              <button
                onClick={handlePause}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-ink-800 text-ink-100 font-semibold text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
              >
                <Pause size={18} />
                Pause
              </button>
            )}
            {timerState === 'PAUSED' && (
              <button
                onClick={handleResume}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
              >
                <Play size={18} fill="currentColor" />
                Resume
              </button>
            )}
            <button
              onClick={handleEndSession}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-ink-800 text-ink-400 font-medium text-sm border border-ink-700 hover:text-ink-200 transition-colors"
            >
              <Square size={16} />
              End Session
            </button>

            {/* Procrastination button */}
            <button
              onClick={() => setView('procrastination')}
              className="w-full py-3 text-xs text-ink-500 hover:text-ink-300 transition-colors mt-4"
            >
              I'm about to procrastinate
            </button>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED VIEW
  if (view === 'completed') {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
          <div className="w-16 h-16 rounded-full bg-accent-500/10 border border-accent-500/30 flex items-center justify-center mb-6">
            <Check size={32} className="text-accent-400" />
          </div>
          <h2 className="text-2xl font-bold text-ink-50 mb-2">Focus session complete.</h2>
          <p className="text-sm text-ink-400 mb-8">You showed up. That's the win.</p>

          <div className="w-full bg-ink-900 border border-ink-700 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-ink-400">Session</p>
              <p className="text-sm font-bold text-ink-100">{Math.round(duration / 60)} Minutes</p>
            </div>
            <div className="h-px bg-ink-700 mb-4" />
            <div className="mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1">Task</p>
              <p className="text-sm font-medium text-ink-100">{taskTitle}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1">
                Next Action
              </p>
              <p className="text-sm text-accent-300 font-medium leading-relaxed">
                {nextAction || 'Define the next physical action.'}
              </p>
            </div>
          </div>

          <div className="w-full space-y-2.5">
            <button
              onClick={handleDone}
              className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleContinueWorking}
              className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
            >
              Continue Working
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PROCRASTINATION VIEW
  if (view === 'procrastination') {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-3xl font-bold text-ink-50 mb-6 tracking-wide">STOP.</h2>

          <p className="text-sm text-ink-300 mb-6 text-center">
            What were you supposed to be doing?
          </p>

          <div className="w-full bg-ink-900 border border-ink-700 rounded-2xl p-5 mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1.5">
              You were doing
            </p>
            <p className="text-sm font-semibold text-ink-100 mb-4">{taskTitle}</p>
            <div className="h-px bg-ink-700 mb-4" />
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1.5">
              Next
            </p>
            <p className="text-sm text-accent-300 font-medium leading-relaxed">
              {nextAction || 'Define the next physical action.'}
            </p>
          </div>

          <div className="w-full">
            <p className="text-sm text-ink-200 text-center mb-4">
              Do the next action for just 5 minutes.
            </p>
            <button
              onClick={startFiveMinutes}
              className="w-full py-4 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
            >
              Start 5 Minutes
            </button>
            <button
              onClick={() => setView('timer')}
              className="w-full py-3 mt-3 text-sm text-ink-500 hover:text-ink-300 transition-colors"
            >
              Go back to focus
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FIVE-MINUTE RESET
  if (view === 'five-min') {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
          <p className="text-6xl font-bold text-ink-50 tabular-nums tracking-tight mb-10">
            {formatTime(fiveMinRemaining)}
          </p>

          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-ink-100 mb-2">Just 5 minutes.</p>
            <p className="text-sm text-ink-400 leading-relaxed">
              Do not optimize.
              <br />
              Do not research.
              <br />
              Do not switch tasks.
              <br />
              Just begin.
            </p>
          </div>

          <div className="w-full">
            <p className="text-xs text-ink-500 text-center mb-4">
              {nextAction || 'Define the next physical action.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // FIVE-MINUTE DONE
  if (view === 'five-min-done') {
    return (
      <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
          <div className="w-16 h-16 rounded-full bg-accent-500/10 border border-accent-500/30 flex items-center justify-center mb-6">
            <Check size={32} className="text-accent-400" />
          </div>
          <h2 className="text-2xl font-bold text-ink-50 mb-2">You started.</h2>
          <p className="text-sm text-ink-400 mb-8">Continue?</p>

          <div className="w-full space-y-2.5">
            <button
              onClick={() => setView('timer')}
              className="w-full py-3.5 rounded-2xl bg-accent-500 text-ink-950 font-semibold text-sm hover:bg-accent-400 transition-colors"
            >
              Continue Focus
            </button>
            <button
              onClick={onExit}
              className="w-full py-3.5 rounded-2xl bg-ink-800 text-ink-100 font-medium text-sm border border-ink-700 hover:bg-ink-700 transition-colors"
            >
              Take a Break
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
