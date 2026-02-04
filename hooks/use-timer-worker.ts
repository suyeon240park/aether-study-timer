"use client";

import { useEffect, useRef, useCallback } from 'react';

// Inline worker code as a string (avoids Next.js bundling issues)
const workerCode = `
let timerInterval = null;
let endTime = null;

self.onmessage = (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'START':
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      endTime = payload.endTime;
      
      // Check every 100ms (workers are not throttled in background)
      timerInterval = setInterval(() => {
        if (!endTime) return;
        
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        
        self.postMessage({
          type: 'TICK',
          payload: { remaining, now }
        });
        
        if (remaining === 0) {
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          endTime = null;
          
          self.postMessage({
            type: 'COMPLETE',
            payload: { now }
          });
        }
      }, 100);
      break;

    case 'STOP':
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      endTime = null;
      break;

    case 'UPDATE_END_TIME':
      endTime = payload.endTime;
      break;
  }
};
`;

interface TimerWorkerCallbacks {
  onTick: (remaining: number) => void;
  onComplete: () => void;
}

export function useTimerWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<TimerWorkerCallbacks | null>(null);

  // Initialize worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;

        switch (type) {
          case 'TICK':
            if (callbacksRef.current?.onTick) {
              callbacksRef.current.onTick(payload.remaining);
            }
            break;
          case 'COMPLETE':
            if (callbacksRef.current?.onComplete) {
              callbacksRef.current.onComplete();
            }
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Timer worker error:', error);
      };

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        URL.revokeObjectURL(workerUrl);
      };
    } catch (error) {
      console.error('Failed to create timer worker:', error);
    }
  }, []);

  const startTimer = useCallback((endTime: number, callbacks: TimerWorkerCallbacks) => {
    callbacksRef.current = callbacks;
    
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'START',
        payload: { endTime }
      });
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    callbacksRef.current = null;
  }, []);

  const updateEndTime = useCallback((endTime: number) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_END_TIME',
        payload: { endTime }
      });
    }
  }, []);

  const isSupported = typeof window !== 'undefined' && typeof Worker !== 'undefined';

  return {
    startTimer,
    stopTimer,
    updateEndTime,
    isSupported,
  };
}
