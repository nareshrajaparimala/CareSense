import { formatDistanceToNow, format } from 'date-fns';

export const relTime = (iso: string) =>
  formatDistanceToNow(new Date(iso), { addSuffix: true });

export const shortDate = (iso: string) => format(new Date(iso), 'MMM d');

export const fullDate = (iso: string) => format(new Date(iso), 'MMM d, yyyy h:mm a');

export const dayKey = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');
