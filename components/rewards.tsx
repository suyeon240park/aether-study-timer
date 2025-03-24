"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { StudyData } from "@/types/study"
import { Diamond } from "lucide-react"

interface RewardsProps {
  studyData: StudyData
}

export default function Rewards({ studyData }: RewardsProps) {
  const [remainingMinutes, setRemainingMinutes] = useState(0)

  useEffect(() => {
    // Calculate total minutes studied
    const totalMinutes = studyData.sessions.reduce((sum, session) => sum + session.minutes, 0)

    // Calculate remaining minutes to next aether (1 aether per 30 minutes)
    const remaining = totalMinutes % 30

    setRemainingMinutes(remaining)
  }, [studyData])

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-primary mb-2">{studyData.aethers}</div>
            <div className="text-sm text-muted-foreground">Total Aethers</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-primary mb-2">{remainingMinutes}</div>
            <div className="text-sm text-muted-foreground">Minutes to Next Aether</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {Array.from({ length: Math.min(studyData.aethers, 20) }).map((_, i) => (
          <Diamond key={i} className="h-8 w-8 text-primary fill-primary/20 transform rotate-45" />
        ))}
        {studyData.aethers > 20 && (
          <div className="text-sm text-muted-foreground mt-2">+{studyData.aethers - 20} more aethers</div>
        )}
      </div>

      <div className="mt-4">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div className="text-xs font-semibold inline-block text-primary">
              {remainingMinutes}/30 minutes to next aether
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary/20">
            <div
              style={{ width: `${(remainingMinutes / 30) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

