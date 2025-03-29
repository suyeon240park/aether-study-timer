"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import StatisticsDashboard from "@/components/statistics-dashboard"
import type { StudyData } from "@/types/study"

interface StatisticsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyData: StudyData
  dailyGoal: number
  onGoalChange: (goal: number) => void
}

export default function StatisticsDialog({
  open,
  onOpenChange,
  studyData,
  dailyGoal,
  onGoalChange,
}: StatisticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-6xl max-h-[90vh] p-0" aria-describedby="">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-3xl font-bold">Statistics Dashboard</DialogTitle>
        </DialogHeader>
        <div className="h-[calc(90vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <StatisticsDashboard studyData={studyData} dailyGoal={dailyGoal} onGoalChange={onGoalChange} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

