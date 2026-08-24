"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, Pause, Play, RotateCcw } from "lucide-react"
import { cn, formatTime } from "@/lib/utils"

interface TimerProps {
  minutes: number
  seconds: number
  isActive: boolean
  isPaused: boolean
  elapsedTime: number
  initialTime: { minutes: number; seconds: number }
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onFinish?: () => void
  timerType?: "stopwatch" | "pomodoro"
  pomodoroSession?: {
    currentSession: number
    isBreak: boolean
    totalSessions: number
  }
  onSkipBreak?: () => void
}

export default function Timer({
  minutes,
  seconds,
  isActive,
  isPaused,
  elapsedTime,
  initialTime,
  onStart,
  onPause,
  onReset,
  onFinish,
  timerType = "stopwatch",
  pomodoroSession,
  onSkipBreak,
}: TimerProps) {
  const isStopwatch = timerType === "stopwatch"
  const initialSeconds = initialTime.minutes * 60 + initialTime.seconds
  const progress = initialSeconds > 0 ? Math.min(100, (elapsedTime / initialSeconds) * 100) : 0

  return (
    <div className="flex flex-col items-center max-w-md w-full mx-auto px-4">
      {timerType === "pomodoro" && pomodoroSession && (
        <div className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-primary">
          {pomodoroSession.isBreak
            ? `Break ${Math.ceil(pomodoroSession.currentSession / 2)}/${pomodoroSession.totalSessions / 2}`
            : `Focus ${Math.ceil(pomodoroSession.currentSession / 2)}/${pomodoroSession.totalSessions / 2}`}
        </div>
      )}

      <div className="mb-8 sm:mb-10 md:mb-12">
        <div
          className={cn(
            "text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tabular-nums text-primary",
            isStopwatch && "select-none"
          )}
        >
          {formatTime(minutes, seconds)}
        </div>
      </div>

      <div className="flex flex-wrap md:flex-nowrap justify-center gap-2 sm:gap-3 md:gap-4">
        {!isActive || isPaused ? (
          <Button onClick={onStart} size="lg" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
            <Play className="h-5 w-5 sm:h-6 sm:w-6" />
            {isPaused ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button onClick={onPause} size="lg" variant="outline" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
            <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
            Pause
          </Button>
        )}

        {isStopwatch ? (
          <Button
            onClick={onFinish}
            size="lg"
            variant="outline"
            disabled={!isActive && elapsedTime === 0}
            className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg"
          >
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
            Finish
          </Button>
        ) : (
          <Button onClick={onReset} size="lg" variant="outline" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
            <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
            Reset
          </Button>
        )}

        {timerType === "pomodoro" && pomodoroSession?.isBreak && onSkipBreak && (
          <Button onClick={onSkipBreak} size="lg" variant="outline" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
            Skip
          </Button>
        )}
      </div>

      {timerType === "pomodoro" && isActive && (
        <div className="mt-6 sm:mt-8 w-full max-w-md">
          <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
