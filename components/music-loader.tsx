"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Music, Book, Coffee, Moon, Leaf, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MusicWidgetProps {
  isEnabled: boolean
}

type ChannelType = keyof typeof CHANNELS | null

const CHANNELS = {
  lofi: "jfKfPfyJRdk",        // Lofi Girl
  classical: "y6TZHLAzg5o",   // Classical Music
  nature: "l6J0ylYTO4s",      // Nature Sounds
  jazz: "fTb6yJ7AlT8",        // Jazz
} as const

export default function MusicWidget({ isEnabled }: MusicWidgetProps) {
  const [channel, setChannel] = useState<ChannelType>(null)
  
  if (!isEnabled) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={channel ? "bg-primary/10" : ""}
          >
            <Music className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setChannel(null)}>
            <X className="h-4 w-4 mr-2" />
            None
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setChannel("lofi")}>
            <Moon className="h-4 w-4 mr-2" />
            Lofi Music
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setChannel("classical")}>
            <Book className="h-4 w-4 mr-2" />
            Classical
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setChannel("nature")}>
            <Leaf className="h-4 w-4 mr-2" />
            Nature Sounds
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setChannel("jazz")}>
            <Coffee className="h-4 w-4 mr-2" />
            Jazz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {channel && (
        <iframe
          src={`https://www.youtube.com/embed/${CHANNELS[channel]}?controls=0&showinfo=0&modestbranding=1&autoplay=1&rel=0`}
          width="1"
          height="1"
          style={{ opacity: 0, position: 'absolute' }}
          allow="autoplay"
        />
      )}
    </div>
  )
} 