type P = { size?: number; className?: string };
const base = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const IconHome = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconCalendar = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconList = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
);
export const IconChart = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconUser = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>
);
export const IconSearch = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconChevronRight = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="m9 6 6 6-6 6" /></svg>
);
export const IconChevronLeft = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="m15 6-6 6 6 6" /></svg>
);
export const IconClose = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconPlay = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M7 4v16l13-8z" fill="currentColor" stroke="none" /></svg>
);
export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="m5 12 5 5L20 7" /></svg>
);
export const IconPlus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconTrash = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const IconFlame = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3s0 3 2 3c1 0 1-2 0-4-1-2 1-4 2-6z" /></svg>
);
export const IconSwap = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>
);
