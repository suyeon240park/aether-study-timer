"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { BarChart3, Diamond, Settings, LogOut, LogIn, Music } from "lucide-react"
import Timer from "@/components/timer"
import LoginModal from "@/components/login-modal"
import { useStudyData } from "@/hooks/use-study-data"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import StatisticsDialog from "@/components/statistics-dialog"
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

// Helper function to play sounds
const playSound = (src: string, delay: number = 0) => {
  setTimeout(() => {
    const sound = new Audio(src);
    sound.play().catch((err) => console.error("Error playing sound:", err));
  }, delay);
};

export default function Dashboard() {
  const { studyData, addSession, setGoal, dailyGoal, aethers, addAethers, syncWithFirebase } = useStudyData();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<"statistics" | "rewards" | "">("");
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [timerElapsedTime, setTimerElapsedTime] = useState(0);
  const [timerInitialTime, setTimerInitialTime] = useState({ minutes: 25, seconds: 0 });
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerEndTimeRef = useRef<number | null>(null);

  const [aetherButtonPulse, setAetherButtonPulse] = useState(false);
  const aetherButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);

  const [currentAethers, setCurrentAethers] = useState(0);

  useEffect(() => {
    setCurrentAethers(aethers);
  }, [aethers]);

  // Timer effect
  useEffect(() => {
    if (isTimerActive && !isTimerPaused) {
      if (!timerEndTimeRef.current) {
        const totalSeconds = timerMinutes * 60 + timerSeconds;
        timerEndTimeRef.current = Date.now() + totalSeconds * 1000;
      }

      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, timerEndTimeRef.current! - now);
        
        const newMinutes = Math.floor(remaining / 1000 / 60);
        const newSeconds = Math.floor((remaining / 1000) % 60);
        
        const totalInitialSeconds = timerInitialTime.minutes * 60 + timerInitialTime.seconds;
        const remainingSeconds = newMinutes * 60 + newSeconds;
        const newElapsedTime = totalInitialSeconds - remainingSeconds;

        if (remaining === 0) {
          clearInterval(timerIntervalRef.current as NodeJS.Timeout);
          setIsTimerActive(false);
          timerEndTimeRef.current = null;
          const totalMinutes = Math.floor(newElapsedTime / 60);
          handleSessionComplete(totalMinutes);
          // Reset to initial time when timer completes
          setTimerMinutes(timerInitialTime.minutes);
          setTimerSeconds(timerInitialTime.seconds);
          setTimerElapsedTime(0);
        } else {
          setTimerMinutes(newMinutes);
          setTimerSeconds(newSeconds);
          setTimerElapsedTime(newElapsedTime);
        }
      }, 100);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, isTimerPaused]);

  // Timer handlers
  const handleTimerStart = () => {
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
  };

  const handleTimerPause = () => {
    // Store the current elapsed time when pausing
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsTimerPaused(true);
  };

  const handleTimerReset = () => {
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

  const handleTimerTimeChange = (minutes: number, seconds: number) => {
    setTimerMinutes(minutes);
    setTimerSeconds(seconds);
    setTimerInitialTime({ minutes, seconds });
  };

  // Handle session completion with aether animation and sounds
  const handleSessionComplete = async (minutes: number) => {
    // Play session end sound and wait for it to finish (approximately 1 second)
    playSound("/sounds/session-end.mp3");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // First, add the session to the data
    await addSession(minutes);

    // Calculate if new aethers were earned
    const aethersEarned = Math.floor((minutes + calculateMinutesForNextAether()) / 30);

    if (aethersEarned > 0) {
      // Add aethers to the database
      await addAethers(aethersEarned);

      // Play overlapping aether collect sounds rapidly
      for (let i = 0; i < aethersEarned; i++) {
        playSound("/sounds/aether-collect.mp3", 800 + i * 400); // Play sounds with 400ms overlap
      }

      // Animate each aether earned sequentially
      for (let i = 0; i < aethersEarned; i++) {
        // Wait for previous animation to complete
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            // Update the displayed aether count
            setCurrentAethers(prev => prev + 1);
            
            // Trigger pulse animation
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
    
    // Calculate minutes in current block (0-29)
    return totalMinutes % 30;
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
                >
                  <Diamond className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {currentAethers}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{calculateMinutesForNextAether()}/30 min to next aether</p>
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
            <SheetContent className="w-full sm:max-w-md">
              <SheetTitle className="text-3xl font-bold">Settings</SheetTitle>
              <SheetDescription>
                Customize your study experience and manage your account
              </SheetDescription>
              <div className="space-y-6 pt-6">
                <div className="space-y-4">
                  {/* Authentication Section */}
                  <div className="pt-4 border-t">
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
                        <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => signOut()}>
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

                  {/* Music Toggle - Moved to bottom */}
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content - Timer */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div ref={timerRef}>
          <Timer
            onSessionComplete={handleSessionComplete}
            minutes={timerMinutes}
            seconds={timerSeconds}
            isActive={isTimerActive}
            isPaused={isTimerPaused}
            elapsedTime={timerElapsedTime}
            initialTime={timerInitialTime}
            onStart={handleTimerStart}
            onPause={handleTimerPause}
            onReset={handleTimerReset}
            onTimeChange={handleTimerTimeChange}
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

      {/* Login Modal */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}
