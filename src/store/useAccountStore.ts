import { create } from 'zustand';

export type AuthProvider = 'google' | 'apple';

export interface AccountRecord {
  email: string;
  name: string;
  /** Identity providers linked to this one account. */
  providers: AuthProvider[];
  /** Set once, when the account is created. Never overwritten. */
  termsAcceptedAt?: string;
  /** A provider sign-in proves the address; so does passing the signup OTP. */
  emailVerifiedAt?: string;
  /**
   * Bumped to cut every session that is not the one doing the bumping. A real
   * backend compares this against a claim in the session token.
   */
  sessionEpoch: number;
}

type OtpPurpose = 'signup' | 'reset';

interface OtpChallenge {
  email: string;
  purpose: OtpPurpose;
  code: string;
  attempts: number;
  expiresAt: number;
  /** A passed challenge cannot be passed twice. */
  consumedAt?: number;
}

interface ResetToken {
  token: string;
  email: string;
  expiresAt: number;
  consumedAt?: number;
}

export const OTP_LENGTH = 6;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
const OTP_TTL_MS = 10 * 60 * 1000;
/** Deliberately short: it exists only to carry the user from the code to the form. */
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

const ACCOUNTS_KEY = 'qhub_accounts';

function readAccounts(): Record<string, AccountRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AccountRecord>) : {};
  } catch {
    return {};
  }
}

function persistAccounts(map: Record<string, AccountRecord>): void {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map)); } catch {/*ignore*/}
}

const normalize = (email: string): string => email.trim().toLowerCase();

const randomCode = (): string =>
  String(Math.floor(Math.random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

const randomToken = (): string =>
  `rst_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

interface AccountState {
  accounts: Record<string, AccountRecord>;
  /** At most one challenge is live at a time — a new one replaces the old. */
  challenge: OtpChallenge | null;
  resetToken: ResetToken | null;
  /**
   * DEMO ONLY. A server mails the code and never returns it. This exists so the
   * flow can be walked without a mail server, and is the one thing to delete when
   * a real backend lands.
   */
  lastIssuedCode: string | null;

  findAccount: (email: string) => AccountRecord | null;
  /** Creates on first sight, merges after. `termsAcceptedAt` is never overwritten. */
  upsertAccount: (email: string, patch: Partial<Omit<AccountRecord, 'email'>>) => AccountRecord;

  /** Issues a code and returns the epoch ms until which resending is refused. */
  startOtp: (email: string, purpose: OtpPurpose) => number;
  verifyOtp: (code: string) => { ok: boolean; error?: string; resetToken?: string };

  consumeResetToken: (token: string) => { ok: boolean; email?: string; error?: string };
  /** Cuts every other session for this account. */
  bumpSessionEpoch: (email: string) => void;

  /**
   * Sign in through Google or Apple. `name` is what the provider handed over —
   * Apple only ever sends it on the very first authorization, so an empty one
   * after that must not erase the stored name.
   */
  signInWithProvider: (
    provider: AuthProvider,
    profile: { email: string; name?: string },
  ) => { account: AccountRecord; linkedToExisting: boolean };
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: readAccounts(),
  challenge: null,
  resetToken: null,
  lastIssuedCode: null,

  findAccount: (email) => get().accounts[normalize(email)] ?? null,

  upsertAccount: (email, patch) => {
    const key = normalize(email);
    const existing = get().accounts[key];
    const next: AccountRecord = {
      email: key,
      name: patch.name?.trim() || existing?.name || '',
      providers: patch.providers ?? existing?.providers ?? [],
      // Consent is a fact about a moment; re-signing must not move its timestamp.
      termsAcceptedAt: existing?.termsAcceptedAt ?? patch.termsAcceptedAt,
      emailVerifiedAt: patch.emailVerifiedAt ?? existing?.emailVerifiedAt,
      sessionEpoch: patch.sessionEpoch ?? existing?.sessionEpoch ?? 1,
    };
    const map = { ...get().accounts, [key]: next };
    persistAccounts(map);
    set({ accounts: map });
    return next;
  },

  startOtp: (email, purpose) => {
    const code = randomCode();
    set({
      challenge: {
        email: normalize(email),
        purpose,
        code,
        attempts: 0,
        expiresAt: Date.now() + OTP_TTL_MS,
      },
      lastIssuedCode: code,
    });
    return Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
  },

  verifyOtp: (code) => {
    const challenge = get().challenge;
    if (!challenge) return { ok: false, error: 'انتهت الجلسة، اطلب رمزاً جديداً' };
    if (challenge.consumedAt) return { ok: false, error: 'تم استخدام هذا الرمز، اطلب رمزاً جديداً' };
    if (Date.now() > challenge.expiresAt) {
      return { ok: false, error: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' };
    }
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      return { ok: false, error: 'تم تجاوز عدد المحاولات، اطلب رمزاً جديداً' };
    }

    if (code !== challenge.code) {
      const attempts = challenge.attempts + 1;
      set({ challenge: { ...challenge, attempts } });
      const left = MAX_OTP_ATTEMPTS - attempts;
      return {
        ok: false,
        error: left > 0
          ? `رمز غير صحيح — تبقّى ${left} ${left === 1 ? 'محاولة' : 'محاولات'}`
          : 'تم تجاوز عدد المحاولات، اطلب رمزاً جديداً',
      };
    }

    // Burn the challenge before anything else, so a replay finds it spent.
    set({ challenge: { ...challenge, consumedAt: Date.now() } });
    get().upsertAccount(challenge.email, { emailVerifiedAt: new Date().toISOString() });

    if (challenge.purpose !== 'reset') return { ok: true };

    const token: ResetToken = {
      token: randomToken(),
      email: challenge.email,
      expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    };
    set({ resetToken: token });
    return { ok: true, resetToken: token.token };
  },

  consumeResetToken: (token) => {
    const held = get().resetToken;
    if (!held || held.token !== token) return { ok: false, error: 'رابط غير صالح' };
    if (held.consumedAt) return { ok: false, error: 'تم استخدام هذا الرابط مسبقاً' };
    if (Date.now() > held.expiresAt) return { ok: false, error: 'انتهت صلاحية الرابط، أعد المحاولة' };
    set({ resetToken: { ...held, consumedAt: Date.now() } });
    return { ok: true, email: held.email };
  },

  bumpSessionEpoch: (email) => {
    const key = normalize(email);
    const existing = get().accounts[key];
    if (!existing) return;
    const map = { ...get().accounts, [key]: { ...existing, sessionEpoch: existing.sessionEpoch + 1 } };
    persistAccounts(map);
    set({ accounts: map });
  },

  signInWithProvider: (provider, profile) => {
    const key = normalize(profile.email);
    const existing = get().accounts[key];
    const account = get().upsertAccount(key, {
      // The stored name wins. Apple hands its name over on the first authorization
      // and never again, so a later sign-in must not blank it — and no provider
      // should overwrite a name the account already has, which is the user's own.
      name: existing?.name || profile.name?.trim() || '',
      // The address is matched, so the provider attaches to the account that already
      // owns it rather than standing up a second account on the same email.
      providers: existing?.providers.includes(provider)
        ? existing.providers
        : [...(existing?.providers ?? []), provider],
      // The provider vouched for the address; no separate email OTP is owed.
      emailVerifiedAt: existing?.emailVerifiedAt ?? new Date().toISOString(),
      termsAcceptedAt: existing?.termsAcceptedAt ?? new Date().toISOString(),
    });
    return { account, linkedToExisting: Boolean(existing) };
  },
}));
