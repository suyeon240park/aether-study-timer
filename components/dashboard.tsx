"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { BarChart3, Diamond, Settings, LogOut, LogIn, Music, AlertTriangle, Lock, Youtube } from "lucide-react"
import Timer from "@/components/timer"
import LoginModal from "@/components/login-modal"
import { useStudyData } from "@/hooks/use-study-data"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import StatisticsDialog from "@/components/statistics-dialog"
import AetherDialog from "@/components/aether-dialog"
import { useRouter } from "next/navigation"
import TaskManager from "@/components/task-manager"
import MusicLoader from "@/components/music-loader"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

// Helper function to play sounds
const playSound = (src: string, delay: number = 0) => {
  setTimeout(() => {
    const sound = new Audio(src);
    sound.play().catch((err) => console.error("Error playing sound:", err));
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
    {type === "default" ? "Default Timer" : "Pomodoro Timer"}
  </button>
);

export default function Dashboard() {
  const { studyData, addSession, setGoal, dailyGoal, aethers, addAethers, syncWithFirebase } = useStudyData();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [aetherDialogOpen, setAetherDialogOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<"statistics" | "rewards" | "">("");
  
  const {
    isLoading,
    timerType,
    setTimerType,
    pomodoroSettings,
    setPomodoroSettings,
    isMusicEnabled,
    setIsMusicEnabled,
  } = usePreferences();

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

  const [aetherButtonPulse, setAetherButtonPulse] = useState(false);
  const aetherButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);

  const [pomodoroSession, setPomodoroSession] = useState({
    currentSession: 1,
    isBreak: false,
    totalSessions: 8, // 4 focus + 4 break sessions
  });

  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);

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
    
    // Store the current elapsed time when pausing
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsTimerPaused(true);
  };

  const handleTimerReset = () => {
    // Don't allow reset during transition
    if (isTransitioning) return;
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsTimerActive(false);
    setIsTimerPaused(false);
    setTimerMinutes(timerInitialTime.minutes);
    setTimerSeconds(timerInitialTime.seconds);
    setTimerElapsedTime(0);
    timerEndTimeRef.current = null;
    setSessionStartTime(null);
  };

  // Handle session completion with aether animation and sounds
  const handleSessionComplete = async (minutes: number) => {
    // Play session end sound and wait for it to finish (approximately 1 second)
    playSound("/sounds/session-end.mp3");

    // Store session data to database
    addSession(minutes);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Calculate if new aethers were earned
    const aethersEarned = Math.floor((minutes + calculateMinutesForNextAether()) / 60);

    if (aethersEarned > 0) {
      addAethers(aethersEarned);

      // Play overlapping aether collect sounds rapidly
      for (let i = 0; i < aethersEarned; i++) {
        playSound("/sounds/aether-collect.mp3", 800 + i * 400); // Play sounds with 400ms overlap
      }

      // Animate each aether earned sequentially
      for (let i = 0; i < aethersEarned; i++) {
        // Wait for previous animation to complete
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            // Trigger pulse animation only
            setAetherButtonPulse(true);
            
            // Reset pulse after animation
            setTimeout(() => {
              setAetherButtonPulse(false);
              resolve();
            }, 200);
          }, i === 0 ? 800 : 200); // Start first animation at 800ms, then space others out by 200ms
        });
      }
    }
  };

  // Calculate minutes collected for the next aether
  const calculateMinutesForNextAether = () => {
    // Get total minutes from completed sessions
    const completedMinutes = studyData.sessions.reduce((acc: number, session: { minutes: number }) => acc + session.minutes, 0);
    
    // Add current session's elapsed time if timer is active
    const currentSessionMinutes = isTimerActive ? Math.floor(timerElapsedTime / 60) : 0;
    const totalMinutes = completedMinutes + currentSessionMinutes;
    
    // Calculate minutes in current block (0-59)
    return totalMinutes % 60;
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

  // Handle opening the Aether dialog
  const handleOpenAethers = () => {
    if (!user) {
      setLoginReason("rewards");
      setLoginModalOpen(true);
      return;
    }

    // User is logged in, sync data and open Aether dialog
    syncWithFirebase();
    setAetherDialogOpen(true);
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
      // Only store focus sessions and give aethers
      await handleSessionComplete(minutes);
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

  // Timer effect
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

    if (isTimerActive && !isTimerPaused) {
      if (!timerEndTimeRef.current) {
        const totalSeconds = timerMinutes * 60 + timerSeconds;
        // Add a small buffer (100ms) to ensure the first tick doesn't happen too quickly
        timerEndTimeRef.current = Date.now() + (totalSeconds * 1000) + 100;
      }

      // Use a small initial delay before starting the interval
      // This prevents the first tick from happening too quickly
      const initialDelay = setTimeout(() => {
        timerIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const remaining = Math.max(0, timerEndTimeRef.current! - now);
          
          const newMinutes = Math.floor(remaining / 1000 / 60);
          const newSeconds = Math.floor((remaining / 1000) % 60);
          
          const totalInitialSeconds = timerInitialTime.minutes * 60 + timerInitialTime.seconds;
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
            
            if (timerType === "pomodoro") {
              handlePomodoroSessionComplete(totalMinutes);
            } else {
              setIsTimerActive(false);
              handleSessionComplete(totalMinutes);
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
  }, [isTimerActive, isTimerPaused, timerRestartKey, isTransitioning]);

  // Handle successful login
  useEffect(() => {
    if (user && loginReason) {
      // User just logged in, open statistics if that's what they were trying to access
      if (loginReason === "statistics") {
        setStatsOpen(true);
      } else if (loginReason === "rewards") {
        setAetherDialogOpen(true);
      }
      setLoginReason("");
    }
  }, [user, loginReason]);

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
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Aether Timer</h1>

        <div className="flex items-center gap-2">
          {/* Aethers (Rewards) Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={aetherButtonRef}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative transition-all duration-1000",
                    aetherButtonPulse && "animate-single-pulse"
                  )}
                  onClick={handleOpenAethers}
                >
                  <Diamond className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {aethers}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{calculateMinutesForNextAether()}/60 min to next aether</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
              <SheetTitle className="text-3xl font-bold">Settings</SheetTitle>
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
                    
                    {isMusicEnabled && (
                      <div className="mt-4 space-y-3">
                        <div className="relative space-y-2">
                          <h4 className="text-sm font-medium">Custom YouTube Playlist</h4>
                          
                          {user ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="YouTube URL (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
                                  className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  id="custom-youtube-id"
                                />
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById('custom-youtube-id') as HTMLInputElement;
                                    const url = input.value.trim();
                                    
                                    if (url) {
                                      // Extract video ID from various YouTube URL formats
                                      let videoId = '';
                                      
                                      // Handle standard youtube.com URLs
                                      const standardMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/e\/|youtube\.com\/user\/[^\/]+\/[^\/]+\/|youtube\.com\/[^\/]+\/[^\/]+\/|youtube\.com\/attribution_link\?a=.+?&(?:amp;)?u=\/watch\?v=|youtube-nocookie\.com\/watch\?v=|youtube\.com\/shorts\/)([^&?\/\s]+)/);
                                      
                                      if (standardMatch && standardMatch[1]) {
                                        videoId = standardMatch[1];
                                      }
                                      
                                      if (videoId) {
                                        const customChannels = JSON.parse(localStorage.getItem('customYoutubeChannels') || '[]');
                                        
                                        // Check if video ID already exists
                                        if (!customChannels.some((channel: any) => channel.id === videoId)) {
                                          // Default channel name
                                          let channelName = `Custom ${customChannels.length + 1}`;
                                          
                                          // Try to fetch video title using oEmbed
                                          const addChannel = (name: string) => {
                                            const newChannel = { id: videoId, name: name };
                                            customChannels.push(newChannel);
                                            localStorage.setItem('customYoutubeChannels', JSON.stringify(customChannels));
                                            
                                            // Trigger storage event for components listening in the same window
                                            window.dispatchEvent(new StorageEvent('storage', {
                                              key: 'customYoutubeChannels',
                                              newValue: JSON.stringify(customChannels)
                                            }));
                                            
                                            input.value = '';
                                          };
                                          
                                          // Try to get video title
                                          fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
                                            .then(response => {
                                              if (!response.ok) throw new Error('Failed to fetch video info');
                                              return response.json();
                                            })
                                            .then(data => {
                                              // Use video title if available
                                              if (data && data.title) {
                                                // Truncate title if too long
                                                const title = data.title.length > 25 
                                                  ? data.title.substring(0, 22) + '...' 
                                                  : data.title;
                                                addChannel(title);
                                              } else {
                                                addChannel(channelName);
                                              }
                                            })
                                            .catch(() => {
                                              // Use default name if fetching failed
                                              addChannel(channelName);
                                            });
                                        } else {
                                          alert("This YouTube video has already been added.");
                                        }
                                      } else {
                                        // Show error for invalid URL
                                        alert("Invalid YouTube URL. Please enter a valid YouTube URL.");
                                      }
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Add a YouTube video URL to create a custom study music playlist.
                              </p>
                            </div>
                          ) : (
                            <div 
                              className="relative overflow-hidden rounded-lg border border-dashed p-6 backdrop-blur-[2px]"
                              onClick={() => setLoginModalOpen(true)}
                            >
                              <div className="absolute inset-0 bg-background/80" />
                              <div className="relative flex flex-col items-center justify-center gap-2 text-center">
                                <div className="rounded-full bg-primary/10 p-3">
                                  <Lock className="h-6 w-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-sm font-medium">Unlock Custom Music</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Sign in to add unlimited YouTube music playlists to your collection
                                  </p>
                                </div>
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="mt-2"
                                >
                                  <LogIn className="mr-2 h-4 w-4" />
                                  Sign in
                                </Button>
                              </div>
                              <div className="absolute -right-6 -top-6 opacity-10">
                                <Youtube className="h-24 w-24" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete Account Section */}
                  {user && (
                    <div className="pt-6 border-t">
                      <h4 className="text-sm font-medium mb-4">Danger Zone</h4>
                      <Button
                        variant="destructive"
                        className="w-full flex items-center gap-2"
                        onClick={() => setDeleteAccountDialogOpen(true)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Delete My Account
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content - Timer */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
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
        <div className="mt-8 max-w-md w-full mx-auto">
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

      <AetherDialog
        open={aetherDialogOpen}
        onOpenChange={setAetherDialogOpen}
        studyData={studyData}
      />

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        reason={loginReason}
        onLoginComplete={() => {
          if (loginReason === "statistics") {
            setStatsOpen(true);
          } else if (loginReason === "rewards") {
            setAetherDialogOpen(true);
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
