"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Music, Book, Coffee, Moon, Leaf, X, Youtube, Pause, Play } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface MusicWidgetProps {
  isEnabled: boolean
}

// Update channel type to support custom channels
type ChannelType = keyof typeof CHANNELS | string | null

// Interface for custom channel
interface CustomChannel {
  id: string;
  name: string;
}

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
  const [isPaused, setIsPaused] = useState(false)
  const playerRef = useRef<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([])

  // Load custom channels from localStorage
  useEffect(() => {
    if (isEnabled) {
      try {
        const storedChannels = localStorage.getItem('customYoutubeChannels');
        if (storedChannels) {
          setCustomChannels(JSON.parse(storedChannels));
        }
      } catch (error) {
        console.debug('Error loading custom channels:', error);
      }
    }
  }, [isEnabled]);

  // Listen for changes to localStorage
  useEffect(() => {
    if (!isEnabled) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'customYoutubeChannels') {
        try {
          const newChannels = e.newValue ? JSON.parse(e.newValue) : [];
          setCustomChannels(newChannels);
        } catch (error) {
          console.debug('Error parsing custom channels:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isEnabled]);

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

  // Get video ID based on channel selection
  const getVideoId = (selectedChannel: ChannelType): string | null => {
    if (!selectedChannel) return null;
    
    // Check if it's a predefined channel
    if (selectedChannel in CHANNELS) {
      return CHANNELS[selectedChannel as keyof typeof CHANNELS];
    }
    
    // Check if it's a custom channel
    const customChannel = customChannels.find(c => c.name === selectedChannel);
    return customChannel ? customChannel.id : null;
  };

  // Handle player initialization and channel changes
  useEffect(() => {
    if (!isEnabled || !isPlayerReady) return;

    const setupPlayer = () => {
      const videoId = getVideoId(channel);
      
      if (videoId) {
        if (playerRef.current) {
          try {
            // If player exists, load new video
            playerRef.current.loadVideoById({
              videoId: videoId,
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
              videoId: videoId,
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
  }, [channel, isEnabled, isPlayerReady, customChannels]);

  // Function to remove a custom channel
  const removeCustomChannel = (channelName: string) => {
    const updatedChannels = customChannels.filter(c => c.name !== channelName);
    setCustomChannels(updatedChannels);
    localStorage.setItem('customYoutubeChannels', JSON.stringify(updatedChannels));
    
    // If currently playing this channel, stop it
    if (channel === channelName) {
      setChannel(null);
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!playerRef.current) return;
    
    try {
      if (isPaused) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
      setIsPaused(!isPaused);
    } catch (error) {
      console.debug('YouTube player play/pause error:', error);
    }
  };

  // Handle exit
  const handleExit = () => {
    setChannel(null);
    setIsPaused(false);
  };

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="inline-flex rounded-md shadow-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                channel ? "bg-primary/10" : "",
                "rounded-r-none",
                channel && "border-r-0"
              )}
            >
              <Music className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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
            
            {customChannels.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {customChannels.map((customChannel, index) => (
                  <DropdownMenuItem 
                    key={index}
                    className="flex justify-between items-center group"
                  >
                    <div className="flex items-center" onClick={() => setChannel(customChannel.name)}>
                      <Youtube className="h-4 w-4 mr-2" />
                      <span>{customChannel.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomChannel(customChannel.name);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {channel && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              className={cn(
                "bg-primary/10 rounded-none border-l-0",
                "border-r-0"
              )}
            >
              {isPaused ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExit}
              className="bg-primary/10 rounded-l-none border-l-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
      
      <div id="youtube-player" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
    </div>
  )
} 