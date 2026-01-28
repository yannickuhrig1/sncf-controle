import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to provide current date and time in Paris timezone
 * with automatic refresh every minute.
 */
export function useParisTime(refreshIntervalMs: number = 60000) {
  const getParisTime = useCallback(() => {
    const now = new Date();
    
    // Format date and time in Paris timezone
    const parisDate = now.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); // Format: YYYY-MM-DD
    const parisTime = now.toLocaleTimeString('fr-FR', { 
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }); // Format: HH:mm
    
    return { date: parisDate, time: parisTime };
  }, []);

  const [parisDateTime, setParisDateTime] = useState(getParisTime);

  useEffect(() => {
    // Update immediately
    setParisDateTime(getParisTime());

    // Set up interval for automatic refresh
    const intervalId = setInterval(() => {
      setParisDateTime(getParisTime());
    }, refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [getParisTime, refreshIntervalMs]);

  const refresh = useCallback(() => {
    setParisDateTime(getParisTime());
  }, [getParisTime]);

  return {
    date: parisDateTime.date,
    time: parisDateTime.time,
    refresh,
  };
}
