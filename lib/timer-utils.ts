export interface StopwatchTimeParts {
  hours: number
  minutes: number
  seconds: number
}

export function splitElapsedSeconds(elapsedSeconds: number): StopwatchTimeParts {
  const safeElapsedSeconds = Math.max(0, Math.floor(elapsedSeconds))

  return {
    hours: Math.floor(safeElapsedSeconds / 3600),
    minutes: Math.floor((safeElapsedSeconds % 3600) / 60),
    seconds: safeElapsedSeconds % 60,
  }
}

export function calculateElapsedSeconds(
  elapsedBeforeStart: number,
  startedAtMs: number | null,
  nowMs: number,
): number {
  const baseSeconds = Math.max(0, Math.floor(elapsedBeforeStart))

  if (startedAtMs === null) {
    return baseSeconds
  }

  const runningSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
  return baseSeconds + runningSeconds
}
