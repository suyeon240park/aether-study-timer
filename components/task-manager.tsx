"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Define the Task interface
interface Task {
  id: string
  text: string
  completed: boolean
  animating?: boolean
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskText, setNewTaskText] = useState("")
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("study-timer-tasks")
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks))
      } catch (error) {
        console.error("Failed to parse saved tasks:", error)
      }
    }
  }, [])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("study-timer-tasks", JSON.stringify(tasks))
  }, [tasks])

  // Add a new task
  const addTask = () => {
    if (!newTaskText.trim()) return
    if (tasks.length >= 3) return // Limit to 3 tasks

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
    }

    setTasks([...tasks, newTask])
    setNewTaskText("")

    // Focus the input after adding a task
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Delete a task
  const deleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  // Update the toggleTaskCompletion function to remove tasks after completion with animation
  const toggleTaskCompletion = (id: string) => {
    // First check if the task is already completed
    const task = tasks.find((t) => t.id === id)
    if (task?.completed) {
      // If unchecking, just update the state
      setTasks(
        tasks.map((task) => {
          if (task.id === id) {
            return { ...task, completed: false }
          }
          return task
        }),
      )
      return
    }

    // If checking (completing) the task
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          // Play sound when task is marked as complete
          const audio = new Audio("/sounds/task-complete.mp3")
          audio.volume = 0.5
          audio.play().catch((err) => console.error("Error playing sound:", err))

          // Mark as completed and add animating class
          return { ...task, completed: true, animating: true }
        }
        return task
      }),
    )

    // Remove the task after animation completes
    setTimeout(() => {
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id))
    }, 600) // Match this with the animation duration
  }

  // Handle drag start
  const handleDragStart = (id: string) => {
    setDraggedTaskId(id)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== dragOverTaskId) {
      setDragOverTaskId(id)
    }
  }

  // Handle drop to reorder tasks
  const handleDrop = () => {
    if (!draggedTaskId || !dragOverTaskId || draggedTaskId === dragOverTaskId) {
      setDraggedTaskId(null)
      setDragOverTaskId(null)
      return
    }

    const draggedTaskIndex = tasks.findIndex((task) => task.id === draggedTaskId)
    const dropTaskIndex = tasks.findIndex((task) => task.id === dragOverTaskId)

    if (draggedTaskIndex === -1 || dropTaskIndex === -1) return

    // Create a new array with the reordered tasks
    const newTasks = [...tasks]
    const [draggedTask] = newTasks.splice(draggedTaskIndex, 1)
    newTasks.splice(dropTaskIndex, 0, draggedTask)

    setTasks(newTasks)
    setDraggedTaskId(null)
    setDragOverTaskId(null)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverTaskId(null)
  }

  // Handle key press in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTask()
    }
  }

  return (
    <Card className="mt-8 max-w-md w-full mx-auto">
      <CardContent className="p-4">
        {/* Task list */}
        <div className="space-y-2 mb-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border cursor-grab transition-all duration-500",
                dragOverTaskId === task.id && "border-primary bg-primary/5",
                task.completed && "bg-muted/30",
                task.animating && "opacity-0 transform translate-x-4 scale-95",
              )}
              draggable
              onDragStart={() => handleDragStart(task.id)}
              onDragOver={(e) => handleDragOver(e, task.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTaskCompletion(task.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <span
                className={cn(
                  "flex-1 text-sm transition-all duration-300",
                  task.completed && "line-through text-muted-foreground",
                )}
              >
                {task.text}
              </span>
              <button
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex items-center justify-center"
                onClick={() => deleteTask(task.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Delete task</span>
              </button>
            </div>
          ))}
        </div>

        {/* Add task form - only show if under the limit */}
        {tasks.length < 3 && (
          <Input
            ref={inputRef}
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add a task..."
            className="flex-1"
          />
        )}
      </CardContent>
    </Card>
  )
}

