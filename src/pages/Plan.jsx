/**
 * Plan Page - Workout Planning (Coming Soon)
 *
 * Future features: Workout scheduling, calendar view, planned routines
 */

import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { CalendarIcon } from '../icons';

const Plan = () => {
  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-[28px] font-display font-semibold text-text mb-6">
          Workout Plan
        </h1>

        <Card>
          <EmptyState
            icon={<CalendarIcon size={48} />}
            title="Coming Soon"
            description="Workout planning and scheduling will be added in a future update"
          />
        </Card>
      </div>
    </div>
  );
};

export default Plan;
