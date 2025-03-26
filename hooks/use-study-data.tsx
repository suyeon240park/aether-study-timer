"use client"

import { useState, useEffect, useCallback } from "react"
import { database } from "@/lib/firebase"
import { ref, set, onValue, get } from "firebase/database"
import { useAuth } from "@/contexts/auth-context"
import type { StudyData, StudySession } from "@/types/study"

// Initial empty study data
const initialStudyData: StudyData = {
  sessions: [],
  dailyGoal: 5, // Default 5 hours
  aethers: 0, // Initialize aethers to 0
  totalStudyTime: 0, // Initialize total study time to 0
}

export function useStudyData() {
  const { user } = useAuth()
  const [studyData, setStudyData] = useState<StudyData>(initialStudyData)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadLocalData = () => {
      const savedData = localStorage.getItem("study-timer-data")
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData)
          // Handle migration from old data format that didn't have aethers
          if (!parsedData.hasOwnProperty("aethers")) {
            parsedData.aethers = 0
          }
          setStudyData(parsedData)
        } catch (error) {
          console.error("Failed to parse saved data:", error)
          setError("Failed to load saved data")
        }
      }
      setIsLoaded(true)
    }

    loadLocalData()
  }, [])

  // Sync with Firebase when user logs in
  useEffect(() => {
    if (!user || !isLoaded) return

    const userRef = ref(database, `users/${user.uid}`)

    // First, check if user has data in Firebase
    setIsSyncing(true)
    setError(null)

    const unsubscribe = onValue(userRef, (snapshot) => {
      const firebaseData = snapshot.val()

      if (firebaseData) {
        try {
          // Convert Firebase data format to our app format
          const sessions: StudySession[] = []

          // Process study sessions
          if (firebaseData.studySessions) {
            Object.entries(firebaseData.studySessions).forEach(([sessionId, session]: [string, any]) => {
              sessions.push({
                id: sessionId,
                minutes: session.minutes,
                timestamp: session.timestamp,
              })
            })
          }

          // Set the data from Firebase
          setStudyData({
            sessions: [...sessions],
            dailyGoal: firebaseData.dailyGoal || initialStudyData.dailyGoal,
            aethers: firebaseData.aethers || 0,
            totalStudyTime: firebaseData.totalStudyTime || sessions.reduce((sum, session) => sum + session.minutes, 0),
          })
        } catch (error) {
          console.error("Error processing Firebase data:", error)
          setError("Failed to process data from server")
        }
      } else {
        // If no data in Firebase, upload local data
        syncLocalToFirebase()
      }

      setIsSyncing(false)
    }, (error) => {
      console.error("Firebase sync error:", error)
      setError("Failed to sync with server")
      setIsSyncing(false)
    })

    return () => unsubscribe()
  }, [user, isLoaded])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && !isSyncing) {
      try {
        localStorage.setItem("study-timer-data", JSON.stringify(studyData))
      } catch (error) {
        console.error("Failed to save to localStorage:", error)
        setError("Failed to save data locally")
      }
    }
  }, [studyData, isLoaded, isSyncing])

  // Sync local data to Firebase
  const syncLocalToFirebase = useCallback(async () => {
    if (!user || !isLoaded) return

    try {
      const userRef = ref(database, `users/${user.uid}`)

      // Convert app format to Firebase format
      const firebaseData = {
        studySessions: studyData.sessions.reduce((acc, session) => {
          acc[session.id] = {
            minutes: session.minutes,
            timestamp: session.timestamp,
          }
          return acc
        }, {} as Record<string, { minutes: number; timestamp: string }>),
        dailyGoal: studyData.dailyGoal,
        aethers: studyData.aethers,
        totalStudyTime: studyData.totalStudyTime,
      }

      await set(userRef, firebaseData)
      setError(null)
    } catch (error) {
      console.error("Failed to sync with Firebase:", error)
      setError("Failed to save data to server")
    }
  }, [user, studyData, isLoaded])

  // Add a new study session
  const addSession = useCallback(async (minutes: number) => {
    if (!user || minutes <= 0) return

    try {
      const newSession: StudySession = {
        id: Date.now().toString(),
        minutes,
        timestamp: new Date().toISOString(),
      }

      setStudyData((prev) => ({
        ...prev,
        sessions: [...prev.sessions, newSession],
        totalStudyTime: prev.totalStudyTime + minutes,
      }))

      // Update Firebase
      const userRef = ref(database, `users/${user.uid}`)
      await set(ref(database, `users/${user.uid}/studySessions/${newSession.id}`), {
        minutes: newSession.minutes,
        timestamp: newSession.timestamp,
      })
      await set(ref(database, `users/${user.uid}/totalStudyTime`), studyData.totalStudyTime + minutes)
      setError(null)
    } catch (error) {
      console.error("Failed to add session:", error)
      setError("Failed to save session")
    }
  }, [user, studyData.totalStudyTime])

  // Update daily goal
  const setGoal = useCallback(async (goal: number) => {
    if (!user || goal <= 0) return

    try {
      setStudyData((prev) => ({
        ...prev,
        dailyGoal: goal,
      }))

      // Update Firebase
      const userRef = ref(database, `users/${user.uid}/dailyGoal`)
      await set(userRef, goal)
      setError(null)
    } catch (error) {
      console.error("Failed to update goal:", error)
      setError("Failed to update goal")
    }
  }, [user])

  // Add aethers
  const addAethers = useCallback(async (amount: number) => {
    if (!user || amount <= 0) return

    try {
      const newAethers = studyData.aethers + amount
      setStudyData((prev) => ({
        ...prev,
        aethers: newAethers,
      }))

      // Update Firebase
      const userRef = ref(database, `users/${user.uid}/aethers`)
      await set(userRef, newAethers)
      setError(null)
    } catch (error) {
      console.error("Failed to add aethers:", error)
      setError("Failed to update aethers")
    }
  }, [user, studyData.aethers])

  return {
    studyData,
    addSession,
    setGoal,
    addAethers,
    syncWithFirebase: syncLocalToFirebase,
    dailyGoal: studyData.dailyGoal,
    aethers: studyData.aethers,
    error,
    isSyncing,
  }
}

