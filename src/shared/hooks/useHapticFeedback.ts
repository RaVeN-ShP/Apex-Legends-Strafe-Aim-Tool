import { useCallback } from 'react';

export interface HapticFeedbackOptions {
  duration?: number | 'light' | 'medium' | 'heavy';
  intensity?: 'light' | 'medium' | 'heavy';
}

const HAPTIC_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 30,
} as const;

/**
 * Hook for providing haptic feedback on mobile devices
 * @param options Configuration for haptic feedback
 * @returns Function to trigger haptic feedback
 */
export function useHapticFeedback(options: HapticFeedbackOptions = {}) {
  const { duration = 'light', intensity = 'light' } = options;
  
  const triggerHaptic = useCallback(() => {
    // Check if we're on a mobile device and haptic feedback is supported
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    try {
      const vibrationDuration = typeof duration === 'number' 
        ? duration 
        : HAPTIC_PATTERNS[duration];
      
      (navigator as any).vibrate(vibrationDuration);
    } catch (error) {
      // Silently fail if vibration is not supported or blocked
      console.debug('Haptic feedback not available:', error);
    }
  }, [duration, intensity]);

  return triggerHaptic;
}

/**
 * Higher-order function to wrap button click handlers with haptic feedback
 * @param onClick Original click handler
 * @param hapticOptions Haptic feedback options
 * @returns New click handler that includes haptic feedback
 */
export function withHapticFeedback<T extends (...args: any[]) => any>(
  onClick: T,
  hapticOptions: HapticFeedbackOptions = {}
): T {
  const triggerHaptic = useHapticFeedback(hapticOptions);
  
  return ((...args: Parameters<T>) => {
    triggerHaptic();
    return onClick(...args);
  }) as T;
}
