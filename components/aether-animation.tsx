"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Diamond } from "lucide-react"

interface AetherAnimationProps {
  startPosition: { x: number; y: number }
  endPosition: { x: number; y: number }
  onComplete: () => void
  aetherCount: number
}

export default function AetherAnimation({
  startPosition,
  endPosition,
  onComplete,
  aetherCount = 1,
}: AetherAnimationProps) {
  const [aethers, setAethers] = useState<Array<{ id: number; style: React.CSSProperties }>>([])
  const animationCompleteCount = useRef(0)
  const soundsPlayed = useRef(0)

  // Create sound effect with a delay to allow for session-end sound to play first
  const playAetherSound = (delay = 0) => {
    setTimeout(() => {
      const audio = new Audio("/aether-collect.mp3")
      audio.volume = 0.3
      audio.play().catch((err) => console.error("Error playing sound:", err))
    }, delay)
  }

  useEffect(() => {
    const newAethers = Array.from({ length: aetherCount }, (_, i) => {
      const randomOffsetX = Math.random() * 60 - 30
      const randomOffsetY = Math.random() * 60 - 30
      const randomDelay = Math.random() * 0.5

      // Calculate the final translation
      const translateX = endPosition.x - startPosition.x
      const translateY = endPosition.y - startPosition.y

      return {
        id: i,
        style: {
          position: "fixed",
          left: `${startPosition.x + randomOffsetX}px`,
          top: `${startPosition.y + randomOffsetY}px`,
          zIndex: 100,
          transform: "scale(0)",
          opacity: 0,
          animation: `
            aetherAppear 0.3s ease-out ${randomDelay}s forwards,
            aetherFloat 0.8s ease-in-out ${0.3 + randomDelay}s forwards,
            aetherFlyToCorner 0.6s ease-in-out ${1.1 + randomDelay}s forwards
          `,
          '--final-x': `${translateX}px`,
          '--final-y': `${translateY}px`,
        } as React.CSSProperties,
      }
    })

    setAethers(newAethers)

    // Play sounds with staggered timing for multiple aethers
    if (aetherCount > 0) {
      // Initial delay to allow session-end sound to play first
      const initialDelay = 500

      // Play sounds with slight overlap for multiple aethers
      for (let i = 0; i < Math.min(aetherCount, 3); i++) {
        playAetherSound(initialDelay + i * 150)
      }
    }

    // Clean up after animation completes
    const timer = setTimeout(() => {
      onComplete()
    }, 2000) // Slightly longer than the total animation duration

    return () => clearTimeout(timer)
  }, [startPosition, endPosition, aetherCount, onComplete])

  const handleAnimationEnd = (id: number) => {
    animationCompleteCount.current += 1

    // If all aethers have completed animation, we can clean up
    if (animationCompleteCount.current >= aetherCount) {
      setAethers([])
      animationCompleteCount.current = 0
      soundsPlayed.current = 0
    }
  }

  return (
    <>
      {aethers.map((aether) => (
        <Diamond
          key={aether.id}
          className="h-8 w-8 text-primary fill-primary/20 transform rotate-45 absolute"
          style={aether.style}
          onAnimationEnd={() => handleAnimationEnd(aether.id)}
        />
      ))}

      <style jsx global>{`
        @keyframes aetherAppear {
          0% {
            transform: scale(0) rotate(45deg);
            opacity: 0;
          }
          100% {
            transform: scale(1) rotate(45deg);
            opacity: 1;
          }
        }
        
        @keyframes aetherFloat {
          0% {
            transform: translate(0, 0) rotate(45deg);
          }
          50% {
            transform: translate(${Math.random() * 40 - 20}px, -20px) rotate(${Math.random() * 90 - 45 + 45}deg);
          }
          100% {
            transform: translate(${Math.random() * 40 - 20}px, -10px) rotate(${Math.random() * 90 - 45 + 45}deg);
          }
        }
        
        @keyframes aetherFlyToCorner {
          0% {
            transform: translate(${Math.random() * 40 - 20}px, -10px) rotate(${Math.random() * 90 - 45 + 45}deg);
          }
          100% {
            transform: translate(var(--final-x), var(--final-y)) scale(0.5) rotate(45deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
