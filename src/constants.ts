export type MoodId = 'productive' | 'focused' | 'neutral' | 'distracted' | 'burned-out';

export interface Mood {
  id: MoodId;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const MOODS: Record<MoodId, Mood> = {
  'productive': {
    id: 'productive',
    label: 'Productive',
    color: '#059669', // Emerald 600
    bgColor: 'bg-emerald-600',
    description: 'Crushing it. High output, high energy.'
  },
  'focused': {
    id: 'focused',
    label: 'Focused',
    color: '#5eead4', // Teal 300
    bgColor: 'bg-teal-300',
    description: 'In the zone. Low distractions, steady progress.'
  },
  'neutral': {
    id: 'neutral',
    label: 'Neutral',
    color: '#e2e8f0', // Slate 200
    bgColor: 'bg-slate-200',
    description: 'Doing OK. Not soaring, but not failing.'
  },
  'distracted': {
    id: 'distracted',
    label: 'Tired',
    color: '#fbbf24', // Amber 400
    bgColor: 'bg-amber-400',
    description: 'Body or mind is feeling heavy. Hard to stay focused.'
  },
  'burned-out': {
    id: 'burned-out',
    label: 'Burned Out',
    color: '#f43f5e', // Rose 500
    bgColor: 'bg-rose-500',
    description: 'Exhausted. Zero focus left.'
  }
};

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
