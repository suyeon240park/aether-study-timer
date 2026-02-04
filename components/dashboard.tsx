"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { BarChart3, Settings, LogOut, LogIn, Music, AlertTriangle, Lock, Youtube, ChevronDown, Palette } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useTheme } from "next-themes"
import Timer from "@/components/timer"
import LoginModal from "@/components/login-modal"
import { useStudyData } from "@/hooks/use-study-data"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import StatisticsDialog from "@/components/statistics-dialog"
import { useRouter } from "next/navigation"
import TaskManager from "@/components/task-manager"
import MusicLoader from "@/components/music-loader"
import { Switch } from "@/components/ui/switch"
import { usePreferences } from "@/hooks/use-preferences"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { auth, database } from "@/lib/firebase"
import { ref, remove } from "firebase/database"
import { deleteUser } from "firebase/auth"
import { useTimerWorker } from "@/hooks/use-timer-worker"

// Add these types at the top of the file
type TimerType = "default" | "pomodoro";
type PomodoroSettings = {
  focusTime: number;
  shortBreakTime: number;
  longBreakTime: number;
  breakInterval: number;
};

// Add default settings constant
const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusTime: 25,
  shortBreakTime: 5,
  longBreakTime: 30,
  breakInterval: 4,
};

// Audio context for reliable sound playback
let audioContext: AudioContext | null = null;
const audioBuffers: Map<string, AudioBuffer> = new Map();

// Initialize audio context on first user interaction
const initAudioContext = () => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Preload audio files
const preloadAudio = async (src: string) => {
  if (audioBuffers.has(src)) return;
  
  const ctx = initAudioContext();
  if (!ctx) return;
  
  try {
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioBuffers.set(src, audioBuffer);
  } catch (error) {
    console.error('Error preloading audio:', error);
  }
};

// Helper function to play sounds (works even in background)
const playSound = (src: string, delay: number = 0) => {
  setTimeout(() => {
    const ctx = initAudioContext();
    
    if (ctx && audioBuffers.has(src)) {
      // Use Web Audio API for reliable playback
      const source = ctx.createBufferSource();
      source.buffer = audioBuffers.get(src)!;
      source.connect(ctx.destination);
      
      // Resume context if suspended (required after tab goes to background)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => source.start(0));
      } else {
        source.start(0);
      }
    } else {
      // Fallback to Audio element
      const sound = new Audio(src);
      sound.play().catch((err) => console.error("Error playing sound:", err));
    }
  }, delay);
};

// Add this right after imports
const TimerTypeButton = ({ type, active, onClick }: { type: TimerType; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 px-4 py-2 text-sm font-medium transition-colors",
      "first:rounded-l-md last:rounded-r-md",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-transparent hover:bg-muted"
    )}
  >
    {type === "default" ? "Countdown Timer" : "Pomodoro Timer"}
  </button>
);

const THEMES = [
  { name: "light", label: "Light", color: "bg-gradient-to-br from-gray-50 to-gray-200 border border-gray-300" },
  { name: "dark", label: "Dark", color: "bg-gradient-to-br from-gray-800 to-gray-950" },
  { name: "rose", label: "Rose", color: "bg-gradient-to-br from-pink-200 to-rose-300" },
  { name: "forest", label: "Forest", color: "bg-gradient-to-br from-emerald-700 to-green-900" },
  { name: "midnight", label: "Midnight", color: "bg-gradient-to-br from-slate-800 to-indigo-950" },
  { name: "nord", label: "Nord", color: "bg-gradient-to-br from-slate-100 to-cyan-200" },
];

