export interface StudySession {
  id: string
  minutes: number
  timestamp: string
}

export interface DayData {
  sessions: StudySession[]
}

export interface StudyData {
  sessions: StudySession[] // Keeping for backward compatibility
  dailyGoal: number
  aethers: number
  totalStudyTime: Record<string, number> // Map of date strings (YYYY-MM-DD) to total minutes
  date?: Record<string, DayData> // Map of date strings (YYYY-MM-DD) to day data
}

export interface UserProfile {
  displayName?: string
  email?: string
  photoURL?: string
}

