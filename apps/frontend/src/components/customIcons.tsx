type Menu01Props = {
  size: string;
};

export const MenuIcon = ({ size }: Menu01Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
  >
    <title>menu</title>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M4 5h16M4 12h16M4 19h16"
      color="currentColor"
    />
  </svg>
);
type Time02Props = {
  size: string;
};

export const ClockIcon = ({ size }: Time02Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <title>clock</title>
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      color="currentColor"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10" />
      <path d="M12.008 10.508a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m0 0V7m3.007 8.02l-1.949-1.948" />
    </g>
  </svg>
);
type Loading02Props = {
  size: string;
  className?: string;
};

export const LoadingSpinnerIcon = ({ size ,className}: Loading02Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
  >
    <title>loading</title>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M18.001 20A9.96 9.96 0 0 1 12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10c0 .863-.11 1.701-.315 2.5c-.223.867-1.17 1.27-2.015.973c-.718-.253-1.048-1.073-.868-1.813A7 7 0 1 0 15.608 18"
      color="currentColor"
    />
  </svg>
);
type Clock04Props = {
    size: string;
};
      
export const HistoryIcon = ({ size }: Clock04Props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" color="currentColor"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2C7.522 2 3.774 4.943 2.5 9H5"/><path d="M12 8v4l2 2M2 12q0 .505.045 1M9 22a10 10 0 0 1-1-.392M3.21 17a11 11 0 0 1-.515-1.154m2.136 3.46q.46.495.977.923"/></g></svg>
);