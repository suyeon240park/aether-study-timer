"use client"

import { useState, useCallback, useMemo } from "react"
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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import ActivityHeatmap from "@/components/activity-heatmap"
import { Clock, Flame, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

interface StatisticsDashboardProps {
  studyData: StudyData
  dailyGoal: number
  onGoalChange: (goal: number) => void
}

// Helper function to get date string in YYYY-MM-DD format
const getDateString = (date: Date) => {
  // Get user's timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Convert to local date string in YYYY-MM-DD format using the user's timezone
  return date.toLocaleDateString('en-CA', { timeZone: userTimeZone });
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

  // Calculate streak using memoized date map
  const calculateStreak = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = getDateString(today)
    
    let currentStreak = 0
    let currentDate = new Date(today)
    
    // Check if today's goal is met
    const todayMinutes = studyData.totalStudyTime[todayStr] || 0
    const hasMetTodayGoal = todayMinutes >= dailyGoal * 60
    
    if (!hasMetTodayGoal) {
      // If today's goal is not met, start checking from yesterday
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    // Keep checking previous days until we find a day that didn't meet the goal
    while (true) {
      const dateStr = getDateString(currentDate)
      const minutes = studyData.totalStudyTime[dateStr] || 0
      
      if (minutes >= dailyGoal * 60) {
        currentStreak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }
    
    return currentStreak
  }, [studyData.totalStudyTime, dailyGoal])

  // Calculate today's progress using memoized date map
  const todayProgress = useMemo(() => {
    const today = getDateString(new Date())
    const minutes = studyData.totalStudyTime[today] || 0
    return {
      minutes,
      percentage: Math.min(100, Math.round((minutes / (dailyGoal * 60)) * 100)),
      goalMinutes: dailyGoal * 60
    }
  }, [studyData.totalStudyTime, dailyGoal])

  // Memoize weekly data to avoid recalculation
  const weeklyData = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfCurrentWeek = new Date(today)
    startOfCurrentWeek.setDate(today.getDate() - dayOfWeek)
    startOfCurrentWeek.setHours(0, 0, 0, 0)

    // Get data for the last 6 weeks (current week + 5 previous)
    const weeks: { start: Date; end: Date }[] = []
    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(startOfCurrentWeek)
      weekStart.setDate(weekStart.getDate() - (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      weeks.push({ start: weekStart, end: weekEnd })
    }

    // Calculate minutes for each week
    const weeklyMinutes = weeks.map(week => {
      const sessionsInWeek = studyData.sessions.filter(session => {
        const sessionDate = new Date(session.timestamp)
        return sessionDate >= week.start && sessionDate <= week.end
      })
      return sessionsInWeek.reduce((sum, session) => sum + session.minutes, 0)
    })

    // Calculate moving averages
    const movingAverages = weeklyMinutes.slice(1).map((_, index) => {
      const threeWeekSum = weeklyMinutes.slice(index, index + 3).reduce((sum, min) => sum + min, 0)
      return Math.round(threeWeekSum / 3)
    })

    return {
      currentWeekMinutes: weeklyMinutes[0],
      previousWeekMinutes: weeklyMinutes[1],
      weeklyMinutes,
      movingAverages,
      averageMinutesPerWeek: Math.round(
        weeklyMinutes.slice(1, 5).reduce((sum, min) => sum + min, 0) / 4
      ), // Average of last 4 complete weeks
    }
  }, [studyData.sessions])

  // Calculate average weekly study time from the weekly data
  const calculateAverageWeeklyStudyTime = useCallback(() => {
    return weeklyData.averageMinutesPerWeek
  }, [weeklyData])

  // Memoize values that are used in the render
  const streak = useMemo(() => calculateStreak(), [calculateStreak])
  const averageWeeklyMinutes = useMemo(() => calculateAverageWeeklyStudyTime(), [calculateAverageWeeklyStudyTime])

  // Calculate best streak - the longest streak the user has ever achieved
  const calculateBestStreak = () => {
    // If no study data, return 0
    if (Object.keys(studyData.totalStudyTime).length === 0) return 0

    // Get today's date string
    const today = getDateString(new Date())
    
    // Sort dates in ascending order
    const sortedDates = Object.keys(studyData.totalStudyTime).sort()
    
    let currentStreak = 0
    let bestStreak = 0

    // Check each date to find consecutive days meeting the goal
    for (let i = 0; i < sortedDates.length; i++) {
      const dateKey = sortedDates[i]
      const minutesStudied = studyData.totalStudyTime[dateKey]

      // Skip future dates
      if (dateKey > today) continue

      // Check if goal was met for this day
      if (minutesStudied >= dailyGoal * 60) {
        // If this is the first day or consecutive with previous day
        if (i === 0 || isConsecutiveDay(sortedDates[i - 1], dateKey)) {
          currentStreak++
        } else {
          currentStreak = 1
        }

        // Update best streak if current streak is better
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    return bestStreak
  }

  // Helper function to check if two dates are consecutive
  const isConsecutiveDay = (date1: string, date2: string) => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)

    // Set to same time to compare just the dates
    d1.setHours(0, 0, 0, 0)
    d2.setHours(0, 0, 0, 0)

    // Calculate difference in days
    const diffTime = d2.getTime() - d1.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    return diffDays === 1
  }

  // Get data for daily view with offset (uses totalStudyTime)
  const getDailyData = () => {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - timeOffset * 7)

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(targetDate)
      date.setDate(targetDate.getDate() - 6 + i)
      return date
    })

    return days.map((date) => {
      const dateStr = getDateString(date)
      const totalMinutes = studyData.totalStudyTime[dateStr] || 0

      return {
        date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        fullDate: dateStr,
        minutes: totalMinutes,
        goal: dailyGoal * 60,
      }
    })
  }

  // Get data for weekly view with offset (uses totalStudyTime)
  const getWeeklyData = () => {
    const now = new Date()
    const today = new Date(now)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek

    // Start with the most recent Sunday
    const mostRecentSunday = new Date(today)
    mostRecentSunday.setDate(today.getDate() - daysToSubtract)

    // Apply offset
    mostRecentSunday.setDate(mostRecentSunday.getDate() - timeOffset * 28)

    // Generate 4 consecutive weeks
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
      let totalMinutes = 0
      const currentDate = new Date(week.start)
      
      while (currentDate <= week.end) {
        const dateStr = getDateString(currentDate)
        totalMinutes += studyData.totalStudyTime[dateStr] || 0
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return {
        date: week.start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        startDate: getDateString(week.start),
        endDate: getDateString(week.end),
        minutes: totalMinutes,
        goal: dailyGoal * 60 * 7,
      }
    })
  }

  // Get data for monthly view with offset (uses totalStudyTime)
  const getMonthlyData = () => {
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() - timeOffset * 12)

    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(targetDate.getFullYear(), targetDate.getMonth() - 11 + i, 1)
      return date
    })

    return months.map((monthDate) => {
      const month = monthDate.getMonth()
      const year = monthDate.getFullYear()
      const lastDay = new Date(year, month + 1, 0)

      let totalMinutes = 0
      const currentDate = new Date(monthDate)
      
      while (currentDate <= lastDay) {
        const dateStr = getDateString(currentDate)
        totalMinutes += studyData.totalStudyTime[dateStr] || 0
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return {
        date: monthDate.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        month,
        year,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * lastDay.getDate(),
      }
    })
  }

  // Get data for yearly view with offset (uses totalStudyTime)
  const getYearlyData = () => {
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 4 - timeOffset * 5
    const years = Array.from({ length: 5 }, (_, i) => startYear + i)

    return years.map((year) => {
      let totalMinutes = 0
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31)
      
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateStr = getDateString(currentDate)
        totalMinutes += studyData.totalStudyTime[dateStr] || 0
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return {
        date: year.toString(),
        year,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * 365,
      }
    })
  }

  // Get the appropriate data based on active tab
  const getActiveData = () => {
    switch (activeTab) {
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
      case "daily": {
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 7 - 6)
        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() - timeOffset * 7)
        return `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      }
      case "weekly": {
        const today = new Date(now)
        const dayOfWeek = today.getDay()
        const daysToSubtract = dayOfWeek

        const mostRecentSunday = new Date(today)
        mostRecentSunday.setDate(today.getDate() - daysToSubtract)
        mostRecentSunday.setDate(mostRecentSunday.getDate() - timeOffset * 28)

        const startDate = new Date(mostRecentSunday)
        startDate.setDate(mostRecentSunday.getDate() - 21)

        const endDate = new Date(mostRecentSunday)
        endDate.setDate(mostRecentSunday.getDate() + 6)

        return `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      }
      case "monthly": {
        const startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - timeOffset * 12 - 11)
        const endDate = new Date(now)
        endDate.setMonth(endDate.getMonth() - timeOffset * 12)
        return `${startDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })} - ${endDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
      }
      case "yearly": {
        const currentYear = now.getFullYear()
        const startYear = currentYear - 4 - timeOffset * 5
        const endYear = startYear + 4
        return `${startYear} - ${endYear}`
      }
      default:
        return ""
    }
  }

  const bestStreak = calculateBestStreak()

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
    const now = new Date()
    let startDate, endDate

    switch (activeTab) {
      case "daily":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 7 - 60)
        break
      case "weekly":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 28 - 90)
        break
      case "monthly":
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - timeOffset * 12 - 12)
        break
      case "yearly":
        startDate = new Date(now)
        startDate.setFullYear(startDate.getFullYear() - timeOffset * 5 - 5)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
    }

    endDate = new Date(now)

    // Collect all sessions within the date range
    const sessions = []
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = getDateString(currentDate)
      const dayData = studyData.date?.[dateStr]
      if (dayData) {
        sessions.push(...dayData.sessions)
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return sessions
  }

  // Get data for heatmap (uses totalStudyTime)
  const getHeatmapData = () => {
    const now = new Date()
    let startDate: Date

    switch (activeTab) {
      case "daily":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 7 - 60)
        break
      case "weekly":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - timeOffset * 28 - 90)
        break
      case "monthly":
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - timeOffset * 12 - 12)
        break
      case "yearly":
        startDate = new Date(now)
        startDate.setFullYear(startDate.getFullYear() - timeOffset * 5 - 5)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
    }

    // Create an array of { timestamp, minutes } objects from totalStudyTime
    const heatmapData = []
    const currentDate = new Date(startDate)
    while (currentDate <= now) {
      const dateStr = getDateString(currentDate)
      const minutes = studyData.totalStudyTime[dateStr] || 0
      if (minutes > 0) {
        heatmapData.push({
          timestamp: currentDate.toISOString(),
          minutes: minutes
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return heatmapData
  }

  // Calculate weekly stats (average and best day)
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)

    let totalMinutes = 0
    let bestDay = { date: '', minutes: 0 }

    // Iterate through the last 7 days
    const currentDate = new Date(now)
    while (currentDate >= sevenDaysAgo) {
      const dateStr = getDateString(currentDate)
      const minutes = studyData.totalStudyTime[dateStr] || 0
      
      // Update total
      totalMinutes += minutes
      
      // Update best day if current day has more minutes
      if (minutes > bestDay.minutes) {
        bestDay = {
          date: currentDate.toLocaleDateString(undefined, { weekday: 'long' }),
          minutes: minutes
        }
      }
      
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return {
      averageMinutes: Math.round(totalMinutes / 7),
      bestDay
    }
  }, [studyData.totalStudyTime])

  const clampedTodayPercentage = Math.max(0, Math.min(100, todayProgress.percentage))
  const isTodayComplete = clampedTodayPercentage >= 99.9
  const todayPieData = isTodayComplete
    ? [{ value: 100 }]
    : [
        { value: clampedTodayPercentage },
        { value: Math.max(0, 100 - clampedTodayPercentage) },
      ]

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-full overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10">
        <Card className="shadow-md overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium mb-1">Today's Progress</h3>
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {Math.floor(todayProgress.minutes / 60)}h {todayProgress.minutes % 60}m
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Goal: {dailyGoal}h ({todayProgress.percentage}%)
                </div>
              </div>
              <div className="w-20 h-20">
                <PieChart width={80} height={80} className="focus:outline-none" tabIndex={0}>
                  <Pie
                    data={todayPieData}
                    cx={40}
                    cy={40}
                    innerRadius={25}
                    outerRadius={35}
                    paddingAngle={isTodayComplete ? 0 : 2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={clampedTodayPercentage > 0}
                    animationDuration={1000}
                    stroke="none"
                    strokeWidth={0}
                  >
                    {todayPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            </div>
            <Progress value={todayProgress.percentage} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-md overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="bg-primary/20 p-2 sm:p-3 rounded-full flex-shrink-0">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium mb-1">Current Streak</h3>
                <div className="text-2xl sm:text-3xl font-bold text-primary">{calculateStreak()} days</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Best: {bestStreak} days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="bg-primary/20 p-2 sm:p-3 rounded-full flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium mb-1">Weekly Average</h3>
                <div className="text-2xl sm:text-3xl font-bold text-primary truncate">
                  {Math.floor(weeklyStats.averageMinutes / 60)}h {weeklyStats.averageMinutes % 60}m
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                  Best: {weeklyStats.bestDay.date} ({Math.floor(weeklyStats.bestDay.minutes / 60)}h {weeklyStats.bestDay.minutes % 60}m)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Navigation */}
      <div className="mb-6 sm:mb-8 md:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Tabs
            defaultValue="daily"
            className="w-full sm:w-auto"
            onValueChange={(value) => {
              setActiveTab(value)
              setTimeOffset(0) // Reset offset when changing tabs
            }}
            value={activeTab}
          >
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button variant="outline" size="sm" onClick={goBack} className="h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
            </Button>
            <div className="text-[10px] sm:text-sm font-medium px-1 sm:px-2 min-w-0 max-w-[140px] sm:max-w-[200px] text-center truncate">{getTimePeriodLabel()}</div>
            <Button variant="outline" size="sm" onClick={goForward} disabled={timeOffset === 0} className="h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0">
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <Card className="shadow-md mb-6 sm:mb-8 md:mb-10">
        <CardContent className="pt-6">
          <h3 className="text-base sm:text-lg font-medium mb-4">Study Time</h3>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getActiveData()} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.5)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  stroke="hsl(var(--foreground)/0.7)"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => (value >= 60 ? `${Math.floor(value / 60)}h` : `${value}m`)}
                  stroke="hsl(var(--foreground)/0.7)"
                  domain={[0, (dataMax: number) => {
                    // Calculate goal based on active tab
                    let goalMinutes: number;
                    switch (activeTab) {
                      case "weekly":
                        goalMinutes = dailyGoal * 60 * 7; // Weekly goal
                        break;
                      case "monthly":
                        goalMinutes = dailyGoal * 60 * 30; // Monthly goal (approx)
                        break;
                      case "yearly":
                        goalMinutes = dailyGoal * 60 * 365; // Yearly goal
                        break;
                      case "daily":
                      default:
                        goalMinutes = dailyGoal * 60; // Daily goal
                    }
                    // Return the higher of goal or max data value, rounded up nicely
                    const maxValue = Math.max(goalMinutes, dataMax);
                    // Round up to nearest hour (60 minutes)
                    return Math.ceil(maxValue / 60) * 60;
                  }]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="minutes"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card className="shadow-md overflow-hidden">
        <CardContent className="pt-6 overflow-x-auto">
          <h3 className="text-base sm:text-lg font-medium mb-4">Activity Heatmap</h3>
          <ActivityHeatmap sessions={getHeatmapData()} />
        </CardContent>
      </Card>
    </div>
  )
}

