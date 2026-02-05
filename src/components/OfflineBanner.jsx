/**
 * OfflineBanner Component - User-facing sync status
 *
 * CLIENT-SIDE ONLY - Shows offline status, sync progress, and retry option
 */

import { useSyncManager } from '../hooks/useSyncManager';

export const OfflineBanner = () => {
  const { pendingCount, isSyncing, isOnline, sync } = useSyncManager();

  // Hide banner when online and fully synced
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // Determine banner state and styling
  const getBannerState = () => {
    if (!isOnline) {
      return {
        message: 'Offline - Changes will sync when connection restored',
        bgColor: 'bg-red-600',
        textColor: 'text-white',
        showRetry: false,
      };
    }

    if (isSyncing) {
      return {
        message: `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}...`,
        bgColor: 'bg-yellow-600',
        textColor: 'text-white',
        showRetry: false,
      };
    }

    if (pendingCount > 0) {
      return {
        message: `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`,
        bgColor: 'bg-yellow-600',
        textColor: 'text-white',
        showRetry: true,
      };
    }

    return null;
  };

  const state = getBannerState();

  if (!state) {
    return null;
  }

  return (
    <div className={`${state.bgColor} ${state.textColor} px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-3`}>
      <span>{state.message}</span>

      {state.showRetry && (
        <button
          onClick={sync}
          className="px-3 py-1 bg-white text-yellow-900 hover:bg-yellow-50 rounded-md transition-colors font-semibold"
        >
          Retry Now
        </button>
      )}

      {isSyncing && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
    </div>
  );
};
