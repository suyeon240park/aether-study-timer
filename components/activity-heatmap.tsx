"use client"

import { useState, useEffect } from "react"
import type { StudySession } from "@/types/study"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ActivityHeatmapProps {
  sessions: StudySession[]
}

export default function ActivityHeatmap({ sessions }: ActivityHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<{ [key: string]: number }>({})
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    // Group sessions by day and sum up minutes
    const data: { [key: string]: number } = {}

    sessions.forEach((session) => {
      const date = new Date(session.timestamp)
      const key = date.toISOString().split("T")[0] // YYYY-MM-DD

      if (data[key]) {
        data[key] += session.minutes
      } else {
        data[key] = session.minutes
      }
    })

    setHeatmapData(data)
  }, [sessions])

  // Get color intensity based on minutes studied - with improved contrast
  const getColorIntensity = (minutes: number) => {
    if (minutes === 0) return "bg-muted/30"
    if (minutes < 30) return "bg-primary/30"
    if (minutes < 60) return "bg-primary/50"
    if (minutes < 120) return "bg-primary/70"
    if (minutes < 180) return "bg-primary/85"
    return "bg-primary"
  }

  // Format minutes as hours and minutes
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Navigate to previous year
  const prevYear = () => {
    setYear(year - 1)
  }

  // Navigate to next year
  const nextYear = () => {
    setYear(Math.min(new Date().getFullYear(), year + 1))
  }

  // Generate calendar data for the entire year
  const generateYearCalendar = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    // Create a 2D array for the entire year
    const calendar: (Date | null)[][] = []

    // Start with the first day of the year
    const startDate = new Date(year, 0, 1)
    const startDay = startDate.getDay() // 0-6 (Sunday-Saturday)

    // Create the first week with empty days before January 1st
    let currentWeek: (Date | null)[] = Array(startDay).fill(null)

    // Add all days of the year
    const endDate = new Date(year, 11, 31)
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      // Add the current date to the current week
      currentWeek.push(new Date(currentDate))

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1)

      // If we reached the end of the week or the end of the year, start a new week
      if (currentDate.getDay() === 0 || currentDate > endDate) {
        // Fill the rest of the week with null if needed
        while (currentWeek.length < 7) {
          currentWeek.push(null)
        }

        calendar.push([...currentWeek])
        currentWeek = []
      }
    }

    return { calendar, monthNames, dayNames }
  }

  const { calendar, monthNames, dayNames } = generateYearCalendar()

  // Calculate month positions for labels
  const monthPositions = monthNames.map((_, index) => {
    // Find the first day of each month
    const firstDayOfMonth = new Date(year, index, 1)

    // Find which week this day belongs to
    let weekIndex = 0
    for (let i = 0; i < calendar.length; i++) {
      const week = calendar[i]
      for (let j = 0; j < week.length; j++) {
        const day = week[j]
        if (day && day.getMonth() === index && day.getDate() === 1) {
          weekIndex = i
          break
        }
      }
    }

    return { month: monthNames[index], weekIndex }
  })

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevYear} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Year</span>
            </Button>

            <div className="text-lg font-medium">Activity Heatmap ({year})</div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextYear}
              disabled={year >= new Date().getFullYear()}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Year</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <div className="text-xs text-muted-foreground">Less</div>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-muted/30 rounded-sm"></div>
              <div className="w-3 h-3 bg-primary/30 rounded-sm"></div>
              <div className="w-3 h-3 bg-primary/50 rounded-sm"></div>
              <div className="w-3 h-3 bg-primary/70 rounded-sm"></div>
              <div className="w-3 h-3 bg-primary/85 rounded-sm"></div>
              <div className="w-3 h-3 bg-primary rounded-sm"></div>
            </div>
            <div className="text-xs text-muted-foreground">More</div>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels - now with proper spacing */}
            <div className="flex h-6 pl-16 mb-2">
              {monthPositions.map(({ month, weekIndex }) => (
                <div
                  key={month}
                  className="text-xs font-medium text-muted-foreground absolute"
                  style={{
                    left: `${weekIndex * 18 + 64}px`, // Position month labels
                  }}
                >
                  {month}
                </div>
              ))}
            </div>

            <div className="flex">
              {/* Day labels - now using three-letter abbreviations */}
              <div className="flex flex-col mr-2 pt-1 w-14">
                {dayNames.map((day) => (
                  <div key={day} className="h-4 text-xs font-medium text-muted-foreground flex items-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-rows-7 gap-[2px]">
                {dayNames.map((day, dayIndex) => (
                  <div key={day} className="flex gap-[2px] h-4">
                    {calendar.map((week, weekIndex) => {
                      const date = week[dayIndex]

                      if (!date) return <div key={`empty-${dayIndex}-${weekIndex}`} className="w-4 h-4"></div>

                      const dateStr = date.toISOString().split("T")[0]
                      const minutes = heatmapData[dateStr] || 0
                      const isToday = new Date().toISOString().split("T")[0] === dateStr

                      return (
                        <Tooltip key={`${dateStr}-${dayIndex}-${weekIndex}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-4 h-4 rounded-sm ${getColorIntensity(minutes)} ${
                                isToday ? "ring-1 ring-primary ring-offset-1" : ""
                              }`}
                            ></div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-medium">
                                {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              </div>
                              <div>{minutes > 0 ? formatTime(minutes) : "No activity"}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

