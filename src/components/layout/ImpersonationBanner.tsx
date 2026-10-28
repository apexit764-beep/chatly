import { ShieldAlert, LogOut } from 'lucide-react';
import { getImpersonation, stopImpersonation } from '@/utils/impersonation';

/**
 * Shown at the top of the client panel while a super-admin is signed in as a
 * company. Makes the impersonation obvious and offers a one-click way back.
 */
export function ImpersonationBanner(): JSX.Element | null {
  const imp = getImpersonation();
  if (!imp) return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-warning text-white text-small font-medium px-4 py-2 shrink-0">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span className="truncate">
        أنت الآن داخل لوحة «{imp.companyName}» كمسؤول
      </span>
      <button
        onClick={stopImpersonation}
        className="ms-1 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap"
      >
        <LogOut className="h-3.5 w-3.5" />
        العودة إلى لوحة التحكم
      </button>
    </div>
  );
}
