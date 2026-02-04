"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw } from "lucide-react"
import { formatTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface TimerProps {
  onSessionComplete: (minutes: number) => void
  minutes: number
  seconds: number
  isActive: boolean
  isPaused: boolean
  elapsedTime: number
  initialTime: { minutes: number; seconds: number }
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onTimeChange: (minutes: number, seconds: number) => void
  timerType?: "default" | "pomodoro"
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
  onTimeChange,
  timerType = "default",
  pomodoroSession,
  onSkipBreak,
}: TimerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [timeInput, setTimeInput] = useState("25:00")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditing) {
      setTimeInput(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }
  }, [minutes, seconds, isEditing])

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^[\d:]*$/.test(value)) {
      setTimeInput(value)
    }
  }

  const handleTimeInputBlur = () => {
    saveTimeInput()
  }

  const handleTimeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveTimeInput()
    }
  }

  const saveTimeInput = () => {
    setIsEditing(false)

    const parts = timeInput.split(":")
    let newMinutes = 0
    let newSeconds = 0

    if (parts.length === 2) {
      newMinutes = Number.parseInt(parts[0]) || 0
      newSeconds = Number.parseInt(parts[1]) || 0

      if (newSeconds >= 60) {
        newMinutes += Math.floor(newSeconds / 60)
        newSeconds = newSeconds % 60
      }
    } else if (parts.length === 1) {
      newMinutes = Number.parseInt(parts[0]) || 0
    }

    onTimeChange(newMinutes, newSeconds)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

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
        {isEditing && timerType === "default" ? (
          <input
            ref={inputRef}
            type="text"
            value={timeInput}
            onChange={handleTimeInputChange}
            onBlur={handleTimeInputBlur}
            onKeyDown={handleTimeInputKeyDown}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tabular-nums text-primary bg-transparent border-b border-primary text-center w-full focus:outline-none"
            disabled={isActive}
          />
        ) : (
          <div
            className={cn(
              "text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tabular-nums text-primary",
              timerType === "default" && !isActive && "cursor-pointer"
            )}
            onClick={() => timerType === "default" && !isActive && setIsEditing(true)}
          >
            {formatTime(minutes, seconds)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4">
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
        <Button onClick={onReset} size="lg" variant="outline" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
          <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
          Reset
        </Button>
        {timerType === "pomodoro" && pomodoroSession?.isBreak && onSkipBreak && (
          <Button onClick={onSkipBreak} size="lg" variant="outline" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg">
            Skip
          </Button>
        )}
      </div>

      {isActive && (
        <div className="mt-6 sm:mt-8 w-full max-w-md">
          <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(elapsedTime / (initialTime.minutes * 60)) * 100}%`,
              }}
            >
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
