"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { StudyData } from "@/types/study"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import ActivityHeatmap from "@/components/activity-heatmap"

interface StatisticsProps {
  studyData: StudyData
  dailyGoal: number
  onGoalChange: (goal: number) => void
}

export default function Statistics({ studyData, dailyGoal, onGoalChange }: StatisticsProps) {
  const [goalInput, setGoalInput] = useState(dailyGoal.toString())

  // Get data for daily view (last 7 days)
  const getDailyData = () => {
    const today = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      return date.toISOString().split("T")[0]
    }).reverse()

    return last7Days.map((date) => {
      const sessionsForDay = studyData.sessions.filter(
        (session) => new Date(session.timestamp).toISOString().split("T")[0] === date,
      )
      const totalMinutes = sessionsForDay.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        minutes: totalMinutes,
        goal: dailyGoal * 60,
      }
    })
  }

  // Get data for weekly view (last 4 weeks)
  const getWeeklyData = () => {
    const today = new Date()
    const last4Weeks = Array.from({ length: 4 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - i * 7)
      return date
    }).reverse()

    return last4Weeks.map((weekStart, index) => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weekStartStr = weekStart.toISOString().split("T")[0]
      const weekEndStr = weekEnd.toISOString().split("T")[0]

      const sessionsForWeek = studyData.sessions.filter((session) => {
        const sessionDate = new Date(session.timestamp).toISOString().split("T")[0]
        return sessionDate >= weekStartStr && sessionDate <= weekEndStr
      })

      const totalMinutes = sessionsForWeek.reduce((sum, session) => sum + session.minutes, 0)

      return {
        date: `Week ${index + 1}`,
        minutes: totalMinutes,
        goal: dailyGoal * 60 * 7,
      }
    })
  }

  // Get data for monthly view (last 3 months)
  const getMonthlyData = () => {
    const today = new Date()
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const date = new Date(today)
      date.setMonth(today.getMonth() - i)
      return date
    }).reverse()

    return last3Months.map((monthDate) => {
      const month = monthDate.getMonth()
      const year = monthDate.getFullYear()

      const sessionsForMonth = studyData.sessions.filter((session) => {
        const sessionDate = new Date(session.timestamp)
        return sessionDate.getMonth() === month && sessionDate.getFullYear() === year
      })

      const totalMinutes = sessionsForMonth.reduce((sum, session) => sum + session.minutes, 0)
      const daysInMonth = new Date(year, month + 1, 0).getDate()

      return {
        date: monthDate.toLocaleDateString("en-US", { month: "long" }),
        minutes: totalMinutes,
        goal: dailyGoal * 60 * daysInMonth,
      }
    })
  }

  const handleGoalChange = () => {
    const newGoal = Number.parseInt(goalInput) || 1
    onGoalChange(newGoal)
  }

  return (
    <div className="space-y-6 pt-6">
      <h2 className="text-2xl font-bold">Statistics</h2>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="daily-goal" className="mb-2 block">
              Daily Goal (hours)
            </Label>
            <Input
              id="daily-goal"
              type="number"
              min="1"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-24"
            />
          </div>
          <Button onClick={handleGoalChange}>Set Goal</Button>
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardContent className="pt-6">
              <ChartContainer
                config={{
                  minutes: {
                    label: "Minutes",
                    color: "hsl(var(--primary))",
                  },
                  goal: {
                    label: "Goal",
                    color: "hsl(var(--muted-foreground))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getDailyData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="goal" fill="hsl(var(--muted-foreground)/0.2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Activity Heatmap</h3>
            <ActivityHeatmap sessions={studyData.sessions} />
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardContent className="pt-6">
              <ChartContainer
                config={{
                  minutes: {
                    label: "Minutes",
                    color: "hsl(var(--primary))",
                  },
                  goal: {
                    label: "Goal",
                    color: "hsl(var(--muted-foreground))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getWeeklyData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="goal" fill="hsl(var(--muted-foreground)/0.2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardContent className="pt-6">
              <ChartContainer
                config={{
                  minutes: {
                    label: "Minutes",
                    color: "hsl(var(--primary))",
                  },
                  goal: {
                    label: "Goal",
                    color: "hsl(var(--muted-foreground))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="goal" fill="hsl(var(--muted-foreground)/0.2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

