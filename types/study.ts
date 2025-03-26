export interface StudySession {
  id: string
  minutes: number
  timestamp: string
}

export interface StudyData {
  sessions: StudySession[]
  dailyGoal: number
  aethers: number
  totalStudyTime: number // Total study time in minutes
}

export interface UserProfile {
  displayName?: string
  email?: string
  photoURL?: string
}

