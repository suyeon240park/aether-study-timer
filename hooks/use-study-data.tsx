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
}

export function useStudyData() {
  const { user } = useAuth()
  const [studyData, setStudyData] = useState<StudyData>(initialStudyData)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

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

    const unsubscribe = onValue(userRef, (snapshot) => {
      const firebaseData = snapshot.val()

      if (firebaseData) {
        // Convert Firebase data format to our app format
        const sessions: StudySession[] = []

        // Process study sessions
        if (firebaseData.studySessions) {
          Object.values(firebaseData.studySessions).forEach((session: any) => {
            sessions.push({
              id: session.id,
              minutes: session.duration,
              timestamp: new Date(`${session.date}T${session.start}`).toISOString(),
            })
          })
        }

        // Set the data from Firebase
        setStudyData((prevData) => ({
          sessions: [...sessions],
          dailyGoal: firebaseData.dailyGoal || prevData.dailyGoal,
          aethers: firebaseData.aethers || 0, // Get aethers from Firebase or default to 0
        }))
      } else {
        // If no data in Firebase, upload local data
        syncLocalToFirebase()
      }

      setIsSyncing(false)
    })

    return () => unsubscribe()
  }, [user, isLoaded])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && !isSyncing) {
      localStorage.setItem("study-timer-data", JSON.stringify(studyData))
    }
  }, [studyData, isLoaded, isSyncing])

  // Sync local data to Firebase
  const syncLocalToFirebase = useCallback(() => {
    if (!user || !isLoaded) return

    const userRef = ref(database, `users/${user.uid}`)

    // Convert sessions to Firebase format
    const studySessions: Record<string, any> = {}
    const totalStudyTime: Record<string, number> = {}

    studyData.sessions.forEach((session) => {
      const date = new Date(session.timestamp).toISOString().split("T")[0]
      const time = new Date(session.timestamp).toTimeString().split(" ")[0].substring(0, 5)

      // Calculate end time
      const endDate = new Date(session.timestamp)
      endDate.setMinutes(endDate.getMinutes() + session.minutes)
      const endTime = endDate.toTimeString().split(" ")[0].substring(0, 5)

      // Add to study sessions
      const sessionKey = `${date}_${time}`
      studySessions[sessionKey] = {
        id: session.id,
        date,
        start: time,
        end: endTime,
        duration: session.minutes,
      }

      // Add to daily totals
      if (!totalStudyTime[date]) {
        totalStudyTime[date] = 0
      }
      totalStudyTime[date] += session.minutes
    })

    // Update Firebase
    set(userRef, {
      studySessions,
      totalStudyTime,
      dailyGoal: studyData.dailyGoal,
      aethers: studyData.aethers, // Save aethers to Firebase
    })
  }, [user, studyData, isLoaded])

  // Add a new study session
  const addSession = useCallback(
    async (minutes: number) => {
      if (minutes <= 0) return
  
      const newSession: StudySession = {
        id: Date.now().toString(),
        minutes,
        timestamp: new Date().toISOString(),
      }
  
      setStudyData((prev) => ({
        ...prev,
        sessions: [...prev.sessions, newSession],
      }))
  
      // If user is logged in, also add to Firebase directly
      if (user) {
        try {
          const date = new Date().toISOString().split("T")[0]
          const time = new Date().toTimeString().split(" ")[0].substring(0, 5)
  
          // Calculate end time
          const endDate = new Date()
          endDate.setMinutes(endDate.getMinutes() + minutes)
          const endTime = endDate.toTimeString().split(" ")[0].substring(0, 5)
  
          // Add session to Firebase
          const sessionRef = ref(database, `users/${user.uid}/studySessions/${date}_${time}`)
          await set(sessionRef, {
            id: newSession.id,
            date,
            start: time,
            end: endTime,
            duration: minutes,
          })
  
          // Update daily total
          const totalRef = ref(database, `users/${user.uid}/totalStudyTime/${date}`)
          const snapshot = await get(totalRef)
          const currentTotal = snapshot.exists() ? snapshot.val() : 0
          await set(totalRef, currentTotal + minutes)
        } catch (error) {
          console.error('Error adding session:', error)
        }
      }
    },
    [user],
  )  

  // Add aethers
  const addAethers = useCallback(
    async (amount: number) => {
      setStudyData((prev) => ({
        ...prev,
        aethers: prev.aethers + amount,
      }))
  
      // Update aethers in Firebase if user is logged in
      if (user) {
        const aethersRef = ref(database, `users/${user.uid}/aethers`)
        try {
          const snapshot = await get(aethersRef)
          const currentAethers = snapshot.exists() ? snapshot.val() : 0
          await set(aethersRef, currentAethers + amount)
        } catch (error) {
          console.error('Error updating aethers:', error)
        }
      }
    },
    [user],
  )  

  // Remove aethers (for purchases)
  const removeAethers = useCallback(
    (amount: number) => {
      if (amount <= 0) return
      if (studyData.aethers < amount) return false // Not enough aethers

      setStudyData((prev) => ({
        ...prev,
        aethers: prev.aethers - amount,
      }))

      // Update aethers in Firebase if user is logged in
      if (user) {
        const aethersRef = ref(database, `users/${user.uid}/aethers`)
        set(aethersRef, studyData.aethers - amount)
      }

      return true // Successfully removed aethers
    },
    [user, studyData.aethers],
  )

  // Set daily goal (in hours)
  const setGoal = useCallback(
    (hours: number) => {
      setStudyData((prev) => ({
        ...prev,
        dailyGoal: hours,
      }))

      // Update goal in Firebase if user is logged in
      if (user) {
        const goalRef = ref(database, `users/${user.uid}/dailyGoal`)
        set(goalRef, hours)
      }
    },
    [user],
  )

  // Force sync with Firebase
  const syncWithFirebase = useCallback(() => {
    if (user) {
      syncLocalToFirebase()
    }
  }, [user, syncLocalToFirebase])

  return {
    studyData,
    addSession,
    setGoal,
    dailyGoal: studyData.dailyGoal,
    aethers: studyData.aethers,
    addAethers,
    removeAethers,
    isLoaded,
    isSyncing,
    syncWithFirebase,
  }
}

