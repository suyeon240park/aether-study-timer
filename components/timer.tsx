"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw } from "lucide-react"
import { formatTime } from "@/lib/utils"

interface TimerProps {
  onSessionComplete: (minutes: number) => void
}

export default function Timer({ onSessionComplete }: TimerProps) {
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [inputMinutes, setInputMinutes] = useState("25")
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const endTimeRef = useRef<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [timeInput, setTimeInput] = useState("25:00")
  const inputRef = useRef<HTMLInputElement>(null)
  // Add a ref to store the initial time
  const initialTimeRef = useRef({ minutes: 25, seconds: 0 })

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

    // Store the initial time when setting new time
    initialTimeRef.current = { minutes: newMinutes, seconds: newSeconds }
    
    setMinutes(newMinutes)
    setSeconds(newSeconds)
    setInputMinutes(newMinutes.toString())
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    if (isActive && !isPaused) {
      if (!endTimeRef.current) {
        // When starting/resuming, calculate the correct end time
        const totalSeconds = minutes * 60 + seconds
        endTimeRef.current = Date.now() + totalSeconds * 1000
      }
  
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, endTimeRef.current! - now)
        
        const newMinutes = Math.floor(remaining / 1000 / 60)
        const newSeconds = Math.floor((remaining / 1000) % 60)
        
        // Calculate elapsed time based on the total initial time and remaining time
        const totalInitialSeconds = initialTimeRef.current.minutes * 60
        const newElapsedTime = Math.floor(
          (totalInitialSeconds * 1000 - remaining) / 1000
        )
  
        if (remaining === 0) {
          clearInterval(intervalRef.current as NodeJS.Timeout)
          setIsActive(false)
          endTimeRef.current = null
          const totalMinutes = Math.floor(newElapsedTime / 60)
          if (totalMinutes >= 1) {
            onSessionComplete(totalMinutes)
          }
          setMinutes(initialTimeRef.current.minutes)
          setSeconds(initialTimeRef.current.seconds)
        } else {
          setMinutes(newMinutes)
          setSeconds(newSeconds)
          setElapsedTime(newElapsedTime)
        }
      }, 100)
    }
  
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, isPaused, onSessionComplete])

  const startTimer = () => {
    if (!isActive) {
      setSessionStartTime(Date.now())
      setElapsedTime(0)
      endTimeRef.current = null
    }
    setIsActive(true)
    setIsPaused(false)
  }

  const pauseTimer = () => {
    setIsPaused(true)
    const now = Date.now()
    const remaining = Math.max(0, endTimeRef.current! - now)
    const totalSeconds = initialTimeRef.current.minutes * 60
    const newElapsedTime = Math.floor((totalSeconds * 1000 - remaining) / 1000)
    setElapsedTime(newElapsedTime)
    endTimeRef.current = null
  }

  const resetTimer = () => {
    clearInterval(intervalRef.current as NodeJS.Timeout)
    setIsActive(false)
    setIsPaused(false)
    // Reset to initial time instead of input minutes
    setMinutes(initialTimeRef.current.minutes)
    setSeconds(initialTimeRef.current.seconds)
    setElapsedTime(0)
    endTimeRef.current = null

    if (sessionStartTime && elapsedTime > 0) {
      const totalMinutes = Math.floor(elapsedTime / 60)
      if (totalMinutes >= 1) {
        onSessionComplete(totalMinutes)
      }
    }
    setSessionStartTime(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value)) {
      setInputMinutes(value)
      if (!isActive) {
        const newMinutes = Number.parseInt(value) || 0
        setMinutes(newMinutes)
        // Update initial time when input changes
        initialTimeRef.current = { minutes: newMinutes, seconds: 0 }
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
          <Button onClick={startTimer} size="lg" className="gap-2 h-14 px-8 text-lg">
            <Play className="h-6 w-6" />
            {isPaused ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button onClick={pauseTimer} size="lg" variant="outline" className="gap-2 h-14 px-8 text-lg">
            <Pause className="h-6 w-6" />
            Pause
          </Button>
        )}
        <Button onClick={resetTimer} size="lg" variant="outline" className="gap-2 h-14 px-8 text-lg">
          <RotateCcw className="h-6 w-6" />
          Reset
        </Button>
      </div>

      {isActive && (
        <div className="mt-12 w-full max-w-md">
          <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-1000 ease-linear"
              style={{
                width: `${(elapsedTime / (initialTimeRef.current.minutes * 60)) * 100}%`,
              }}
            >
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
