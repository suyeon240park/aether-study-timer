"use client"

import { useEffect, useRef } from "react"

interface DonutChartProps {
  percentage: number
  size?: number
  strokeWidth?: number
  primaryColor?: string
  secondaryColor?: string
}

export default function DonutChart({
  percentage,
  size = 80,
  strokeWidth = 10,
  primaryColor = "hsl(var(--primary))",
  secondaryColor = "hsl(var(--muted))",
}: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Set up animation
    let currentPercentage = 0
    const animationDuration = 800 // ms
    const startTime = performance.now()

    const animate = (time: number) => {
      // Calculate progress (0 to 1)
      const elapsed = time - startTime
      const progress = Math.min(elapsed / animationDuration, 1)

      // Calculate current percentage for animation
      currentPercentage = progress * percentage

      // Clear canvas
      ctx.clearRect(0, 0, size, size)

      // Draw background circle (remaining)
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, (size - strokeWidth) / 2, 0, Math.PI * 2)
      ctx.strokeStyle = secondaryColor
      ctx.lineWidth = strokeWidth
      ctx.stroke()

      // Draw progress arc (completed)
      if (currentPercentage > 0) {
        ctx.beginPath()
        ctx.arc(
          size / 2,
          size / 2,
          (size - strokeWidth) / 2,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * currentPercentage) / 100,
        )
        ctx.strokeStyle = primaryColor
        ctx.lineWidth = strokeWidth
        ctx.stroke()
      }

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [percentage, size, strokeWidth, primaryColor, secondaryColor])

  return <canvas ref={canvasRef} width={size} height={size} className="w-20 h-20" />
}

