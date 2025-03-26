export interface StudySession {
  id: string
  minutes: number
  timestamp: string
}

export interface StudyData {
  sessions: StudySession[]
  dailyGoal: number
  aethers: number
  totalStudyTime: Record<string, number> // Map of date strings (YYYY-MM-DD) to total minutes
}

export interface UserProfile {
  displayName?: string
  email?: string
  photoURL?: string
}

