"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import type { StudyData } from "@/types/study"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import ActivityHeatmap from "@/components/activity-heatmap"
import { Clock, Flame, ChevronLeft, ChevronRight } from "lucide-react"

interface StatisticsDashboardProps {
  studyData: StudyData
  dailyGoal: number
  onGoalChange: (goal: number) => void
}

export default function StatisticsDashboard({ studyData, dailyGoal, onGoalChange }: StatisticsDashboardProps) {
  // State for time period navigation
  const [timeOffset, setTimeOffset] = useState(0)
  const [activeTab, setActiveTab] = useState("daily")

  // Navigation handlers
  const goBack = useCallback(() => {
    setTimeOffset((prev) => prev + 1)
  }, [])

  const goForward = useCallback(() => {
    setTimeOffset((prev) => Math.max(0, prev - 1))
  }, [])

  // Calculate streak - fixed to count consecutive days meeting the goal
  const calculateStreak = () => {
    if (studyData.sessions.length === 0) return 0

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Create a map of dates to total minutes studied
    const dateToMinutesMap: Record<string, number> = {}

    studyData.sessions.forEach((session) => {
      const sessionDate = new Date(session.timestamp)
      const dateKey = sessionDate.toISOString().split("T")[0]

      if (dateToMinutesMap[dateKey]) {
        dateToMinutesMap[dateKey] += session.minutes
      } else {
        dateToMinutesMap[dateKey] = session.minutes
      }
    })

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(dateToMinutesMap).sort().reverse()

    // Check if there's activity today
    const todayKey = today.toISOString().split("T")[0]
    const hasActivityToday = dateToMinutesMap[todayKey] !== undefined

    // Start counting streak
    let streak = 0
    const currentDate = new Date(today)

    // If no activity today, start checking from yesterday
    if (!hasActivityToday) {
      currentDate.setDate(currentDate.getDate() - 1)
    }

    // Count consecutive days meeting the goal
    while (true) {
      const dateKey = currentDate.toISOString().split("T")[0]
      const minutesStudied = dateToMinutesMap[dateKey] || 0

      // Check if goal was met for this day
      if (minutesStudied >= dailyGoal * 60) {
        streak++
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        // Streak broken
        break
      }
    }

    return streak
  }

  // Calculate today's progress
  const calculateTodayProgress = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sessionsToday = studyData.sessions.filter((session) => {
      const sessionDate = new Date(session.timestamp)
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate.getTime() === today.getTime()
    })

    const totalMinutes = sessionsToday.reduce((sum, session) => sum + session.minutes, 0)
    const goalMinutes = dailyGoal * 60

    return {
      minutes: totalMinutes,
      percentage: Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)),
      goalMinutes,
    }
  }

  // Get data for hourly view with offset
  const getHourlyData = () => {
    const now = new Date()
    // Apply offset (each offset unit is 24 hours for hourly view)
    now.setDate(now.getDate() - timeOffset)
    now.setHours(0, 0, 0, 0) // Start at midnight

    const hours = Array.from({ length: 24 }, (_, i) => {
      const date = new Date(now)
      date.setHours(i, 0, 0, 0) // Set to specific hour of the current day
      return date
    })

    return hours.map((hour) => {
      const hourStart = new Date(hour)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hourStart.getHours() + 1)

      const sessionsInHour = studyData.sessions.filter((session) => {
        const sessionTime = new Date(session.timestamp)
        const sessionDay = new Date(sessionTime)
        sessionDay.setHours(0, 0, 0, 0)

        const offsetDay = new Date(now)
        offsetDay.setHours(0, 0, 0, 0)

        // Only include sessions from the specific day we're looking at
        if (sessionDay.getTime() !== offsetDay.getTime()) return false

        // Check if the session falls within this hour
        const sessionHour = sessionTime.getHours()
        return sessionHour === hourStart.getHours()
      })

      const totalMinutes = sessionsInHour.reduce((sum, session) => sum + session.minutes, 0)

      return {
        hour: hourStart.getHours(),
        time: hourStart.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        minutes: totalMinutes,
        goal: (dailyGoal * 60) / 24, // Distribute daily goal across 24 hours
      }
    })
  }

  // Get data for daily view with offset
  const getDailyData = () => {
    const today = new Date()
    // Apply offset (each offset unit is 7 days for daily view)
    today.setDate(today.getDate() - timeOffset * 7)

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - 6 + i)
      return date
    })

    return days.map((date) => {
      const dateStr = date.toISOString().split("T")[0]
      const sessionsForDay = studyData.sessions.filter(
        (session) => new Date(session.timestamp).toISOString().split("T")[0] === dateStr,
      )
      const totalMinutes = sessionsForDay.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: dateStr,
        minutes: totalMinutes,
        goal: dailyGoal * 60,
      }
    })
  }

  // Get data for weekly view with offset - weeks start on Sunday
  const getWeeklyData = () => {
    const now = new Date()

    // Find the most recent Sunday
    const today = new Date(now)
    const dayOfWeek = today.getDay() // 0 is Sunday, 1 is Monday, etc.
    const daysToSubtract = dayOfWeek

    // Start with the most recent Sunday
    const mostRecentSunday = new Date(today)
    mostRecentSunday.setDate(today.getDate() - daysToSubtract)
    mostRecentSunday.setHours(0, 0, 0, 0)

    // Apply offset (each offset unit is 4 weeks for weekly view)
    mostRecentSunday.setDate(mostRecentSunday.getDate() - timeOffset * 28)

    // Generate 4 consecutive weeks starting from Sunday
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(mostRecentSunday)
      weekStart.setDate(mostRecentSunday.getDate() - 21 + i * 7)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      return {
        start: weekStart,
        end: weekEnd,
      }
    })

    return weeks.map((week) => {
      const startStr = week.start.toISOString().split("T")[0]
      const endStr = week.end.toISOString().split("T")[0]

      const sessionsForWeek = studyData.sessions.filter((session) => {
        const sessionDate = new Date(session.timestamp).toISOString().split("T")[0]
        return sessionDate >= startStr && sessionDate <= endStr
      })

      const totalMinutes = sessionsForWeek.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: week.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        startDate: startStr,
        endDate: endStr,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * 7,
      }
    })
  }

  // Get data for monthly view with offset
  const getMonthlyData = () => {
    const today = new Date()
    // Apply offset (each offset unit is 12 months for monthly view)
    today.setMonth(today.getMonth() - timeOffset * 12)

    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1)
      return date
    })

    return months.map((monthDate) => {
      const month = monthDate.getMonth()
      const year = monthDate.getFullYear()

      // Get the first and last day of the month
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const firstDayStr = firstDay.toISOString().split("T")[0]
      const lastDayStr = lastDay.toISOString().split("T")[0]

      const sessionsForMonth = studyData.sessions.filter((session) => {
        const sessionDate = new Date(session.timestamp).toISOString().split("T")[0]
        return sessionDate >= firstDayStr && sessionDate <= lastDayStr
      })

      const totalMinutes = sessionsForMonth.reduce((sum, session) => sum + session.minutes, 0)
      const daysInMonth = lastDay.getDate()

      return {
        date: monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        month,
        year,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * daysInMonth,
      }
    })
  }

  // Get data for yearly view with offset
  const getYearlyData = () => {
    const currentYear = new Date().getFullYear()
    // Apply offset (each offset unit is 5 years for yearly view)
    const startYear = currentYear - 4 - timeOffset * 5

    const years = Array.from({ length: 5 }, (_, i) => startYear + i)

    return years.map((year) => {
      const firstDay = new Date(year, 0, 1)
      const lastDay = new Date(year, 11, 31)

      const firstDayStr = firstDay.toISOString().split("T")[0]
      const lastDayStr = lastDay.toISOString().split("T")[0]

      const sessionsForYear = studyData.sessions.filter((session) => {
        const sessionDate = new Date(session.timestamp).toISOString().split("T")[0]
        return sessionDate >= firstDayStr && sessionDate <= lastDayStr
      })

      const totalMinutes = sessionsForYear.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: year.toString(),
        year,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * 365, // Approximate goal for a year
      }
    })
  }

  // Get the appropriate data based on active tab
  const getActiveData = () => {
    switch (activeTab) {
      case "hourly":
        return getHourlyData()
      case "weekly":
        return getWeeklyData()
      case "monthly":
        return getMonthlyData()
      case "yearly":
        return getYearlyData()
      case "daily":
      default:
        return getDailyData()
    }
  }

  // Get the appropriate time period label based on active tab and offset
  const getTimePeriodLabel = () => {
    const now = new Date()

    switch (activeTab) {
      case "hourly": {
        const offsetDate = new Date(now)
        offsetDate.setDate(offsetDate.getDate() - timeOffset)
        return offsetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      }
      case "daily": {
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 7 - 6)
        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() - timeOffset * 7)
        return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      }
      case "weekly": {
        // Find the most recent Sunday
        const today = new Date(now)
        const dayOfWeek = today.getDay()
        const daysToSubtract = dayOfWeek

        // Start with the most recent Sunday
        const mostRecentSunday = new Date(today)
        mostRecentSunday.setDate(today.getDate() - daysToSubtract)

        // Apply offset
        mostRecentSunday.setDate(mostRecentSunday.getDate() - timeOffset * 28)

        // Calculate start and end dates
        const startDate = new Date(mostRecentSunday)
        startDate.setDate(mostRecentSunday.getDate() - 21)

        const endDate = new Date(mostRecentSunday)
        endDate.setDate(mostRecentSunday.getDate() + 6)

        return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      }
      case "monthly": {
        const startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - timeOffset * 12 - 11)
        const endDate = new Date(now)
        endDate.setMonth(endDate.getMonth() - timeOffset * 12)
        return `${startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
      }
      case "yearly": {
        const currentYear = new Date().getFullYear()
        const startYear = currentYear - 4 - timeOffset * 5
        const endYear = startYear + 4
        return `${startYear} - ${endYear}`
      }
      default:
        return ""
    }
  }

  const todayProgress = calculateTodayProgress()
  const streak = calculateStreak()

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const minutes = payload[0].value
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60

      return (
        <div className="bg-background border rounded-md p-3 shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-primary font-semibold">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</p>
          {payload[1] && (
            <p className="text-muted-foreground text-sm">
              Goal: {Math.floor(payload[1].value / 60)}h {payload[1].value % 60}m
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Data for donut chart
  const donutData = [
    { name: "Completed", value: todayProgress.percentage },
    { name: "Remaining", value: Math.max(0, 100 - todayProgress.percentage) },
  ]

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"]

  // Get sessions for the heatmap based on the active tab and offset
  const getHeatmapSessions = () => {
    // For the heatmap, we'll show a larger time range than the bar chart
    // This gives context to the data
    const now = new Date()
    let startDate, endDate

    switch (activeTab) {
      case "hourly":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 1 - 30) // Show 30 days
        break
      case "daily":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 7 - 60) // Show 60 days
        break
      case "weekly":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 28 - 90) // Show 90 days
        break
      case "monthly":
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - timeOffset * 12 - 12) // Show 12 months
        break
      case "yearly":
        startDate = new Date(now)
        startDate.setFullYear(startDate.getFullYear() - timeOffset * 5 - 5) // Show 5 years
        break
      default:
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90) // Default to 90 days
    }

    endDate = new Date(now)

    // Filter sessions within the date range
    return studyData.sessions.filter((session) => {
      const sessionDate = new Date(session.timestamp)
      return sessionDate >= startDate && sessionDate <= endDate
    })
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium mb-1">Today's Progress</h3>
                <div className="text-3xl font-bold text-primary">
                  {Math.floor(todayProgress.minutes / 60)}h {todayProgress.minutes % 60}m
                </div>
                <div className="text-sm text-muted-foreground">
                  Goal: {dailyGoal}h ({todayProgress.percentage}%)
                </div>
              </div>
              <div className="w-20 h-20">
                <PieChart width={80} height={80} className="focus:outline-none" tabIndex={0}>
                  <Pie
                    data={donutData}
                    cx={40}
                    cy={40}
                    innerRadius={25}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            </div>
            <Progress value={todayProgress.percentage} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <Flame className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Current Streak</h3>
                <div className="text-3xl font-bold text-primary">{streak} days</div>
                <div className="text-sm text-muted-foreground">
                  {streak > 0 ? "Keep it up! You're on a roll!" : "Start your streak today!"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Total Study Time</h3>
                <div className="text-3xl font-bold text-primary">
                  {Math.floor(studyData.sessions.reduce((sum, session) => sum + session.minutes, 0) / 60)}h
                </div>
                <div className="text-sm text-muted-foreground">Across {studyData.sessions.length} sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Navigation */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <Tabs
            defaultValue="daily"
            className="w-full sm:w-auto"
            onValueChange={(value) => {
              setActiveTab(value)
              setTimeOffset(0) // Reset offset when changing tabs
            }}
            value={activeTab}
          >
            <TabsList className="grid grid-cols-5 w-full sm:w-auto">
              <TabsTrigger value="hourly">Hourly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goBack} className="h-9 px-3">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium px-2 min-w-[180px] text-center">{getTimePeriodLabel()}</div>
            <Button variant="outline" size="sm" onClick={goForward} disabled={timeOffset === 0} className="h-9 px-3">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <Card className="shadow-md mb-6">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Study Time</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getActiveData()} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.5)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  stroke="hsl(var(--foreground)/0.7)"
                  tickFormatter={(value, index) => {
                    // For hourly view, use the time property instead of date
                    if (activeTab === "hourly") {
                      const data = getActiveData()
                      if ('time' in data[index]) {
                        return data[index].time
                      }
                    }
                    return value
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => (value >= 60 ? `${Math.floor(value / 60)}h` : `${value}m`)}
                  stroke="hsl(var(--foreground)/0.7)"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={
                    activeTab === "hourly"
                      ? (dailyGoal * 60) / 24
                      : activeTab === "daily"
                        ? dailyGoal * 60
                        : activeTab === "weekly"
                          ? dailyGoal * 60 * 7
                          : activeTab === "monthly"
                            ? dailyGoal * 60 * 30
                            : dailyGoal * 60 * 365
                  }
                  stroke="hsl(var(--primary)/0.6)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Goal",
                    position: "right",
                    fill: "hsl(var(--primary))",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  barSize={activeTab === "hourly" ? 12 : 24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Activity Heatmap</h3>
          <ActivityHeatmap sessions={getHeatmapSessions()} />
        </CardContent>
      </Card>
    </div>
  )
}

