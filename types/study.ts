export type StudySession = {
  id: string;
  timestamp: string;
  minutes: number;
};

export type DayData = {
  sessions: StudySession[];
  totalMinutes: number;
};

export type StudyData = {
  sessions: StudySession[];
  totalStudyTime: { [key: string]: number };
  dailyGoal: number;
  date?: { [key: string]: DayData };
};

export type TimerType = "default" | "pomodoro";

export type PomodoroSettings = {
  focusTime: number;
  shortBreakTime: number;
  longBreakTime: number;
  breakInterval: number;
};

export interface UserProfile {
  displayName?: string
  email?: string
  photoURL?: string
}

