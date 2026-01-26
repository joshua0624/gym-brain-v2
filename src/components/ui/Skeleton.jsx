/**
 * Skeleton Loading Component
 *
 * Displays animated placeholder content while data is loading.
 * Respects prefers-reduced-motion for accessibility.
 */

const Skeleton = ({
  className = '',
  variant = 'default',
  width,
  height,
  rounded = 'rounded-lg'
}) => {
  const variants = {
    default: 'bg-bg-alt',
    light: 'bg-border-light',
    card: 'bg-surface border border-border-light shadow-sm',
  };

  const baseClasses = `
    ${variants[variant]}
    ${rounded}
    animate-pulse
    ${className}
  `.trim();

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return <div className={baseClasses} style={style} aria-hidden="true" />;
};

/**
 * Skeleton Text Line
 * Mimics a line of text
 */
export const SkeletonText = ({ width = '100%', className = '' }) => (
  <Skeleton
    width={width}
    height={16}
    rounded="rounded"
    className={className}
  />
);

/**
 * Skeleton Card
 * Mimics a card component
 */
export const SkeletonCard = ({ className = '', children }) => (
  <Skeleton
    variant="card"
    rounded="rounded-2xl"
    className={`p-4 ${className}`}
  >
    {children}
  </Skeleton>
);

/**
 * Skeleton Workout History Card
 * Specific skeleton for workout history items
 */
export const SkeletonWorkoutCard = () => (
  <div className="bg-surface border border-border-light rounded-2xl p-3.5 shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <div className="flex-1">
        <SkeletonText width="40%" className="mb-1" />
        <SkeletonText width="60%" className="h-5" />
      </div>
      <Skeleton width={18} height={18} rounded="rounded" />
    </div>
    <SkeletonText width="80%" className="mb-2" />
    <div className="flex gap-4">
      <SkeletonText width="50px" />
      <SkeletonText width="60px" />
    </div>
  </div>
);

/**
 * Skeleton Exercise Card
 * For library page exercise items
 */
export const SkeletonExerciseCard = () => (
  <div className="bg-surface border border-border-light rounded-2xl p-4 shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <SkeletonText width="70%" className="h-5" />
      <Skeleton width={20} height={20} rounded="rounded" />
    </div>
    <div className="flex gap-2 mb-2">
      <Skeleton width={60} height={24} rounded="rounded-md" />
      <Skeleton width={70} height={24} rounded="rounded-md" />
      <Skeleton width={50} height={24} rounded="rounded-md" />
    </div>
    <SkeletonText width="90%" />
  </div>
);

/**
 * Skeleton Chart
 * For progress page charts
 */
export const SkeletonChart = ({ height = 200 }) => (
  <div className="bg-surface border border-border-light rounded-2xl p-4 shadow-sm">
    <SkeletonText width="40%" className="mb-4" />
    <Skeleton height={height} rounded="rounded-lg" />
  </div>
);

/**
 * Skeleton Stats Grid
 * For stats display
 */
export const SkeletonStats = () => (
  <div className="grid grid-cols-2 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-surface border border-border-light rounded-2xl p-4 shadow-sm">
        <SkeletonText width="60%" className="mb-2" />
        <Skeleton height={32} width="80px" rounded="rounded" className="mb-1" />
        <SkeletonText width="50%" />
      </div>
    ))}
  </div>
);

/**
 * Skeleton Table Row
 * For table-based layouts (desktop history view)
 */
export const SkeletonTableRow = () => (
  <tr className="border-b border-border-light">
    <td className="p-3"><SkeletonText width="80px" /></td>
    <td className="p-3"><SkeletonText width="120px" /></td>
    <td className="p-3"><SkeletonText width="60px" /></td>
    <td className="p-3"><SkeletonText width="70px" /></td>
    <td className="p-3"><SkeletonText width="40px" /></td>
  </tr>
);

export default Skeleton;
