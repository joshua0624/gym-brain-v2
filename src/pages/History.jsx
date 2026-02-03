/**
 * History Page - Workout history
 *
 * Features: Responsive design (cards for mobile, table for desktop), filters, workout details
 */

import { useState, useEffect } from 'react';
import { workoutAPI } from '../lib/api';
import { formatDate, formatDateTime, formatDuration, formatVolume, formatExerciseCount, formatSetCount } from '../lib/formatters';
import { useToast } from '../hooks/useToast';

// UI Components
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import { SkeletonWorkoutCard } from '../components/ui/Skeleton';

// Icons
import DumbbellIcon from '../icons/DumbbellIcon';
import ChevronRightIcon from '../icons/ChevronRightIcon';
import TrashIcon from '../icons/TrashIcon';
import ClockIcon from '../icons/ClockIcon';
import EditIcon from '../icons/EditIcon';

const History = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      const data = await workoutAPI.getAll();
      setWorkouts(data.workouts || []);
    } catch (err) {
      console.error('Failed to load workouts:', err);
      showError('Failed to load workout history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (workoutId) => {
    try {
      const data = await workoutAPI.getById(workoutId);
      setSelectedWorkout(data.workout);
      setShowDetails(true);
    } catch (err) {
      console.error('Failed to load workout details:', err);
      showError('Failed to load workout details');
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm('Delete this workout? This cannot be undone.')) {
      return;
    }

    try {
      await workoutAPI.delete(workoutId);
      success('Workout deleted');
      loadWorkouts();
    } catch (err) {
      console.error('Failed to delete workout:', err);
      showError('Failed to delete workout');
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] md:text-[28px] font-semibold text-text font-display">
            Workout History
          </h1>
          <Badge variant="neutral" size="md">
            {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'}
          </Badge>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="lg:hidden space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonWorkoutCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && workouts.length === 0 && (
          <EmptyState
            icon={<DumbbellIcon size={48} color="currentColor" />}
            title="No workouts yet"
            description="Start your first workout to see your history here"
          />
        )}

        {/* Mobile view - Cards */}
        {!loading && workouts.length > 0 && (
          <div className="lg:hidden space-y-4">
            {workouts.map((workout, index) => (
              <div
                key={workout.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <WorkoutCard
                  workout={workout}
                  onViewDetails={() => handleViewDetails(workout.id)}
                  onDelete={() => handleDeleteWorkout(workout.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Desktop view - Table */}
        {!loading && workouts.length > 0 && (
          <div className="hidden lg:block">
            <WorkoutTable
              workouts={workouts}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteWorkout}
            />
          </div>
        )}

        {/* Workout details modal */}
        {showDetails && selectedWorkout && (
          <WorkoutDetailsModal
            workout={selectedWorkout}
            onClose={() => setShowDetails(false)}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Workout Card Component (Mobile)
 */
const WorkoutCard = ({ workout, onViewDetails, onDelete }) => {
  const exerciseCount = workout.exercises?.length || 0;
  const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0;

  return (
    <Card variant="elevated" padding="md" onClick={onViewDetails}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-[16px] font-semibold text-text font-display mb-1">
            {workout.name || `Workout - ${formatDate(workout.started_at)}`}
          </h3>
          <p className="text-[13px] text-text-muted">
            {formatDateTime(workout.completed_at || workout.started_at)}
          </p>
        </div>
        <Button
          variant="icon"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete workout"
        >
          <TrashIcon size={16} color="currentColor" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Duration</div>
          <div className="text-[15px] text-text font-medium mt-1">
            {formatDuration(workout.duration_seconds)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Volume</div>
          <div className="text-[15px] text-text font-medium mt-1">
            {formatVolume(workout.total_volume)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Exercises</div>
          <div className="text-[15px] text-text font-medium mt-1">{exerciseCount}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Sets</div>
          <div className="text-[15px] text-text font-medium mt-1">{totalSets}</div>
        </div>
      </div>

      <div className="flex items-center justify-end text-accent gap-1.5">
        <span className="text-[13px] font-medium">View Details</span>
        <ChevronRightIcon size={16} color="currentColor" />
      </div>
    </Card>
  );
};

/**
 * Workout Table Component (Desktop)
 */
const WorkoutTable = ({ workouts, onViewDetails, onDelete }) => {
  return (
    <Card variant="standard" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-alt">
            <tr>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Date
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Name
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Volume
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Exercises
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Sets
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {workouts.map(workout => (
              <WorkoutTableRow
                key={workout.id}
                workout={workout}
                onViewDetails={() => onViewDetails(workout.id)}
                onDelete={() => onDelete(workout.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

/**
 * Workout Table Row Component
 */
const WorkoutTableRow = ({ workout, onViewDetails, onDelete }) => {
  const exerciseCount = workout.exercises?.length || 0;
  const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0;

  return (
    <tr className="hover:bg-surface-hover transition-colors duration-200 cursor-pointer" onClick={onViewDetails}>
      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-muted">
        {formatDate(workout.completed_at || workout.started_at)}
      </td>
      <td className="px-6 py-4 text-[14px] text-text font-medium">
        {workout.name || 'Unnamed Workout'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-muted">
        {formatDuration(workout.duration_seconds)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-muted">
        {formatVolume(workout.total_volume)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-muted">
        <Badge variant="neutral" size="sm">{exerciseCount}</Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-text-muted">
        <Badge variant="neutral" size="sm">{totalSets}</Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-[13px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="text-accent hover:text-accent-hover font-medium mr-3 transition-colors duration-200"
        >
          View
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-error hover:opacity-80 font-medium transition-opacity duration-200"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

/**
 * Workout Details Modal Component
 */
const WorkoutDetailsModal = ({ workout, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(workout.name || '');
  const { success: showSuccess, error: showError } = useToast();

  const handleSave = async () => {
    if (!editedName.trim()) {
      showError('Workout name cannot be empty');
      return;
    }

    try {
      await workoutAPI.update(workout.id, { name: editedName.trim() });
      showSuccess('Workout renamed successfully');
      setIsEditing(false);
      onClose(); // Close modal to trigger parent refresh
    } catch (err) {
      console.error('Failed to rename workout:', err);
      showError('Failed to rename workout');
    }
  };

  // Custom title with inline edit button
  const modalTitle = !isEditing ? (
    <div className="flex items-center gap-2">
      <span>{workout.name || 'Unnamed Workout'}</span>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1.5 text-text-muted hover:text-accent transition-colors"
        aria-label="Rename workout"
      >
        <EditIcon size={18} color="currentColor" />
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2 flex-1 mr-2">
      <Input
        value={editedName}
        onChange={(e) => setEditedName(e.target.value)}
        placeholder="Workout name"
        maxLength={100}
        autoFocus
        className="flex-1"
      />
      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
      >
        Save
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setEditedName(workout.name || '');
          setIsEditing(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Date */}
        <p className="text-[13px] text-text-muted -mt-2">
          {formatDateTime(workout.completed_at || workout.started_at)}
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="standard" padding="sm">
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              Duration
            </div>
            <div className="text-[18px] font-bold text-text font-display">
              {formatDuration(workout.duration_seconds)}
            </div>
          </Card>
          <Card variant="standard" padding="sm">
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              Volume
            </div>
            <div className="text-[18px] font-bold text-text font-display">
              {formatVolume(workout.total_volume)}
            </div>
          </Card>
          <Card variant="standard" padding="sm">
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              Exercises
            </div>
            <div className="text-[18px] font-bold text-text font-display">
              {workout.exercises?.length || 0}
            </div>
          </Card>
          <Card variant="standard" padding="sm">
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              Total Sets
            </div>
            <div className="text-[18px] font-bold text-text font-display">
              {workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0}
            </div>
          </Card>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          <h3 className="text-[16px] font-semibold text-text font-display">Exercises</h3>
          {workout.exercises?.map((exercise, idx) => (
            <Card key={exercise.id || idx} variant="standard" padding="md">
              <h4 className="text-[15px] font-semibold text-text mb-3">
                {exercise.name || 'Unknown Exercise'}
              </h4>
              <div className="space-y-2">
                {exercise.sets?.map((set, setIdx) => (
                  <div
                    key={set.id || setIdx}
                    className="flex items-center justify-between text-[13px] py-1.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-text-muted w-16">Set {set.set_number || setIdx + 1}</span>
                      {set.is_warmup && (
                        <Badge variant="warning" size="sm">
                          Warm-up
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-text font-medium">
                      {set.weight && (
                        <span>{set.weight} lbs</span>
                      )}
                      <span className="text-text-light">×</span>
                      <span>{set.reps} reps</span>
                      {set.rir !== null && set.rir !== undefined && (
                        <span className="text-text-muted">@ RIR {set.rir}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Close button */}
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

export default History;
