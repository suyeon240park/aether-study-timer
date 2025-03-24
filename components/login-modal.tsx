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
}

export default function LoginModal({
  open,
  onOpenChange,
  title = "Sign in to continue",
  description = "Sign in to save your progress and access all features.",
}: LoginModalProps) {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
      onOpenChange(false)
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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

