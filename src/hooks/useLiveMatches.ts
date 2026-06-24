import { useQuery } from '@tanstack/react-query';
import { fetchMatchesForDate, fetchMatchIncidents, type WCEvent, type Incident } from '../lib/api';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export type MatchWithIncidents = WCEvent & { incidents: Incident[] };

export function useTodayMatches() {
  return useQuery({
    queryKey: ['wc-matches', todayStr()],
    queryFn: () => fetchMatchesForDate(todayStr()),
    staleTime: 2 * 60 * 1000,
    refetchInterval: (query) => {
      const matches = query.state.data ?? [];
      const hasLive = matches.some((m) => m.status.type === 'inprogress');
      return hasLive ? 60_000 : 5 * 60_000;
    },
  });
}

export function useMatchIncidents(eventId: number | null) {
  return useQuery({
    queryKey: ['incidents', eventId],
    queryFn: () => fetchMatchIncidents(eventId!),
    enabled: eventId !== null,
    staleTime: 60_000,
  });
}
