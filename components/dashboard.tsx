"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { BarChart3, Diamond, Settings, LogOut, LogIn } from "lucide-react"
import Timer from "@/components/timer"
import Rewards from "@/components/rewards"
import AetherAnimation from "@/components/aether-animation"
import LoginModal from "@/components/login-modal"
import { useStudyData } from "@/hooks/use-study-data"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import StatisticsDialog from "@/components/statistics-dialog"
import TaskManager from "@/components/task-manager"

// Helper function to play sounds
const playSound = (src: string, delay = 0) => {
  setTimeout(() => {
    const sound = new Audio(src)
    sound.play().catch((err) => console.error("Error playing sound:", err))
  }, delay)
}

export default function Dashboard() {
  const { studyData, addSession, setGoal, dailyGoal, aethers, addAethers, syncWithFirebase } = useStudyData()
  const { user, signOut } = useAuth()

  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [showAetherAnimation, setShowAetherAnimation] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<"statistics" | "rewards" | "">("")

  const [aetherAnimationProps, setAetherAnimationProps] = useState({
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 },
    aetherCount: 0,
  })

  const aetherButtonRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<HTMLDivElement>(null)

  // Handle session completion with aether animation and sounds
  const handleSessionComplete = async (minutes: number) => {
    // Play session end sound immediately
    playSound("/sounds/session-end.mp3")

    // First, add the session to the data
    await addSession(minutes)

    // Calculate if new aethers were earned
    const aethersEarned = Math.floor(minutes / 30)

    if (aethersEarned > 0) {
      // Add aethers to the database
      await addAethers(aethersEarned)

      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        if (timerRef.current && aetherButtonRef.current) {
          const timerRect = timerRef.current.getBoundingClientRect()
          const aetherButtonRect = aetherButtonRef.current.getBoundingClientRect()

          setAetherAnimationProps({
            startPosition: {
              x: timerRect.left + timerRect.width / 2,
              y: timerRect.top + timerRect.height / 2,
            },
            endPosition: {
              x: aetherButtonRect.left + aetherButtonRect.width / 2,
              y: aetherButtonRect.top + aetherButtonRect.height / 2,
            },
            aetherCount: aethersEarned,
          })

          // Trigger animation after positions are set
          setShowAetherAnimation(true)

          // Play aether collect sounds with natural overlap
          for (let i = 0; i < aethersEarned; i++) {
            playSound("/sounds/aether-collect.mp3", 500 + i * 200)
          }
        }
      })
    }
  }

  // Pulse animation for aether button when new aethers are added
  const [aetherButtonPulse, setAetherButtonPulse] = useState(false)

  useEffect(() => {
    if (showAetherAnimation) {
      // Prepare for pulse animation when aethers arrive
      setTimeout(() => {
        setAetherButtonPulse(true)

        // Reset pulse after animation
        setTimeout(() => {
          setAetherButtonPulse(false)
        }, 1000)
      }, 1500) // Time for aethers to arrive
    }
  }, [showAetherAnimation])

  // Handle opening statistics or rewards when not logged in
  const handleOpenFeature = (feature: "statistics" | "rewards") => {
    if (!user) {
      setLoginReason(feature)
      setLoginModalOpen(true)
      return
    }

    // User is logged in, sync data and open the feature
    syncWithFirebase()

    if (feature === "statistics") {
      setStatsOpen(true)
    } else {
      setActiveSheet("rewards")
    }
  }

  // Handle successful login
  useEffect(() => {
    if (user && loginReason) {
      // User just logged in, open the feature they were trying to access
      if (loginReason === "statistics") {
        setStatsOpen(true)
      } else if (loginReason === "rewards") {
        setActiveSheet("rewards")
      }
      setLoginReason("")
    }
  }, [user, loginReason])

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top navigation bar */}
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Focus Timer</h1>

        <div className="flex items-center gap-2">
          {/* Aethers (Rewards) Button */}
          <Sheet
            open={activeSheet === "rewards"}
            onOpenChange={(open) => (open ? handleOpenFeature("rewards") : setActiveSheet(null))}
          >
            <SheetTrigger asChild>
              <Button
                ref={aetherButtonRef}
                variant="ghost"
                size="icon"
                className={cn("relative transition-all duration-300", aetherButtonPulse && "animate-pulse scale-110")}
                onClick={() => handleOpenFeature("rewards")}
              >
                <Diamond className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {aethers}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetTitle>Aethers</SheetTitle>
              <Rewards studyData={studyData} />
            </SheetContent>
          </Sheet>

          {/* Statistics Button */}
          <StatisticsDialog
            open={statsOpen}
            onOpenChange={(open) => (open ? handleOpenFeature("statistics") : setStatsOpen(false))}
            studyData={studyData}
            dailyGoal={dailyGoal}
            onGoalChange={setGoal}
          />
          <Button variant="ghost" size="icon" onClick={() => handleOpenFeature("statistics")}>
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
              <SheetTitle>Settings</SheetTitle>
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
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content - Timer */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div ref={timerRef}>
          <Timer onSessionComplete={handleSessionComplete} />
        </div>
        <TaskManager />
      </div>

      {/* Aether animation */}
      {showAetherAnimation && (
        <AetherAnimation
          startPosition={aetherAnimationProps.startPosition}
          endPosition={aetherAnimationProps.endPosition}
          aetherCount={aetherAnimationProps.aetherCount}
          onComplete={() => setShowAetherAnimation(false)}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        title={
          loginReason === "statistics"
            ? "Sign in to view statistics"
            : loginReason === "rewards"
              ? "Sign in to view ethers"
              : "Sign in to your account"
        }
        description={
          loginReason
            ? "Sign in to save your progress and access all features."
            : "Sign in to sync your study data across devices."
        }
      />
    </div>
  )
}