export default function Dashboard() {
  const { studyData, addSession, setGoal, dailyGoal, syncWithFirebase } = useStudyData();
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<"statistics" | "">("");
  const [mounted, setMounted] = useState(false);

  // Handle hydration - theme is undefined during SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Preload audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      // Initialize audio context and preload sounds
      initAudioContext();
      preloadAudio('/sounds/session-end.mp3');
      preloadAudio('/sounds/break-end.mp3');
      preloadAudio('/sounds/task-complete.mp3');
      preloadAudio('/sounds/aether-collect.mp3');
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);
  
  const {
    isLoading,
    timerType,
    setTimerType,
    pomodoroSettings,
    setPomodoroSettings,
    isMusicEnabled,
    setIsMusicEnabled,
  } = usePreferences();

  // Timer worker for accurate background timing
  const { startTimer: startWorkerTimer, stopTimer: stopWorkerTimer, isSupported: isWorkerSupported } = useTimerWorker();

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [timerElapsedTime, setTimerElapsedTime] = useState(0);
  const [timerInitialTime, setTimerInitialTime] = useState({ minutes: 25, seconds: 0 });
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [timerRestartKey, setTimerRestartKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerEndTimeRef = useRef<number | null>(null);
  const timerRef = useRef<HTMLDivElement>(null);

  const [pomodoroSession, setPomodoroSession] = useState({
    currentSession: 1,
    isBreak: false,
    totalSessions: 8, // 4 focus + 4 break sessions
  });

  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  // Refs for completion handlers to avoid stale closures in event listeners
  const completionHandlerRef = useRef<{
    handleSessionComplete: (minutes: number, skipNotification?: boolean) => Promise<void>;
    handlePomodoroSessionComplete: (minutes: number) => Promise<void>;
  } | null>(null);

  // Timer handlers
  const handleTimerStart = () => {
    // Don't allow start during transition
    if (isTransitioning) return;
    
    if (!isTimerActive) {
      // Only reset elapsed time and session start time for new sessions
      setSessionStartTime(Date.now());
      setTimerElapsedTime(0);
      timerEndTimeRef.current = null;
    } else if (isTimerPaused) {
      // When resuming from pause, just set a new end time based on remaining duration
      const remainingSeconds = timerMinutes * 60 + timerSeconds;
      timerEndTimeRef.current = Date.now() + (remainingSeconds * 1000);
    }
    setIsTimerActive(true);
    setIsTimerPaused(false);
    setTimerRestartKey(prevKey => prevKey + 1);
  };

  const handleTimerPause = () => {
    // Don't allow pause during transition
    if (isTransitioning) return;
    
    // Stop worker and interval timers
    stopWorkerTimer();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerPaused(true);
  };

  const handleTimerReset = () => {
    // Don't allow reset during transition
    if (isTransitioning) return;
    
    // Stop worker and interval timers
    stopWorkerTimer();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerActive(false);
    setIsTimerPaused(false);
    setTimerMinutes(timerInitialTime.minutes);
    setTimerSeconds(timerInitialTime.seconds);
    setTimerElapsedTime(0);
    timerEndTimeRef.current = null;
    setSessionStartTime(null);
  };

  // Handle session completion (skipSound is used when called from Pomodoro handler which plays its own sound)
  const handleSessionComplete = async (minutes: number, skipSound: boolean = false) => {
    // Play session end sound (only for countdown timer, Pomodoro plays its own)
    if (!skipSound) {
      playSound("/sounds/session-end.mp3");
    }

    // Store session data to database
    addSession(minutes);
  };

  // Handle opening statistics when not logged in
  const handleOpenStatistics = () => {
    if (!user) {
      setLoginReason("statistics");
      setLoginModalOpen(true);
      return;
    }

    // User is logged in, sync data and open statistics
    syncWithFirebase();
    setStatsOpen(true);
  };

  // Update the handlePomodoroSettingChange function
  const handlePomodoroSettingChange = (setting: keyof PomodoroSettings, value: number) => {
    // Ensure value is positive
    const validValue = Math.max(1, value);
    
    setPomodoroSettings(prev => ({
      ...prev,
      [setting]: validValue
    }));

    // If timer is not active and we're in pomodoro mode, update the current timer
    if (!isTimerActive && timerType === "pomodoro") {
      // If we're changing the focus time and we're in a focus session,
      // or if we're changing a break time and we're in a break session,
      // update the current timer
      const isBreakSetting = setting === "shortBreakTime" || setting === "longBreakTime";
      if ((isBreakSetting && pomodoroSession.isBreak) || (!isBreakSetting && !pomodoroSession.isBreak)) {
        setTimerMinutes(validValue);
        setTimerSeconds(0);
        setTimerInitialTime({ minutes: validValue, seconds: 0 });
      }
    }

    // If we're changing the break interval, update the total sessions
    if (setting === "breakInterval") {
      setPomodoroSession(prev => ({
        ...prev,
        totalSessions: validValue * 2,
      }));
    }
  };

  // Add this function to handle Pomodoro session completion
  const handlePomodoroSessionComplete = async (minutes: number) => {
    // Set transitioning flag to prevent timer updates
    setIsTransitioning(true);
    
    // Play different sounds for focus and break sessions
    if (pomodoroSession.isBreak) {
      playSound("/sounds/break-end.mp3");
    } else {
      playSound("/sounds/session-end.mp3");
      
      // Only store focus sessions (skip sound since we already played it)
      await handleSessionComplete(minutes, true);
    }

    await moveToNextSession();
  };

  const moveToNextSession = async () => {
    // Calculate next session
    const nextSession = pomodoroSession.currentSession + 1;
    if (nextSession > pomodoroSession.totalSessions) {
      // All sessions complete, reset timer to focus time
      const newState = {
        minutes: pomodoroSettings.focusTime,
        seconds: 0,
        initialTime: { minutes: pomodoroSettings.focusTime, seconds: 0 },
        session: {
          currentSession: 1,
          isBreak: false,
          totalSessions: pomodoroSettings.breakInterval * 2,
        }
      };

      // Batch state updates
      setTimerMinutes(newState.minutes);
      setTimerSeconds(newState.seconds);
      setTimerInitialTime(newState.initialTime);
      setPomodoroSession(newState.session);
      setTimerElapsedTime(0);
      setIsTimerActive(false);
      timerEndTimeRef.current = null;
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // End transition
      setIsTransitioning(false);
      return;
    }

    // Calculate next session state
    const nextIsBreak = !pomodoroSession.isBreak;
    const isLongBreak = nextIsBreak && nextSession === pomodoroSession.totalSessions;
    const nextDuration = nextIsBreak
      ? (isLongBreak ? pomodoroSettings.longBreakTime : pomodoroSettings.shortBreakTime)
      : pomodoroSettings.focusTime;

    // Prepare session state values
    const newState = {
      minutes: nextDuration,
      seconds: 0,
      initialTime: { minutes: nextDuration, seconds: 0 },
      session: {
        currentSession: nextSession,
        isBreak: nextIsBreak,
        totalSessions: pomodoroSession.totalSessions,
      }
    };

    // Clear existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Brief pause before transition - use a longer delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Now calculate the end time after the delay
    // Add a small 300ms buffer to ensure smooth start
    const endTime = Date.now() + (nextDuration * 60 * 1000) + 300;

    // Batch all state updates together
    setTimerMinutes(newState.minutes);
    setTimerSeconds(newState.seconds);
    setTimerInitialTime(newState.initialTime);
    setTimerElapsedTime(0);
    setPomodoroSession(newState.session);
    setSessionStartTime(Date.now());
    
    // Set up timer references and state
    timerEndTimeRef.current = endTime;
    
    // Add a small delay before releasing the transition state
    // This ensures the UI is fully updated before the timer starts ticking
    setTimeout(() => {
      setIsTimerPaused(false);
      setIsTimerActive(true);
      setTimerRestartKey(prevKey => prevKey + 1);
      
      // Wait a bit more before ending the transition
      setTimeout(() => {
        setIsTransitioning(false); // End transition
      }, 300);
    }, 100);
  };

  const handleSkipBreak = () => {
    if (!pomodoroSession.isBreak || isTransitioning) return;
    handlePomodoroSessionComplete(0);
  };

  // Keep completion handler ref updated to avoid stale closures
  useEffect(() => {
    completionHandlerRef.current = {
      handleSessionComplete,
      handlePomodoroSessionComplete,
    };
  });

  // Handle timer type changes
  useEffect(() => {
    handleTimerReset();
    if (timerType === "pomodoro") {
      setTimerMinutes(pomodoroSettings.focusTime);
      setTimerSeconds(0);
      setTimerInitialTime({ minutes: pomodoroSettings.focusTime, seconds: 0 });
      setPomodoroSession({
        currentSession: 1,
        isBreak: false,
        totalSessions: pomodoroSettings.breakInterval * 2,
      });
    } else {
      setTimerMinutes(25);
      setTimerSeconds(0);
      setTimerInitialTime({ minutes: 25, seconds: 0 });
    }
  }, [timerType, pomodoroSettings.breakInterval]);

  // Timer effect - uses Web Worker for accurate background timing
  useEffect(() => {
    // Skip setup during transition
    if (isTransitioning) {
      return;
    }
    
    // Clear any existing interval first to avoid duplicates
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Stop worker timer when not active
    if (!isTimerActive || isTimerPaused) {
      stopWorkerTimer();
      return;
    }

    if (isTimerActive && !isTimerPaused) {
      if (!timerEndTimeRef.current) {
        const totalSeconds = timerMinutes * 60 + timerSeconds;
        // Add a small buffer (100ms) to ensure the first tick doesn't happen too quickly
        timerEndTimeRef.current = Date.now() + (totalSeconds * 1000) + 100;
      }

      const endTime = timerEndTimeRef.current;
      const totalInitialSeconds = timerInitialTime.minutes * 60 + timerInitialTime.seconds;

      // Use Web Worker for timer (not throttled in background)
      if (isWorkerSupported) {
        startWorkerTimer(endTime, {
          onTick: (remaining: number) => {
            const newMinutes = Math.floor(remaining / 1000 / 60);
            const newSeconds = Math.floor((remaining / 1000) % 60);
            const remainingSeconds = newMinutes * 60 + newSeconds;
            const newElapsedTime = totalInitialSeconds - remainingSeconds;

            setTimerMinutes(newMinutes);
            setTimerSeconds(newSeconds);
            setTimerElapsedTime(newElapsedTime);
          },
          onComplete: () => {
            timerEndTimeRef.current = null;
            const totalMinutes = Math.floor(totalInitialSeconds / 60);
            
            // Use ref to get latest handlers to avoid stale closures
            if (completionHandlerRef.current) {
              if (timerType === "pomodoro") {
                completionHandlerRef.current.handlePomodoroSessionComplete(totalMinutes);
              } else {
                setIsTimerActive(false);
                completionHandlerRef.current.handleSessionComplete(totalMinutes);
              }
            }
          }
        });
      } else {
        // Fallback to setInterval for browsers without Worker support
        const initialDelay = setTimeout(() => {
          timerIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, timerEndTimeRef.current! - now);
            
            const newMinutes = Math.floor(remaining / 1000 / 60);
            const newSeconds = Math.floor((remaining / 1000) % 60);
            const remainingSeconds = newMinutes * 60 + newSeconds;
            const newElapsedTime = totalInitialSeconds - remainingSeconds;

            setTimerMinutes(newMinutes);
            setTimerSeconds(newSeconds);
            setTimerElapsedTime(newElapsedTime);

            if (remaining === 0) {
              clearInterval(timerIntervalRef.current as NodeJS.Timeout);
              timerIntervalRef.current = null;
              timerEndTimeRef.current = null;
              const totalMinutes = Math.floor(newElapsedTime / 60);
              
              if (completionHandlerRef.current) {
                if (timerType === "pomodoro") {
                  completionHandlerRef.current.handlePomodoroSessionComplete(totalMinutes);
                } else {
                  setIsTimerActive(false);
                  completionHandlerRef.current.handleSessionComplete(totalMinutes);
                }
              }
            }
          }, 100);
        }, 200);

        return () => {
          clearTimeout(initialDelay);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        };
      }
    }

    return () => {
      stopWorkerTimer();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerActive, isTimerPaused, timerRestartKey, isTransitioning, isWorkerSupported, startWorkerTimer, stopWorkerTimer, timerType, timerInitialTime]);

  // Handle visibility change - check if timer completed while tab was in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerEndTimeRef.current) {
        const now = Date.now();
        const remaining = timerEndTimeRef.current - now;
        
        // Get current timer state from refs to avoid stale closures
        // Note: We read isTimerActive and isTimerPaused from the closure, 
        // but they're stable since we re-attach listener when they change
        
        // If timer should have completed while in background
        if (remaining <= 0) {
          // Clear the interval
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          
          // Calculate elapsed time
          const totalInitialSeconds = timerInitialTime.minutes * 60 + timerInitialTime.seconds;
          const totalMinutes = Math.floor(totalInitialSeconds / 60);
          
          // Update display to show 0:00
          setTimerMinutes(0);
          setTimerSeconds(0);
          setTimerElapsedTime(totalInitialSeconds);
          timerEndTimeRef.current = null;
          
          // Trigger completion using ref to get latest handlers
          if (completionHandlerRef.current) {
            if (timerType === "pomodoro") {
              completionHandlerRef.current.handlePomodoroSessionComplete(totalMinutes);
            } else {
              setIsTimerActive(false);
              completionHandlerRef.current.handleSessionComplete(totalMinutes);
            }
          }
        } else if (!isTimerPaused && !isTransitioning) {
          // Update timer display to current remaining time (only if not paused)
          const newMinutes = Math.floor(remaining / 1000 / 60);
          const newSeconds = Math.floor((remaining / 1000) % 60);
          setTimerMinutes(newMinutes);
          setTimerSeconds(newSeconds);
          
          const totalInitialSeconds = timerInitialTime.minutes * 60 + timerInitialTime.seconds;
          const remainingSeconds = newMinutes * 60 + newSeconds;
          setTimerElapsedTime(totalInitialSeconds - remainingSeconds);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTimerPaused, isTransitioning, timerType, timerInitialTime]);

  // Handle successful login
  useEffect(() => {
    if (user && loginReason) {
      // User just logged in, open statistics if that's what they were trying to access
      if (loginReason === "statistics") {
        setStatsOpen(true);
      }
      setLoginReason("");
    }
  }, [user, loginReason]);

  // Handle login modal opening from music widget
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setLoginModalOpen(true);
    };

    window.addEventListener('openLoginModal', handleOpenLoginModal);
    return () => window.removeEventListener('openLoginModal', handleOpenLoginModal);
  }, []);

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // Delete user data from Firebase Realtime Database
      await remove(ref(database, `users/${user.uid}`));

      // Delete Firebase user account
      await deleteUser(auth.currentUser!);

      // Sign out and redirect to home
      await signOut();
      router.push('/');
    } catch (error) {
      console.error("Error deleting account:", error);
      // You might want to show an error message to the user here
    }
  };

  // If loading, return empty page
  if (isLoading) {
    return <div className="fixed inset-0 bg-background" />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top navigation bar */}
      <header className="flex items-center justify-between px-3 py-3 sm:px-4 sm:py-4 border-b safe-area-inset-top safe-area-inset-left safe-area-inset-right">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate text-primary">Aether Timer</h1>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Statistics Button */}
          <Button variant="ghost" size="icon" onClick={handleOpenStatistics}>
            <BarChart3 className="h-5 w-5" />
          </Button>

          {/* Settings Button */}
          <Sheet open={activeSheet === "settings"} onOpenChange={(open) => setActiveSheet(open ? "settings" : null)}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setActiveSheet("settings")}>
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full" aria-describedby="">
              <SheetTitle className="text-2xl sm:text-3xl font-bold text-primary">Settings</SheetTitle>
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="space-y-6 pt-6 px-1">
                  <div className="space-y-4">
                    {/* Authentication Section */}
                    <h4 className="text-sm font-medium mb-4">Account</h4>
                    {user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL && (
                            <img
                              src={user.photoURL || "/placeholder.svg"}
                              alt={user.displayName || "User"}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full flex items-center gap-2" 
                          onClick={async () => {
                            // Clear custom YouTube playlists from localStorage
                            localStorage.removeItem('customYoutubeChannels');
                            
                            // Trigger storage event to update music widget
                            window.dispatchEvent(new StorageEvent('storage', {
                              key: 'customYoutubeChannels',
                              newValue: null
                            }));

                            // Trigger music exit event
                            window.dispatchEvent(new CustomEvent('exitMusic'));
                            
                            // Sign out user
                            await signOut();
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        onClick={() => setLoginModalOpen(true)}
                      >
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </Button>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Daily Goal (hours)</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={dailyGoal}
                        onChange={(e) => setGoal(Number.parseInt(e.target.value) || 1)}
                        className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onFocus={(e) => e.target.select()}
                        autoFocus={false}
                      />
                      <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                  </div>

                  {/* Timer Type Section */}
                  <div className="pt-6 border-t">
                    <h4 className="text-sm font-medium mb-4">Timer Type</h4>
                    <div className="flex border rounded-md overflow-hidden">
                      <TimerTypeButton
                        type="default"
                        active={timerType === "default"}
                        onClick={() => setTimerType("default")}
                      />
                      <TimerTypeButton
                        type="pomodoro"
                        active={timerType === "pomodoro"}
                        onClick={() => setTimerType("pomodoro")}
                      />
                    </div>

                    {/* Pomodoro Settings */}
                    {timerType === "pomodoro" && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Focus Time</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="1"
                                value={pomodoroSettings.focusTime}
                                onChange={(e) => handlePomodoroSettingChange("focusTime", parseInt(e.target.value) || 1)}
                                className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                              <span className="text-sm text-muted-foreground ml-2">min</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Short Break</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="1"
                                value={pomodoroSettings.shortBreakTime}
                                onChange={(e) => handlePomodoroSettingChange("shortBreakTime", parseInt(e.target.value) || 1)}
                                className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                              <span className="text-sm text-muted-foreground ml-2">min</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Long Break</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="1"
                                value={pomodoroSettings.longBreakTime}
                                onChange={(e) => handlePomodoroSettingChange("longBreakTime", parseInt(e.target.value) || 1)}
                                className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                              <span className="text-sm text-muted-foreground ml-2">min</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1">Break Interval</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="1"
                                value={pomodoroSettings.breakInterval}
                                onChange={(e) => handlePomodoroSettingChange("breakInterval", parseInt(e.target.value) || 1)}
                                className="flex h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                              <span className="text-sm text-muted-foreground ml-2">sets</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Music Toggle */}
                  <div className="pt-6 border-t">
                    <h4 className="text-sm font-medium mb-2">Music</h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium">Background Music</h4>
                        <p className="text-sm text-muted-foreground">
                          Enable study music playlist
                        </p>
                      </div>
                      <Switch
                        checked={isMusicEnabled}
                        onCheckedChange={setIsMusicEnabled}
                      />
                    </div>
                  </div>

                  {/* Theme Selection */}
                  <div className="pt-6 border-t">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Theme
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {THEMES.map((t) => {
                        const isActive = mounted && (theme === t.name || resolvedTheme === t.name);
                        return (
                          <button
                            key={t.name}
                            onClick={() => setTheme(t.name)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-xl border-2 hover:scale-105 hover:shadow-lg",
                              isActive
                                ? "border-primary ring-2 ring-primary/30 shadow-md"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full shadow-md",
                                t.color
                              )}
                              data-no-transition
                            />
                            <span className={cn(
                              "text-xs font-medium",
                              isActive && "text-primary font-semibold"
                            )}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delete Account Section */}
                  {user && (
                    <Collapsible 
                      open={dangerZoneOpen} 
                      onOpenChange={setDangerZoneOpen}
                      className="pt-6 border-t"
                    >
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full flex items-center justify-between p-2 h-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                          <span>Advanced Settings</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${dangerZoneOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteAccountDialogOpen(true)}
                        >
                          Delete Account
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content - Timer */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div ref={timerRef}>
          <Timer
            onSessionComplete={timerType === "pomodoro" ? handlePomodoroSessionComplete : handleSessionComplete}
            minutes={timerMinutes}
            seconds={timerSeconds}
            isActive={isTimerActive}
            isPaused={isTimerPaused}
            elapsedTime={timerElapsedTime}
            initialTime={timerInitialTime}
            onStart={handleTimerStart}
            onPause={handleTimerPause}
            onReset={handleTimerReset}
            onTimeChange={(minutes, seconds) => {
              setTimerMinutes(minutes);
              setTimerSeconds(seconds);
              setTimerInitialTime({ minutes, seconds });
            }}
            timerType={timerType}
            pomodoroSession={timerType === "pomodoro" ? pomodoroSession : undefined}
            onSkipBreak={handleSkipBreak}
          />
        </div>
        <div className="mt-6 sm:mt-8 max-w-md w-full mx-auto">
          <TaskManager />
        </div>
      </div>

      {/* Music Dropdown List */}
      <MusicLoader isEnabled={isMusicEnabled} />

      {/* Statistics Dialog */}
      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        studyData={studyData}
        dailyGoal={dailyGoal}
        onGoalChange={setGoal}
      />

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        reason={loginReason}
        onLoginComplete={() => {
          if (loginReason === "statistics") {
            setStatsOpen(true);
          }
          setLoginReason("");
        }}
      />

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
