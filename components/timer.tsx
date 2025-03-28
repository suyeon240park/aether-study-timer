"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw } from "lucide-react"
import { formatTime } from "@/lib/utils"

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
}

export default function Timer({
  onSessionComplete,
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
}: TimerProps) {
  const [inputMinutes, setInputMinutes] = useState("25")
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value)) {
      setInputMinutes(value)
      if (!isActive) {
        const newMinutes = Number.parseInt(value) || 0
        onTimeChange(newMinutes, 0)
      }
    }
  }

  return (
    <div className="flex flex-col items-center max-w-md w-full mx-auto">
      <div className="mb-12">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={timeInput}
            onChange={handleTimeInputChange}
            onBlur={handleTimeInputBlur}
            onKeyDown={handleTimeInputKeyDown}
            className="text-9xl font-bold tabular-nums text-primary bg-transparent border-b border-primary text-center w-full focus:outline-none"
            disabled={isActive}
          />
        ) : (
          <div
            className="text-9xl font-bold tabular-nums text-primary cursor-pointer"
            onClick={() => !isActive && setIsEditing(true)}
          >
            {formatTime(minutes, seconds)}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {!isActive || isPaused ? (
          <Button onClick={onStart} size="lg" className="gap-2 h-14 px-8 text-lg">
            <Play className="h-6 w-6" />
            {isPaused ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button onClick={onPause} size="lg" variant="outline" className="gap-2 h-14 px-8 text-lg">
            <Pause className="h-6 w-6" />
            Pause
          </Button>
        )}
        <Button onClick={onReset} size="lg" variant="outline" className="gap-2 h-14 px-8 text-lg">
          <RotateCcw className="h-6 w-6" />
          Reset
        </Button>
      </div>

      {isActive && (
        <div className="mt-8 w-full max-w-md">
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
