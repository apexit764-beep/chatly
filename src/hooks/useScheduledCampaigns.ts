import { useEffect } from 'react';
import { useDataStore } from '@/store/useDataStore';

/** Every 15 seconds — fine-grained enough for a campaign scheduled to the minute. */
const TICK_MS = 15 * 1000;

/**
 * Runs scheduled template campaigns as their time comes. One whose WhatsApp
 * template Meta has paused or disabled in the meantime is not sent and is
 * recorded as failed (see settleDueCampaigns).
 */
export function useScheduledCampaigns(): void {
  useEffect(() => {
    const tick = (): void => useDataStore.getState().settleDueCampaigns();
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
}
