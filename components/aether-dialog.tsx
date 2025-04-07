"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { StudyData } from "@/types/study"
import { useAuth } from "@/contexts/auth-context"
import { Award, Star, Zap } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"

interface AetherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyData: StudyData
}

// Level and title definitions
interface LevelTitle {
  minLevel: number
  maxLevel: number
  title: string
}

const levelTitles: LevelTitle[] = [
  { minLevel: 1, maxLevel: 4, title: "Novice Scholar" },
  { minLevel: 5, maxLevel: 9, title: "Focused Apprentice" },
  { minLevel: 10, maxLevel: 14, title: "Study Strategist" },
  { minLevel: 15, maxLevel: 19, title: "Master of Pomodoro" },
  { minLevel: 20, maxLevel: Infinity, title: "Timelord of Productivity" }
]

// Function to calculate XP needed for each level (exponential growth)
const calculateXpForLevel = (level: number): number => {
  // Base XP for level 1 is 60 (1 hour)
  const baseXp = 60
  // Growth factor (makes leveling progressively harder)
  const growthFactor = 1.5
  
  if (level <= 1) return 0
  
  // Calculate total XP needed to reach this level
  return Math.floor(baseXp * (Math.pow(growthFactor, level - 1) - 1) / (growthFactor - 1))
}

export default function AetherDialog({ open, onOpenChange, studyData }: AetherDialogProps) {
  // Get user information from auth context
  const { user } = useAuth()
  const username = user?.displayName || "Aether User"
  const userPhotoURL = user?.photoURL
  
  // Calculate total study time in minutes (for XP calculation)
  const totalStudyMinutes = useMemo(() => {
    return Object.values(studyData.totalStudyTime).reduce((sum, minutes) => sum + minutes, 0)
  }, [studyData.totalStudyTime])
  
  // Calculate level based on total study minutes (1 hour = 60 minutes = 60 XP)
  const calculateLevel = useCallback(() => {
    const xp = totalStudyMinutes
    let level = 1
    
    while (calculateXpForLevel(level + 1) <= xp) {
      level++
    }
    
    return level
  }, [totalStudyMinutes])
  
  // Get current title based on level
  const getUserTitle = useCallback((level: number) => {
    const levelInfo = levelTitles.find(
      lt => level >= lt.minLevel && level <= lt.maxLevel
    )
    return levelInfo?.title || "Aether Scholar"
  }, [])
  
  // Get current level, title and XP progress
  const userLevel = useMemo(() => calculateLevel(), [calculateLevel])
  const userTitle = useMemo(() => getUserTitle(userLevel), [getUserTitle, userLevel])
  
  // Calculate XP progress to next level
  const xpProgress = useMemo(() => {
    const currentLevelXp = calculateXpForLevel(userLevel)
    const nextLevelXp = calculateXpForLevel(userLevel + 1)
    const xpForCurrentLevel = nextLevelXp - currentLevelXp
    const currentXpInLevel = totalStudyMinutes - currentLevelXp
    
    return {
      current: currentXpInLevel,
      total: xpForCurrentLevel,
      percentage: Math.min(100, Math.round((currentXpInLevel / xpForCurrentLevel) * 100))
    }
  }, [userLevel, totalStudyMinutes])

  // Animation state for when aethers are added
  const [isAetherAnimating, setIsAetherAnimating] = useState(false)
  
  // Trigger an animation when aethers change
  useEffect(() => {
    setIsAetherAnimating(true)
    const timer = setTimeout(() => setIsAetherAnimating(false), 1000)
    return () => clearTimeout(timer)
  }, [studyData.aethers])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-2xl font-bold mb-4">Your Profile</DialogTitle>
        
        <Card className="shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary/90 to-primary/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="relative">
                  {userPhotoURL ? (
                    <img 
                      src={userPhotoURL} 
                      alt={username} 
                      className="w-16 h-16 rounded-full border-2 border-background object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-background/90 flex items-center justify-center text-primary text-2xl font-bold border-2 border-background">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 border-2 border-background">
                    <Zap className="h-4 w-4 text-background" />
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-background text-xl font-semibold">{username}</div>
                  <div className="flex items-center">
                    <div className="bg-background/20 text-background rounded-full px-2 py-0.5 text-sm font-medium flex items-center">
                      <Award className="h-3.5 w-3.5 mr-1" />
                      Level {userLevel}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-background/90 text-sm">Total XP</div>
                <div className={`text-background font-bold text-xl ${isAetherAnimating ? 'animate-pulse' : ''}`}>
                  {studyData.aethers} Aether
                </div>
              </div>
            </div>
          </div>
          <CardContent className="pt-4 pb-5">
            <div className="flex items-center mb-2">
              <Star className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="text-lg font-semibold">{userTitle}</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-1">
              {xpProgress.current}/{xpProgress.total} XP to Level {userLevel + 1}
            </div>
            <Progress value={xpProgress.percentage} className="h-2.5 mt-1" />
          </CardContent>
        </Card>
        
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium">About Aethers</h3>
          <p className="text-sm text-muted-foreground">
            Aethers are your study reward. Each hour (60 minutes) of focused study earns you 1 Aether.
            Gather more to level up and unlock new titles!
          </p>
          
          <div className="bg-muted/40 rounded-md p-3">
            <h4 className="font-medium mb-1">Available Titles</h4>
            <ul className="space-y-2 text-sm">
              {levelTitles.map((title, index) => (
                <li key={index} className={`flex items-center ${userLevel >= title.minLevel && userLevel <= title.maxLevel ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {userLevel >= title.minLevel && userLevel <= title.maxLevel && (
                    <Star className="h-3.5 w-3.5 text-yellow-500 mr-1.5" />
                  )}
                  <span className={userLevel >= title.minLevel && userLevel <= title.maxLevel ? 'ml-0' : 'ml-5'}>
                    {title.title} {title.maxLevel < Infinity ? `(Level ${title.minLevel}-${title.maxLevel})` : `(Level ${title.minLevel}+)`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 