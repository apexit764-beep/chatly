import type { TemplateButton, TemplateButtonType } from '@/types';

export const templateButtonTypeLabel: Record<TemplateButtonType, string> = {
  quick_reply: 'رد سريع',
  url: 'رابط',
  phone: 'اتصال',
  copy_code: 'نسخ كود',
};

/** What the customer gets from a tap — shown under each button while editing. */
export const templateButtonTypeHint: Record<TemplateButtonType, string> = {
  quick_reply: 'يُرسل نص الزر كرد من العميل، ويظهر في «المحادثات» في النظام.',
  url: 'يفتح الرابط في المتصفح.',
  phone: 'يفتح شاشة الاتصال بالرقم المحدد.',
  copy_code: 'ينسخ الكود ويبقى العميل في المحادثة.',
};

/** Meta's caps per template: 10 buttons in all, and fewer of the kinds that leave the chat. */
export const MAX_TEMPLATE_BUTTONS = 10;
export const templateButtonTypeMax: Record<TemplateButtonType, number> = {
  quick_reply: 10,
  url: 2,
  phone: 1,
  copy_code: 1,
};

export const BUTTON_TEXT_MAX = 25;
export const COUPON_CODE_MAX = 15;

export function emptyTemplateButton(type: TemplateButtonType = 'quick_reply'): TemplateButton {
  return { type, text: '' };
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** A phone button's number with spaces and dashes dropped: "+968 9999-1111" → "+96899991111". */
export function compactPhone(value: string): string {
  return value.replace(/[\s-]/g, '');
}

/** "+" then a country code and the number — 8 to 15 digits in all (E.164). */
export function isValidIntlPhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(compactPhone(value));
}

export interface TemplateButtonErrors {
  text?: string;
  target?: string;
}

/** Why a button can't be saved, per field; empty when it can. A quick reply needs only its text. */
export function validateTemplateButton(b: TemplateButton): TemplateButtonErrors {
  const e: TemplateButtonErrors = {};
  if (!b.text.trim()) e.text = 'نص الزر مطلوب';
  if (b.type === 'url') {
    if (!b.url?.trim()) e.target = 'الرابط مطلوب';
    else if (!isValidHttpUrl(b.url)) e.target = 'رابط غير صحيح — يبدأ بـ https://';
  } else if (b.type === 'phone') {
    if (!b.phone?.trim()) e.target = 'رقم الاتصال مطلوب';
    else if (!isValidIntlPhone(b.phone)) e.target = 'أدخل الرقم بمفتاح الدولة، مثل ‎+968 9999 1111';
  } else if (b.type === 'copy_code') {
    if (!b.code?.trim()) e.target = 'الكود مطلوب';
    else if (/\s/.test(b.code.trim())) e.target = 'الكود بدون مسافات';
  }
  return e;
}

/** Keeps only the destination that belongs to the button's type, trimmed. */
export function cleanTemplateButton(b: TemplateButton): TemplateButton {
  const out: TemplateButton = { type: b.type, text: b.text.trim() };
  if (b.type === 'url') out.url = b.url?.trim();
  if (b.type === 'phone') out.phone = b.phone?.trim();
  if (b.type === 'copy_code') out.code = b.code?.trim();
  return out;
}
