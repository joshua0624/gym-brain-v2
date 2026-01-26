const SettingsIcon = ({
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
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M6 12H1m11 0h6" />
    <path d="m16.24 7.76l-2.12 2.12m-4.24 4.24l-2.12 2.12m8.48-8.48l2.12-2.12M7.76 16.24l-2.12 2.12" />
  </svg>
);

export default SettingsIcon;
