"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Clock, Flame, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Minus } from "lucide-react"
import { format } from "date-fns"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
)

interface StatisticsDashboardProps {
  studyData: StudyData
  dailyGoal: number
  onGoalChange: (goal: number) => void
}

// Helper function to get date string in YYYY-MM-DD format
const getDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

  // Calculate total study time from all dates
  const totalStudyTime = useMemo(() => {
    return Object.values(studyData.totalStudyTime).reduce((sum, minutes) => sum + minutes, 0)
  }, [studyData.totalStudyTime])

  // Calculate today's study time
  const todayStudyTime = useMemo(() => {
    const today = getDateString(new Date())
    return studyData.totalStudyTime[today] || 0
  }, [studyData.totalStudyTime])

  // Calculate weekly average study time
  const weeklyAverageStudyTime = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)

    let totalMinutes = 0
    let daysWithStudy = 0

    for (let d = new Date(sevenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = getDateString(d)
      const minutes = studyData.totalStudyTime[dateStr] || 0
      if (minutes > 0) daysWithStudy++
      totalMinutes += minutes
    }

    return daysWithStudy > 0 ? Math.round(totalMinutes / daysWithStudy) : 0
  }, [studyData.totalStudyTime])

  // Calculate productivity trend (% change in weekly average)
  const productivityTrend = useMemo(() => {
    const now = new Date()
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(now.getDate() - 14)

    // Last week's data
    let lastWeekTotal = 0
    let lastWeekDays = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = getDateString(d)
      const minutes = studyData.totalStudyTime[dateStr] || 0
      if (minutes > 0) lastWeekDays++
      lastWeekTotal += minutes
    }

    // Previous week's data
    let prevWeekTotal = 0
    let prevWeekDays = 0
    for (let i = 7; i < 14; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = getDateString(d)
      const minutes = studyData.totalStudyTime[dateStr] || 0
      if (minutes > 0) prevWeekDays++
      prevWeekTotal += minutes
    }

    const lastWeekAvg = lastWeekDays > 0 ? lastWeekTotal / lastWeekDays : 0
    const prevWeekAvg = prevWeekDays > 0 ? prevWeekTotal / prevWeekDays : 0

    if (prevWeekAvg === 0) return lastWeekAvg > 0 ? 100 : 0
    return Math.round(((lastWeekAvg - prevWeekAvg) / prevWeekAvg) * 100)
  }, [studyData.totalStudyTime])

  // Get hourly data for today
  const hourlyData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = getDateString(today)

    // Initialize hours array with 0 minutes
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      formattedTime: format(new Date().setHours(i, 0, 0, 0), "h a"),
      minutes: 0,
      goal: dailyGoal * 60 / 24, // Distribute daily goal evenly across hours
    }))

    // Get today's sessions
    const todaySessions = studyData.sessions.filter(session => {
      const sessionDate = getDateString(new Date(session.timestamp))
      return sessionDate === todayStr
    })

    // Distribute minutes across hours
    todaySessions.forEach(session => {
      const sessionDate = new Date(session.timestamp)
      const startHour = sessionDate.getHours()
      let remainingMinutes = session.minutes

      let currentHour = startHour
      while (remainingMinutes > 0 && currentHour < 24) {
        // Calculate minutes to add to current hour
        const minutesInHour = Math.min(remainingMinutes, 60 - sessionDate.getMinutes())
        hours[currentHour].minutes += minutesInHour
        remainingMinutes -= minutesInHour
        currentHour++
        sessionDate.setMinutes(0) // Reset minutes for next hour
      }
    })

    return hours
  }, [studyData.sessions, dailyGoal])

  // Memoize date-based session maps to avoid recalculation
  const dateToMinutesMap = useMemo(() => {
    const map: Record<string, number> = {}
    studyData.sessions.forEach((session) => {
      const sessionDate = new Date(session.timestamp)
      const dateKey = sessionDate.toISOString().split("T")[0]
      map[dateKey] = (map[dateKey] || 0) + session.minutes
    })
    return map
  }, [studyData.sessions])

  // Calculate streak using memoized date map
  const calculateStreak = useCallback(() => {
    if (studyData.sessions.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = today.toISOString().split("T")[0]
    const hasActivityToday = dateToMinutesMap[todayKey] !== undefined

    let streak = 0
    const currentDate = new Date(today)
    if (!hasActivityToday) {
      currentDate.setDate(currentDate.getDate() - 1)
    }

    while (true) {
      const dateKey = currentDate.toISOString().split("T")[0]
      const minutesStudied = dateToMinutesMap[dateKey] || 0

      if (minutesStudied >= dailyGoal * 60) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }, [dateToMinutesMap, dailyGoal, studyData.sessions.length])

  // Calculate today's progress using memoized date map
  const calculateTodayProgress = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = today.toISOString().split("T")[0]
    const totalMinutes = dateToMinutesMap[todayKey] || 0
    const goalMinutes = dailyGoal * 60

    return {
      minutes: totalMinutes,
      percentage: Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)),
      goalMinutes,
    }
  }, [dateToMinutesMap, dailyGoal])

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
  const todayProgress = useMemo(() => calculateTodayProgress(), [calculateTodayProgress])
  const streak = useMemo(() => calculateStreak(), [calculateStreak])
  const averageWeeklyMinutes = useMemo(() => calculateAverageWeeklyStudyTime(), [calculateAverageWeeklyStudyTime])

  // Calculate best streak - the longest streak the user has ever achieved
  const calculateBestStreak = () => {
    if (studyData.sessions.length === 0) return 0

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

    // Sort dates in ascending order
    const sortedDates = Object.keys(dateToMinutesMap).sort()

    let currentStreak = 0
    let bestStreak = 0

    // Check each date to find consecutive days meeting the goal
    for (let i = 0; i < sortedDates.length; i++) {
      const dateKey = sortedDates[i]
      const minutesStudied = dateToMinutesMap[dateKey]

      // Check if goal was met for this day
      if (minutesStudied >= dailyGoal * 60) {
        // If this is the first day or consecutive with previous day
        if (i === 0 || !isConsecutiveDay(sortedDates[i - 1], dateKey)) {
          currentStreak = 1
        } else {
          currentStreak++
        }

        // Update best streak if current streak is better
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        // Reset current streak if goal not met
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

  // Get data for hourly view with offset
  const getHourlyData = () => {
    // Get the current date in local time
    const now = new Date()
    
    // Apply offset and set to start of day in local time
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - timeOffset)
    targetDate.setHours(0, 0, 0, 0)

    // Initialize array for 24 hours in local time
    const hours = Array.from({ length: 24 }, (_, i) => {
      const date = new Date(targetDate)
      date.setHours(i)
      return {
        hour: i,
        time: date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        minutes: 0,
        goal: dailyGoal * 60 / 24,
      }
    })

    // Get the date string for the target date in local timezone
    const targetDateStr = getDateString(targetDate)

    // Filter sessions for the target date in local time
    const todaySessions = studyData.sessions.filter(session => {
      // Convert UTC timestamp to local date string
      const localDate = new Date(session.timestamp)
      const sessionDateStr = getDateString(localDate)
      console.log(sessionDateStr)
      return sessionDateStr === targetDateStr
    })

    // Distribute minutes across hours in local time
    todaySessions.forEach(session => {
      const sessionDate = new Date(session.timestamp)
      const startHour = sessionDate.getHours()
      let remainingMinutes = session.minutes

      let currentHour = startHour
      while (remainingMinutes > 0 && currentHour < 24) {
        // Calculate minutes to add to current hour
        const minutesInHour = Math.min(remainingMinutes, 60 - sessionDate.getMinutes())
        hours[currentHour].minutes += minutesInHour
        remainingMinutes -= minutesInHour
        currentHour++
        sessionDate.setMinutes(0) // Reset minutes for next hour
      }
    })

    return hours
  }

  // Get data for daily view with offset
  const getDailyData = () => {
    const now = new Date()
    // Apply offset (each offset unit is 7 days for daily view)
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - timeOffset * 7)

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(targetDate)
      date.setDate(targetDate.getDate() - 6 + i)
      date.setHours(0, 0, 0, 0)
      return date
    })

    return days.map((date) => {
      const dateStr = getDateString(date)
      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)

      // Filter sessions for this day in local time
      const sessionsForDay = studyData.sessions.filter(session => {
        const sessionDate = new Date(session.timestamp)
        const sessionDateStr = getDateString(sessionDate)
        return sessionDateStr === dateStr
      })

      const totalMinutes = sessionsForDay.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        fullDate: dateStr,
        minutes: totalMinutes,
        goal: dailyGoal * 60,
      }
    })
  }

  // Get data for weekly view with offset - weeks start on Sunday
  const getWeeklyData = () => {
    const now = new Date()
    const today = new Date(now)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek

    // Start with the most recent Sunday
    const mostRecentSunday = new Date(today)
    mostRecentSunday.setDate(today.getDate() - daysToSubtract)
    mostRecentSunday.setHours(0, 0, 0, 0)

    // Apply offset
    mostRecentSunday.setDate(mostRecentSunday.getDate() - timeOffset * 28)

    // Generate 4 consecutive weeks starting from Sunday
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(mostRecentSunday)
      weekStart.setDate(mostRecentSunday.getDate() - 21 + i * 7)
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      return {
        start: weekStart,
        end: weekEnd,
      }
    })

    return weeks.map((week) => {
      const startStr = getDateString(week.start)
      const endStr = getDateString(week.end)

      // Filter sessions within the week in local time
      const sessionsForWeek = studyData.sessions.filter(session => {
        const sessionDate = new Date(session.timestamp)
        const sessionDateStr = getDateString(sessionDate)
        return sessionDateStr >= startStr && sessionDateStr <= endStr
      })

      const totalMinutes = sessionsForWeek.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: week.start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        startDate: startStr,
        endDate: endStr,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * 7,
      }
    })
  }

  // Get data for monthly view with offset
  const getMonthlyData = () => {
    const now = new Date()
    // Apply offset (each offset unit is 12 months for monthly view)
    const targetDate = new Date(now)
    targetDate.setMonth(targetDate.getMonth() - timeOffset * 12)

    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(targetDate.getFullYear(), targetDate.getMonth() - 11 + i, 1)
      date.setHours(0, 0, 0, 0)
      return date
    })

    return months.map((monthDate) => {
      const month = monthDate.getMonth()
      const year = monthDate.getFullYear()

      // Get the first and last day of the month in local time
      const firstDay = new Date(year, month, 1)
      firstDay.setHours(0, 0, 0, 0)
      const lastDay = new Date(year, month + 1, 0)
      lastDay.setHours(23, 59, 59, 999)

      const firstDayStr = getDateString(firstDay)
      const lastDayStr = getDateString(lastDay)

      // Filter sessions within the month in local time
      const sessionsForMonth = studyData.sessions.filter(session => {
        const sessionDate = new Date(session.timestamp)
        const sessionDateStr = getDateString(sessionDate)
        return sessionDateStr >= firstDayStr && sessionDateStr <= lastDayStr
      })

      const totalMinutes = sessionsForMonth.reduce((sum, session) => sum + session.minutes, 0)
      const daysInMonth = lastDay.getDate()

      return {
        date: monthDate.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
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
        return offsetDate.toLocaleDateString(undefined, { 
          month: "long", 
          day: "numeric", 
          year: "numeric",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
        })
      }
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
    <div className="p-4 md:p-6">
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
                <div className="text-sm text-muted-foreground mt-1">Best streak: {bestStreak} days</div>
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
                <h3 className="text-lg font-medium mb-1">Weekly Average</h3>
                <div className="text-3xl font-bold text-primary">
                  {Math.floor(averageWeeklyMinutes / 60)}h {averageWeeklyMinutes % 60}m
                </div>
                <div className="flex items-center text-sm mt-1">
                  <span className="text-muted-foreground">
                    {productivityTrend > 0 ? "+" : "-"}
                    {productivityTrend > 200 ? "200" : productivityTrend}% from last week
                  </span>
                </div>
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
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getActiveData()} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
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
                      if ("time" in data[index]) {
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

