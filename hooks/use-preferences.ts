import { useState, useEffect } from 'react';
import type { TimerType, PomodoroSettings } from '@/types/study';

const DEFAULT_POMODORO_SETTINGS = {
  focusTime: 25,
  shortBreakTime: 5,
  longBreakTime: 30,
  breakInterval: 4,
};

export function usePreferences() {
  const [isLoading, setIsLoading] = useState(true);
  const [timerType, setTimerType] = useState<TimerType>("default");
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        // Load timer type
        const savedTimerType = localStorage.getItem("timer-type");
        if (savedTimerType === "default" || savedTimerType === "pomodoro") {
          setTimerType(savedTimerType);
        }

        // Load Pomodoro settings
        const savedSettings = localStorage.getItem("pomodoro-settings");
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          if (
            typeof parsedSettings.focusTime === "number" &&
            typeof parsedSettings.shortBreakTime === "number" &&
            typeof parsedSettings.longBreakTime === "number" &&
            typeof parsedSettings.breakInterval === "number"
          ) {
            setPomodoroSettings(parsedSettings);
          }
        }

        // Load music preference
        const musicEnabled = localStorage.getItem("music-enabled");
        if (musicEnabled !== null) {
          setIsMusicEnabled(musicEnabled === "true");
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        // Short delay to prevent flash of default content
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    };

    loadPreferences();
  }, []);

  // Save timer type
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("timer-type", timerType);
    }
  }, [timerType, isLoading]);

  // Save Pomodoro settings
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("pomodoro-settings", JSON.stringify(pomodoroSettings));
    }
  }, [pomodoroSettings, isLoading]);

  // Save music preference
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("music-enabled", isMusicEnabled.toString());
    }
  }, [isMusicEnabled, isLoading]);

  return {
    isLoading,
    timerType,
    setTimerType,
    pomodoroSettings,
    setPomodoroSettings,
    isMusicEnabled,
    setIsMusicEnabled,
  };
} 