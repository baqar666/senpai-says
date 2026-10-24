export type ToneType = 'ringtone' | 'notification' | 'alarm';

// A screen-time warning: how many times she has stopped you today, and in which app.
export type GuardTrigger = { level: number; pkg: string };
export type GuardStatus = { usedMinutes: number; limitMinutes: number; level: number };
