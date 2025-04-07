"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { FcGoogle } from "react-icons/fc"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  reason?: "statistics" | "rewards" | ""
  onLoginComplete?: () => void
}

export default function LoginModal({
  open,
  onOpenChange,
  title = "Sign in to continue",
  description = "Sign in to save your progress and access all features.",
  reason = "",
  onLoginComplete,
}: LoginModalProps) {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      onOpenChange(false)
      if (onLoginComplete) {
        onLoginComplete()
      }
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get customized description based on reason
  const getDescription = () => {
    if (reason === "statistics") {
      return "Sign in to view and track your study statistics across devices."
    } else if (reason === "rewards") {
      return "Sign in to access your Aether rewards and track your progress."
    }
    return description
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <FcGoogle size={20} />
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
          <div className="text-sm text-muted-foreground text-center">
            Your study data will be securely stored and synchronized across devices.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

