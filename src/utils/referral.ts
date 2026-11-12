/** Admin-controlled settings of the referral program — fixed here while the data is mock. */
export const REFERRAL_SETTINGS: {
  /** When off, the link disappears for clients; rewards already earned keep applying. */
  on: boolean;
  /** Reward months for each new monthly subscriber. */
  monthsMonthly: number;
  /** Reward months for each new annual subscriber. */
  monthsAnnual: number;
  linkBase: string;
} = {
  on: true,
  monthsMonthly: 1,
  monthsAnnual: 3,
  linkBase: 'qhub.chat/r/',
};

/** «شهر» · «شهران» · «3 شهور» · «11 شهرًا». */
export function monthsLabel(n: number): string {
  if (n === 1) return 'شهر';
  if (n === 2) return 'شهران';
  return n <= 10 ? `${n} شهور` : `${n} شهرًا`;
}
