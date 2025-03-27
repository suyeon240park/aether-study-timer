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
  totalStudyTime: {}, // Initialize empty record of daily totals
}

// Helper function to get date string in YYYY-MM-DD format
const getDateString = (date: Date) => {
  return date.toISOString().split('T')[0]
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
          // Handle migration from old data format
          if (!parsedData.hasOwnProperty("aethers")) {
            parsedData.aethers = 0
          }
          if (!parsedData.hasOwnProperty("totalStudyTime") || typeof parsedData.totalStudyTime !== 'object') {
            parsedData.totalStudyTime = {}
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
    // Reset to initial state when user logs out
    if (!user) {
      setStudyData(initialStudyData)
      setError(null)
      setIsSyncing(false)
      return
    }

    // Don't proceed if data isn't loaded yet
    if (!isLoaded) return

    let unsubscribe: (() => void) | undefined
    setIsSyncing(true)

    const setupFirebaseSync = async () => {
      try {
        // Get a fresh token
        await user.getIdToken(true)
        
        // Create the initial data structure that matches Firebase rules
        const newUserData = {
          studySessions: {},
          dailyGoal: initialStudyData.dailyGoal,
          aethers: 0,
          totalStudyTime: {}
        }

        // Reference to user's data
        const userRef = ref(database, `users/${user.uid}`)

        // Try to initialize the data structure first
        try {
          await set(userRef, newUserData)
        } catch (error) {
          // If set fails, it might mean the data already exists
          console.log("Initial data setup skipped - data might already exist")
        }

        // Now try to read the data
        const snapshot = await get(userRef)
        if (snapshot.exists()) {
          const firebaseData = snapshot.val()
          const sessions: StudySession[] = []

          if (firebaseData.studySessions) {
            Object.entries(firebaseData.studySessions).forEach(([date, dateSessions]: [string, any]) => {
              Object.entries(dateSessions).forEach(([sessionId, sessionData]: [string, any]) => {
                if (sessionData.minutes && sessionData.timestamp) {
                  sessions.push({
                    id: sessionId,
                    minutes: sessionData.minutes,
                    timestamp: sessionData.timestamp,
                  })
                }
              })
            })
          }

          setStudyData({
            sessions,
            dailyGoal: firebaseData.dailyGoal || initialStudyData.dailyGoal,
            aethers: firebaseData.aethers || 0,
            totalStudyTime: firebaseData.totalStudyTime || {},
          })
        } else {
          setStudyData(initialStudyData)
        }

        // Set up the listener for future changes
        unsubscribe = onValue(userRef, (snapshot) => {
          if (!user) return
          
          const firebaseData = snapshot.val()
          if (firebaseData) {
            try {
              const sessions: StudySession[] = []

              if (firebaseData.studySessions) {
                Object.entries(firebaseData.studySessions).forEach(([date, dateSessions]: [string, any]) => {
                  Object.entries(dateSessions).forEach(([sessionId, sessionData]: [string, any]) => {
                    if (sessionData.minutes && sessionData.timestamp) {
                      sessions.push({
                        id: sessionId,
                        minutes: sessionData.minutes,
                        timestamp: sessionData.timestamp,
                      })
                    }
                  })
                })
              }

              setStudyData({
                sessions,
                dailyGoal: firebaseData.dailyGoal || initialStudyData.dailyGoal,
                aethers: firebaseData.aethers || 0,
                totalStudyTime: firebaseData.totalStudyTime || {},
              })
              setError(null)
            } catch (error) {
              console.error("Error processing Firebase data:", error)
              setError("Failed to process data from server")
            }
          }
          setIsSyncing(false)
        }, (error) => {
          console.error("Firebase sync error:", error)
          setError("Failed to sync with server")
          setIsSyncing(false)
        })

        setError(null)
        setIsSyncing(false)
      } catch (error) {
        console.error("Error setting up Firebase sync:", error)
        setError("Failed to initialize data")
        setIsSyncing(false)
      }
    }

    // Set up Firebase sync
    setupFirebaseSync()

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
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

  const syncLocalToFirebase = useCallback(async () => {
    if (!user || !isLoaded) return;
  
    try {
      const userRef = ref(database, `users/${user.uid}`);
  
      // Convert app format to Firebase format
      const studySessions: Record<string, Record<string, { minutes: number; timestamp: string }>> = {};
      
      // Group sessions by date
      studyData.sessions.forEach((session) => {
        // Get the user's time zone to convert timestamp to local date
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localDate = new Date(session.timestamp)
          .toLocaleDateString("en-CA", { timeZone: userTimeZone });
          
        // Check if the localDate is valid
        const isValidDate = !isNaN(new Date(localDate).getTime());
        if (!isValidDate || !session.timestamp || !session.minutes) {
          console.error("Invalid session data:", session);
          return; // Skip invalid sessions
        }
  
        // Initialize date object if it doesn't exist
        if (!studySessions[localDate]) {
          studySessions[localDate] = {};
        }
  
        // Add session under the date using session.id
        studySessions[localDate][session.id] = {
          minutes: session.minutes,
          timestamp: session.timestamp,
        };
      });
  
      // Prepare the complete user data with required structure
      const firebaseData = {
        studySessions: studySessions,
        dailyGoal: studyData.dailyGoal || initialStudyData.dailyGoal,
        aethers: studyData.aethers || 0,
        totalStudyTime: studyData.totalStudyTime || {},
      };
  
      // Update the user data in Firebase
      try {
        await set(userRef, firebaseData);
        setError(null);
      } catch (error) {
        console.error("Failed to sync with Firebase:", error);
        setError("Failed to save data to server");
      }
    } catch (error) {
      console.error("Failed to sync with Firebase:", error);
      setError("Failed to save data to server");
    }
  }, [user, isLoaded, studyData]);
  

  // Add a new study session
  const addSession = useCallback(async (minutes: number) => {
    if (!user || minutes <= 0) return
  
    try {
      const newSession: StudySession = {
        id: Date.now().toString(),
        minutes,
        timestamp: new Date().toISOString(),
      }
  
      // Get the user's local date
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localDate = new Date(newSession.timestamp)
        .toLocaleDateString("en-CA", { timeZone: userTimeZone }); // "en-CA" gives YYYY-MM-DD format
  
      console.log("sessionDate", localDate)
  
      // Calculate new total for this date
      const currentTotal = studyData.totalStudyTime[localDate] || 0
      const newTotal = currentTotal + minutes
  
      setStudyData((prev) => ({
        ...prev,
        sessions: [...prev.sessions, newSession],
        totalStudyTime: {
          ...prev.totalStudyTime,
          [localDate]: newTotal,
        },
      }))
  
      // Update Firebase
      const userRef = ref(database, `users/${user.uid}`)
      await set(ref(database, `users/${user.uid}/studySessions/${localDate}/${newSession.id}`), {
        minutes: newSession.minutes,
        timestamp: newSession.timestamp,
      })
      await set(ref(database, `users/${user.uid}/totalStudyTime/${localDate}`), newTotal)
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

