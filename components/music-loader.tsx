"use client"

import { useState, useEffect, useRef } from "react"
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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function MusicWidget({ isEnabled }: MusicWidgetProps) {
  const [channel, setChannel] = useState<ChannelType>(null)
  const playerRef = useRef<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  // Suppress YouTube console errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out YouTube-related errors
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('youtube') || 
         args[0].includes('www-embed-player') ||
         args[0].includes('youtubei'))
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!isEnabled) return;

    // Only load the API once
    if (window.YT) {
      setIsPlayerReady(true);
      return;
    }

    // Create YouTube API Script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Setup the callback when API is ready
    window.onYouTubeIframeAPIReady = () => {
      setIsPlayerReady(true);
    };
  }, [isEnabled]);

  // Handle player initialization and channel changes
  useEffect(() => {
    if (!isEnabled || !isPlayerReady) return;

    const setupPlayer = () => {
      if (channel) {
        if (playerRef.current) {
          try {
            // If player exists, load new video
            playerRef.current.loadVideoById({
              videoId: CHANNELS[channel],
              startSeconds: 0,
              suggestedQuality: 'tiny'
            });
          } catch (error) {
            // Silently handle any YouTube API errors
            console.debug('YouTube player load error:', error);
          }
        } else {
          try {
            // Create new player with minimal configuration
            playerRef.current = new window.YT.Player('youtube-player', {
              height: '1',
              width: '1',
              videoId: CHANNELS[channel],
              host: 'https://www.youtube-nocookie.com', // Privacy-enhanced mode
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                enablejsapi: 0, // Disable JS API to reduce tracking
                fs: 0,
                modestbranding: 1,
                origin: window.location.origin,
                playsinline: 1,
                rel: 0,
                showinfo: 0
              },
              events: {
                onReady: (event: any) => {
                  try {
                    event.target.setVolume(50);
                    event.target.playVideo();
                  } catch (error) {
                    console.debug('YouTube player ready error:', error);
                  }
                },
                onStateChange: (event: any) => {
                  try {
                    // If video ends, restart it (for non-live streams)
                    if (event.data === window.YT.PlayerState.ENDED) {
                      event.target.playVideo();
                    }
                  } catch (error) {
                    console.debug('YouTube player state change error:', error);
                  }
                }
              }
            });
          } catch (error) {
            console.debug('YouTube player creation error:', error);
          }
        }
      } else if (playerRef.current) {
        try {
          // Stop and destroy player when no channel is selected
          playerRef.current.stopVideo();
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (error) {
          console.debug('YouTube player cleanup error:', error);
        }
      }
    };

    setupPlayer();

    // Cleanup function
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (error) {
          console.debug('YouTube player cleanup error:', error);
        }
      }
    };
  }, [channel, isEnabled, isPlayerReady]);

  if (!isEnabled) return null;

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
      
      <div id="youtube-player" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
    </div>
  )
} 