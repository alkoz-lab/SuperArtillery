/** Opaque handle returned by the host's interval scheduler. */
export type TimerHandle = unknown;

export interface TimerScheduler {
  setInterval(callback: () => void, milliseconds: number): TimerHandle;
  clearInterval(timer: TimerHandle): void;
}
