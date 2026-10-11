import type { Channel } from '@/types';

/** Meta's error for a WhatsApp Business account without a valid payment method ("Business eligibility payment issue"). */
export const META_PAYMENT_ERROR_CODE = 131042;

export type CampaignSendResult = { ok: true } | { ok: false; code: number };

/**
 * Hands a WhatsApp campaign to Meta and reports whether Meta took it.
 *
 * The backend makes the real call, and Meta can return 131042 two ways: in
 * the send response itself, or a few seconds later as a `failed` status on
 * the webhook (the usual case for templates and campaigns). The backend has
 * to catch both and answer with `{ ok: false, code: 131042 }` either way.
 *
 * Demo: no backend yet, so an account flagged `demoMetaPaymentMissing` fails
 * with 131042 after a short delay, and every other account succeeds.
 */
export function sendWhatsAppCampaign(sender: Channel | undefined): Promise<CampaignSendResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(sender?.demoMetaPaymentMissing ? { ok: false, code: META_PAYMENT_ERROR_CODE } : { ok: true });
    }, 700);
  });
}
