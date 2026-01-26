const DumbbellIcon = ({
  className = '',
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.5
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 18V6M18 18V6M3 8v8a1 1 0 001 1h2V7H4a1 1 0 00-1 1zM21 8v8a1 1 0 01-1 1h-2V7h2a1 1 0 011 1zM6 12h12" />
  </svg>
);

export default DumbbellIcon;
