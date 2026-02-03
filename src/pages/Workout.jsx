/**
 * Workout Page - Active workout logging
 *
 * Main workout tracking component with:
 * - Start workout (blank/template/resume draft)
 * - Exercise selection and management
 * - Set logging with SetEntry component
 * - Previous performance display
 * - Draft auto-save (every 30s)
 * - Rest timer integration (manual start only)
 * - AI assistant integration
 * - Workout completion with atomic draft deletion
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workoutAPI, exerciseAPI, templateAPI } from '../lib/api';
import { useToastContext } from '../contexts/ToastContext';
import { useDraftAutoSave } from '../hooks/useDraftAutoSave';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import SetEntry from '../components/SetEntry';
import SetRowInline from '../components/SetRowInline';
import RestTimer from '../components/RestTimer';
import AIChatPanel from '../components/AIChatPanel';
import { generateUUID, formatDuration, calculateVolume } from '../lib/formatters';
import { VALIDATION_LIMITS } from '../lib/constants';

// UI Components
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

// Icons
import {
  PlusIcon,
  XIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AISparkleIcon,
  ClockIcon,
  WifiOffIcon
} from '../icons';

const Workout = () => {
  const navigate = useNavigate();
  const { success, error: showError, warning } = useToastContext();
  const { isOnline } = useNetworkStatus();

  // Workout state
  const [workout, setWorkout] = useState(null);
  const [exercises, setExercises] = useState([]); // Available exercises from library
  const [templates, setTemplates] = useState([]);
  const [previousPerformance, setPreviousPerformance] = useState({});
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showStartModal, setShowStartModal] = useState(true);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showAIChatPanel, setShowAIChatPanel] = useState(false);

  // Draft auto-save
  const { saveDraft, deleteDraft, loadDraft } = useDraftAutoSave(workout, !!workout);

  // Current exercise index for AI context
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  /**
   * Load exercises and templates on mount
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [exercisesData, templatesData] = await Promise.all([
          exerciseAPI.getAll(),
          templateAPI.getAll(),
        ]);
        setExercises(exercisesData.exercises || []);
        setTemplates(templatesData.templates || []);
      } catch (err) {
        showError('Failed to load data: ' + err.message);
      }
    };

    loadData();
  }, [showError]);

  /**
   * Start a blank workout
   */
  const startBlankWorkout = () => {
    const newWorkout = {
      id: generateUUID(),
      name: `Workout ${new Date().toLocaleDateString()}`,
      started_at: new Date().toISOString(),
      exercises: [],
    };
    setWorkout(newWorkout);
    setShowStartModal(false);
  };

  /**
   * Start from template
   */
  const startFromTemplate = async (templateId) => {
    try {
      setLoading(true);
      const templateData = await templateAPI.getExercises(templateId);

      const newWorkout = {
        id: generateUUID(),
        name: templateData.name || `Workout ${new Date().toLocaleDateString()}`,
        started_at: new Date().toISOString(),
        exercises: templateData.exercises.map((ex, idx) => ({
          exercise_id: ex.exercise_id,
          name: ex.name,
          type: ex.type,
          order_index: idx,
          sets: [],
        })),
      };

      setWorkout(newWorkout);
      setShowStartModal(false);
      success('Template loaded');
    } catch (err) {
      showError('Failed to load template: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resume draft workout
   */
  const resumeDraft = async () => {
    try {
      setLoading(true);
      const draftData = await loadDraft();

      if (!draftData) {
        warning('No draft found');
        return;
      }

      setWorkout(draftData);
      setShowStartModal(false);
      success('Draft resumed');
    } catch (err) {
      showError('Failed to load draft: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add exercise to workout
   */
  const addExercise = async (exercise) => {
    if (!workout) return;

    const newExercise = {
      exercise_id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      order_index: workout.exercises.length,
      sets: [],
    };

    setWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }));

    // Fetch previous performance for this exercise
    await fetchPreviousPerformance(exercise.id);

    setShowExerciseModal(false);
    success(`Added ${exercise.name}`);
  };

  /**
   * Remove exercise from workout
   */
  const removeExercise = (index) => {
    if (!workout) return;
    if (!window.confirm('Remove this exercise?')) return;

    const updatedExercises = workout.exercises.filter((_, i) => i !== index);
    // Reindex remaining exercises
    updatedExercises.forEach((ex, i) => {
      ex.order_index = i;
    });

    setWorkout(prev => ({
      ...prev,
      exercises: updatedExercises,
    }));
  };

  /**
   * Move exercise up/down
   */
  const moveExercise = (index, direction) => {
    if (!workout) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workout.exercises.length) return;

    const updatedExercises = [...workout.exercises];
    [updatedExercises[index], updatedExercises[newIndex]] =
      [updatedExercises[newIndex], updatedExercises[index]];

    // Reindex
    updatedExercises.forEach((ex, i) => {
      ex.order_index = i;
    });

    setWorkout(prev => ({
      ...prev,
      exercises: updatedExercises,
    }));
  };

  /**
   * Fetch previous performance for exercise
   */
  const fetchPreviousPerformance = async (exerciseId) => {
    try {
      // Fetch last workout containing this exercise
      const response = await workoutAPI.getAll({ exerciseId, limit: 1 });
      const lastWorkout = response.workouts?.[0];

      if (lastWorkout) {
        const exerciseData = lastWorkout.exercises?.find(ex => ex.exercise_id === exerciseId);
        if (exerciseData?.sets) {
          setPreviousPerformance(prev => ({
            ...prev,
            [exerciseId]: exerciseData.sets.filter(s => !s.is_warmup),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch previous performance:', err);
    }
  };

  /**
   * Add set to exercise
   */
  const addSet = (exerciseIndex) => {
    if (!workout) return;

    const exercise = workout.exercises[exerciseIndex];
    const setNumber = exercise.sets.length + 1;

    const updatedExercises = [...workout.exercises];
    updatedExercises[exerciseIndex].sets.push({
      set_number: setNumber,
      weight: null,
      reps: null,
      rir: null,
      is_warmup: false,
      notes: null,
      is_completed: false,
    });

    setWorkout(prev => ({
      ...prev,
      exercises: updatedExercises,
    }));
  };

  /**
   * Save set data
   */
  const saveSet = (exerciseIndex, setIndex, setData) => {
    if (!workout) return;

    const updatedExercises = [...workout.exercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      ...setData,
    };

    setWorkout(prev => ({
      ...prev,
      exercises: updatedExercises,
    }));
  };

  /**
   * Delete set from exercise
   */
  const deleteSet = (exerciseIndex, setIndex) => {
    if (!workout) return;

    const updatedExercises = [...workout.exercises];
    updatedExercises[exerciseIndex].sets = updatedExercises[exerciseIndex].sets.filter(
      (_, i) => i !== setIndex
    );

    // Renumber remaining sets
    updatedExercises[exerciseIndex].sets.forEach((set, i) => {
      set.set_number = i + 1;
    });

    setWorkout(prev => ({
      ...prev,
      exercises: updatedExercises,
    }));
  };

  /**
   * Complete workout
   */
  const completeWorkout = async () => {
    if (!workout) return;

    // Validation
    if (workout.exercises.length === 0) {
      showError('Add at least one exercise');
      return;
    }

    const hasAnySets = workout.exercises.some(ex => ex.sets.length > 0);
    if (!hasAnySets) {
      showError('Add at least one set');
      return;
    }

    try {
      setLoading(true);

      const completedAt = new Date().toISOString();
      const started = new Date(workout.started_at);
      const completed = new Date(completedAt);
      const durationSeconds = Math.floor((completed - started) / 1000);

      // Calculate total volume
      const totalVolume = calculateVolume(workout.exercises);

      // Prepare workout data for sync
      const workoutData = {
        id: workout.id,
        name: workout.name,
        startedAt: workout.started_at,
        completedAt,
        durationSeconds,
        totalVolume,
        exercises: workout.exercises.map(ex => ({
          id: ex.id,
          exerciseId: ex.exercise_id,
          orderIndex: ex.order_index,
          isCompleted: ex.is_completed,
          sets: ex.sets.map(set => ({
            id: set.id,
            setNumber: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rir: set.rir,
            durationSeconds: set.duration_seconds,
            distance: set.distance,
            notes: set.notes,
            isWarmup: set.is_warmup,
            isCompleted: set.is_completed,
          })),
        })),
      };

      // Sync to server with atomic draft deletion
      await workoutAPI.sync({
        completedWorkouts: [workoutData],
        deleteDraftIds: [workout.id],
      });

      // Delete local draft
      await deleteDraft(workout.id);

      success('Workout completed!');
      navigate('/history');
    } catch (err) {
      showError('Failed to complete workout: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Build AI context for current exercise
   */
  const buildAIContext = () => {
    if (!workout || workout.exercises.length === 0) return null;

    const currentExercise = workout.exercises[currentExerciseIndex];
    if (!currentExercise) return null;

    return {
      workoutName: workout.name,
      currentExercise: currentExercise.name,
      recentSets: currentExercise.sets.slice(-3),
    };
  };

  // Calculate workout duration
  const workoutDuration = workout
    ? Math.floor((new Date() - new Date(workout.started_at)) / 1000)
    : 0;

  /**
   * Render workout not started
   */
  if (!workout) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center">
          <EmptyState
            title="No Active Workout"
            description="Start a new workout to begin tracking your sets"
          />
          <div className="mt-6">
            <Button
              onClick={() => setShowStartModal(true)}
              size="lg"
            >
              Start Workout
            </Button>
          </div>
        </div>

        {showStartModal && (
          <StartWorkoutModal
            onStartBlank={startBlankWorkout}
            onStartFromTemplate={startFromTemplate}
            onResumeDraft={resumeDraft}
            templates={templates}
            onClose={() => setShowStartModal(false)}
            loading={loading}
          />
        )}
      </div>
    );
  }

  /**
   * Render active workout
   */
  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              value={workout.name}
              onChange={(e) => setWorkout(prev => ({ ...prev, name: e.target.value }))}
              className="text-xl font-display font-semibold border-none shadow-none px-0 focus:ring-1"
              maxLength={VALIDATION_LIMITS.workoutName.max}
            />
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-text-muted flex items-center gap-1.5">
                <ClockIcon size={14} />
                {formatDuration(workoutDuration)}
              </p>
              {!isOnline && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <WifiOffIcon size={12} />
                  Offline
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={completeWorkout}
            disabled={loading}
            loading={loading}
            size="lg"
          >
            {loading ? 'Completing...' : 'Complete'}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Exercise list */}
          <div className="lg:col-span-2 space-y-6">
            {workout.exercises.length === 0 ? (
              <Card className="p-8">
                <EmptyState
                  title="No exercises added yet"
                  description="Add your first exercise to start tracking sets"
                />
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => setShowExerciseModal(true)}
                    variant="primary"
                  >
                    <PlusIcon size={18} />
                    Add Exercise
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {workout.exercises.map((exercise, exerciseIndex) => (
                  <ExerciseBlock
                    key={`${exercise.exercise_id}-${exerciseIndex}`}
                    exercise={exercise}
                    exerciseIndex={exerciseIndex}
                    previousPerformance={previousPerformance[exercise.exercise_id]}
                    onAddSet={() => addSet(exerciseIndex)}
                    onSaveSet={(setIndex, setData) => saveSet(exerciseIndex, setIndex, setData)}
                    onDeleteSet={(setIndex) => deleteSet(exerciseIndex, setIndex)}
                    onRemoveExercise={() => removeExercise(exerciseIndex)}
                    onMoveUp={() => moveExercise(exerciseIndex, 'up')}
                    onMoveDown={() => moveExercise(exerciseIndex, 'down')}
                    canMoveUp={exerciseIndex > 0}
                    canMoveDown={exerciseIndex < workout.exercises.length - 1}
                    onFocus={() => setCurrentExerciseIndex(exerciseIndex)}
                  />
                ))}

                <button
                  onClick={() => setShowExerciseModal(true)}
                  className="w-full py-4 bg-surface hover:bg-bg-alt border-2 border-dashed border-border rounded-2xl text-text-muted hover:text-text hover:border-accent/30 transition-all duration-200 flex items-center justify-center gap-2 font-semibold"
                >
                  <PlusIcon size={20} />
                  Add Exercise
                </button>
              </>
            )}
          </div>

          {/* Sidebar - Rest timer and AI */}
          <div className="space-y-6">
            <RestTimer />

            <Button
              onClick={() => setShowAIChatPanel(!showAIChatPanel)}
              variant="secondary"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <AISparkleIcon size={18} />
              {showAIChatPanel ? 'Hide' : 'Show'} AI Assistant
            </Button>

            {showAIChatPanel && (
              <Card className="max-h-[600px] overflow-hidden p-0">
                <AIChatPanel
                  workoutContext={buildAIContext()}
                  onClose={() => setShowAIChatPanel(false)}
                />
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Exercise selection modal */}
      {showExerciseModal && (
        <ExerciseSelectionModal
          exercises={exercises}
          onSelect={addExercise}
          onClose={() => setShowExerciseModal(false)}
        />
      )}
    </div>
  );
};

/**
 * Start Workout Modal Component
 */
const StartWorkoutModal = ({
  onStartBlank,
  onStartFromTemplate,
  onResumeDraft,
  templates,
  onClose,
  loading
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  return (
    <Modal isOpen={true} onClose={onClose} title="Start Workout">
      <div className="space-y-3">
        <button
          onClick={onStartBlank}
          disabled={loading}
          className="w-full py-4 px-5 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-xl text-left transition-all duration-200 active:scale-[0.98] text-surface"
        >
          <div className="font-semibold text-base">Start Blank Workout</div>
          <div className="text-sm opacity-90 mt-0.5">Add exercises as you go</div>
        </button>

        <button
          onClick={onResumeDraft}
          disabled={loading}
          className="w-full py-4 px-5 bg-accent-light hover:bg-accent/20 disabled:opacity-50 rounded-xl text-left transition-all duration-200 active:scale-[0.98] text-text"
        >
          <div className="font-semibold text-base">Resume Draft</div>
          <div className="text-sm text-text-muted mt-0.5">Continue your last workout</div>
        </button>

        {templates.length > 0 && (
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm text-text-muted mb-3 font-medium">Or start from template:</p>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg mb-3 text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() => selectedTemplate && onStartFromTemplate(selectedTemplate)}
              disabled={!selectedTemplate || loading}
              fullWidth
              variant="secondary"
            >
              Start from Template
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          onClick={onClose}
          variant="ghost"
          fullWidth
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Exercise Block Component
 *
 * Uses hybrid pattern:
 * - Completed sets display as compact inline rows
 * - Active/editing sets use full card form
 */
const ExerciseBlock = ({
  exercise,
  exerciseIndex,
  previousPerformance,
  onAddSet,
  onSaveSet,
  onDeleteSet,
  onRemoveExercise,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onFocus,
}) => {
  // Track which set is being edited (null = none, index = editing that set)
  const [editingSetIndex, setEditingSetIndex] = useState(null);

  const handleEditSet = (setIndex) => {
    setEditingSetIndex(setIndex);
  };

  const handleSaveSet = (setIndex, setData) => {
    onSaveSet(setIndex, setData);
    setEditingSetIndex(null); // Exit edit mode after save
  };

  const handleCancelEdit = () => {
    setEditingSetIndex(null);
  };

  return (
    <Card onClick={onFocus} className="p-6">
      {/* Exercise header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-display font-semibold text-text">{exercise.name}</h3>
        <div className="flex gap-1.5">
          <Button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            variant="icon"
            size="sm"
            title="Move up"
          >
            <ChevronUpIcon size={16} />
          </Button>
          <Button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            variant="icon"
            size="sm"
            title="Move down"
          >
            <ChevronDownIcon size={16} />
          </Button>
          <Button
            onClick={onRemoveExercise}
            variant="icon"
            size="sm"
            className="text-error hover:bg-error/10"
            title="Remove exercise"
          >
            <TrashIcon size={16} />
          </Button>
        </div>
      </div>

      {/* Previous performance */}
      {previousPerformance && previousPerformance.length > 0 && (
        <div className="mb-4 p-4 bg-accent-light rounded-lg border border-accent/20">
          <p className="text-sm font-semibold text-text-muted mb-2">Previous performance:</p>
          <div className="text-sm text-text space-y-1.5">
            {previousPerformance.slice(0, 3).map((set, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-medium text-text-muted">Set {idx + 1}:</span>
                <span className="font-display font-semibold">
                  {set.weight ? `${set.weight} lbs` : 'BW'} × {set.reps} reps
                </span>
                {set.rir !== null && (
                  <Badge variant="secondary" className="text-xs">
                    RIR {set.rir}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sets - Hybrid pattern */}
      <div className="space-y-2 mb-4">
        {exercise.sets.map((set, setIndex) => {
          const isCompleted = set.is_completed;
          const isEditing = editingSetIndex === setIndex;

          // Show inline row for completed sets (unless being edited)
          if (isCompleted && !isEditing) {
            return (
              <SetRowInline
                key={`${exerciseIndex}-${setIndex}`}
                set={set}
                setNumber={set.set_number}
                exerciseType={exercise.type}
                onEdit={() => handleEditSet(setIndex)}
                onDelete={() => onDeleteSet(setIndex)}
              />
            );
          }

          // Show full card for active/editing sets
          return (
            <SetEntry
              key={`${exerciseIndex}-${setIndex}`}
              setNumber={set.set_number}
              previousSet={previousPerformance?.[setIndex]}
              onSave={(setData) => handleSaveSet(setIndex, setData)}
              onDelete={() => onDeleteSet(setIndex)}
              initialData={isEditing ? set : null}
              exerciseType={exercise.type}
            />
          );
        })}
      </div>

      {/* Add set button */}
      <Button
        onClick={onAddSet}
        variant="secondary"
        fullWidth
        className="flex items-center justify-center gap-2"
      >
        <PlusIcon size={18} />
        Add Set
      </Button>
    </Card>
  );
};

/**
 * Exercise Selection Modal Component
 */
const ExerciseSelectionModal = ({ exercises, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ muscle: '', equipment: '', type: '' });

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = !filter.muscle || ex.primary_muscles?.includes(filter.muscle);
    const matchesEquipment = !filter.equipment || ex.equipment === filter.equipment;
    const matchesType = !filter.type || ex.type === filter.type;

    return matchesSearch && matchesMuscle && matchesEquipment && matchesType;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold text-text">Add Exercise</h2>
            <Button
              onClick={onClose}
              variant="icon"
              size="sm"
              className="text-text-muted hover:text-text"
            >
              <XIcon size={20} />
            </Button>
          </div>

          {/* Search */}
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="mb-3"
          />

          {/* Filters */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All Types</option>
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="cardio">Cardio</option>
            </select>

            <select
              value={filter.equipment}
              onChange={(e) => setFilter(prev => ({ ...prev, equipment: e.target.value }))}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All Equipment</option>
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell</option>
              <option value="cable">Cable</option>
              <option value="machine">Machine</option>
              <option value="bodyweight">Bodyweight</option>
            </select>

            <select
              value={filter.muscle}
              onChange={(e) => setFilter(prev => ({ ...prev, muscle: e.target.value }))}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All Muscles</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="shoulders">Shoulders</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="quads">Quads</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="glutes">Glutes</option>
              <option value="calves">Calves</option>
              <option value="abs">Abs</option>
            </select>
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredExercises.length === 0 ? (
            <EmptyState
              title="No exercises found"
              description="Try adjusting your search or filters"
            />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => onSelect(exercise)}
                  className="p-4 bg-bg-alt hover:bg-accent-light border border-border hover:border-accent/30 rounded-xl text-left transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="font-semibold text-text mb-1">{exercise.name}</div>
                  <div className="flex flex-wrap gap-2 text-sm text-text-muted">
                    <Badge variant="secondary">{exercise.type}</Badge>
                    <Badge variant="secondary">{exercise.equipment}</Badge>
                    {exercise.primary_muscles && exercise.primary_muscles.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="capitalize">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workout;
