// Small line icons (24px grid). They inherit the text colour.
type P = { size?: number; className?: string };

function Svg({ size = 20, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11.2 12 4l8.5 7.2" />
    <path d="M5.8 10v10h12.4V10" />
    <path d="M10 20v-5.2h4V20" />
  </Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M5 20v-7M12 20V5M19 20V10" />
    <path d="M3 20.5h18" />
  </Svg>
);
export const IconCar = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 15v-2.2l1.7-4.3A2 2 0 0 1 8.1 7.2h7.8a2 2 0 0 1 1.9 1.3l1.7 4.3V15" />
    <path d="M3.5 15h17v2.7a.8.8 0 0 1-.8.8h-1.6a.8.8 0 0 1-.8-.8V17H6.7v.7a.8.8 0 0 1-.8.8H4.3a.8.8 0 0 1-.8-.8z" />
    <circle cx="7.6" cy="12.6" r=".7" fill="currentColor" />
    <circle cx="16.4" cy="12.6" r=".7" fill="currentColor" />
  </Svg>
);
export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.2 5 6v5.4c0 4.1 2.9 7.5 7 9.4 4.1-1.9 7-5.3 7-9.4V6z" />
    <path d="m9.2 12 2.1 2.1 3.6-3.9" />
  </Svg>
);
export const IconDrop = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.2S6 9.6 6 14a6 6 0 0 0 12 0c0-4.4-6-10.8-6-10.8z" />
    <path d="M9.2 14.4a2.9 2.9 0 0 0 2.4 2.5" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.8-3.8" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z" />
    <circle cx="12" cy="13.5" r="3.3" />
  </Svg>
);
export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 20.5h-4a1.5 1.5 0 0 1-1.5-1.5V5a1.5 1.5 0 0 1 1.5-1.5h4" />
    <path d="m15.5 16.5 4.5-4.5-4.5-4.5M20 12H9.5" />
  </Svg>
);
export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5M5 20h14" />
  </Svg>
);
export const IconUpload = (p: P) => (
  <Svg {...p}>
    <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 20h14" />
  </Svg>
);
export const IconUserPlus = (p: P) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.5" r="3.3" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M18.5 8v6M15.5 11h6" />
  </Svg>
);
export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
