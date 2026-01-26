/**
 * Library Page - Exercise library browser
 *
 * Features: Browse exercises, search, filter by muscle/equipment, create custom exercises
 */

import { useState, useEffect } from 'react';
import { exerciseAPI } from '../lib/api';
import { formatMuscleGroups, formatEquipment, formatExerciseType } from '../lib/formatters';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, EXERCISE_TYPES } from '../lib/constants';
import { useToast } from '../hooks/useToast';

// UI Components
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Icons
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';
import FilterIcon from '../icons/FilterIcon';
import XIcon from '../icons/XIcon';
import BookIcon from '../icons/BookIcon';

const Library = () => {
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { success, error: showError } = useToast();

  // Load exercises on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Filter exercises when filters change
  useEffect(() => {
    filterExercises();
  }, [exercises, searchTerm, selectedMuscle, selectedEquipment, selectedType]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const data = await exerciseAPI.getAll();
      setExercises(data.exercises || []);
    } catch (err) {
      console.error('Failed to load exercises:', err);
      showError('Failed to load exercise library');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(term)
      );
    }

    // Muscle filter
    if (selectedMuscle) {
      filtered = filtered.filter(ex =>
        ex.primary_muscles?.includes(selectedMuscle) ||
        ex.secondary_muscles?.includes(selectedMuscle)
      );
    }

    // Equipment filter
    if (selectedEquipment) {
      filtered = filtered.filter(ex => ex.equipment === selectedEquipment);
    }

    // Type filter
    if (selectedType) {
      filtered = filtered.filter(ex => ex.type === selectedType);
    }

    setFilteredExercises(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMuscle('');
    setSelectedEquipment('');
    setSelectedType('');
  };

  const handleCreateExercise = () => {
    setShowCreateModal(true);
  };

  const handleArchiveExercise = async (exerciseId) => {
    if (!window.confirm('Archive this exercise? It will be hidden from the library.')) {
      return;
    }

    try {
      await exerciseAPI.archive(exerciseId);
      success('Exercise archived');
      loadExercises();
    } catch (err) {
      console.error('Failed to archive exercise:', err);
      showError('Failed to archive exercise');
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] md:text-[32px] font-display font-bold text-text">
            Exercise Library
          </h1>
          <Button
            onClick={handleCreateExercise}
            variant="primary"
            size="md"
          >
            <PlusIcon size={18} />
            <span className="hidden sm:inline">Create Exercise</span>
          </Button>
        </div>

        {/* Filters */}
        <Card variant="standard" padding="md" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <SearchInput
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              className="md:col-span-2 lg:col-span-1"
            />

            {/* Muscle filter */}
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
            >
              <option value="">All Muscles</option>
              {MUSCLE_GROUPS.map(muscle => (
                <option key={muscle} value={muscle}>
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                </option>
              ))}
            </select>

            {/* Equipment filter */}
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
            >
              <option value="">All Equipment</option>
              {EQUIPMENT_TYPES.map(eq => (
                <option key={eq.value} value={eq.value}>
                  {eq.label}
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
            >
              <option value="">All Types</option>
              {EXERCISE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {(searchTerm || selectedMuscle || selectedEquipment || selectedType) && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              <XIcon size={14} />
              Clear all filters
            </Button>
          )}
        </Card>

        {/* Results count */}
        <div className="mb-4 text-[13px] text-text-muted">
          Showing {filteredExercises.length} of {exercises.length} exercises
        </div>

        {/* Exercise list */}
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading exercises..." />
          </div>
        ) : filteredExercises.length === 0 ? (
          <EmptyState
            icon={<BookIcon size={48} />}
            title="No exercises found"
            description={
              (searchTerm || selectedMuscle || selectedEquipment || selectedType)
                ? "Try adjusting your filters or search term"
                : "Start by creating a custom exercise"
            }
            action={
              (searchTerm || selectedMuscle || selectedEquipment || selectedType) ? (
                <Button
                  onClick={clearFilters}
                  variant="secondary"
                  size="md"
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  onClick={handleCreateExercise}
                  variant="primary"
                  size="md"
                >
                  <PlusIcon size={18} />
                  Create Exercise
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ExerciseCard
                  exercise={exercise}
                  onArchive={handleArchiveExercise}
                />
              </div>
            ))}
          </div>
        )}

        {/* Create exercise modal */}
        {showCreateModal && (
          <CreateExerciseModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadExercises();
            }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Exercise Card Component
 */
const ExerciseCard = ({ exercise, onArchive }) => {
  return (
    <Card variant="elevated" padding="md">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-[16px] font-semibold text-text font-display pr-2">{exercise.name}</h3>
        {exercise.is_custom && (
          <Button
            onClick={() => onArchive(exercise.id)}
            variant="icon"
            size="sm"
            className="shrink-0 hover:text-error hover:border-error"
            title="Archive exercise"
          >
            <TrashIcon size={16} />
          </Button>
        )}
      </div>

      <div className="space-y-2 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Type:</span>
          <span className="text-text font-medium">{formatExerciseType(exercise.type)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-text-muted">Equipment:</span>
          <span className="text-text font-medium">{formatEquipment(exercise.equipment)}</span>
        </div>

        {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
          <div>
            <span className="text-text-muted block mb-1.5">Muscles:</span>
            <div className="flex flex-wrap gap-1.5">
              {exercise.primary_muscles.map((muscle) => (
                <Badge key={muscle} variant="muscle" size="sm">
                  {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {exercise.is_custom && (
          <div className="pt-1">
            <Badge variant="default" size="sm">
              Custom
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * Create Exercise Modal Component
 */
const CreateExerciseModal = ({ onClose, onSuccess }) => {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'weighted',
    equipment: 'barbell',
    primary_muscles: [],
    secondary_muscles: [],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuggestions(null); // Clear suggestions when editing
  };

  const toggleMuscle = (muscle, isPrimary) => {
    const field = isPrimary ? 'primary_muscles' : 'secondary_muscles';
    setFormData(prev => {
      const muscles = prev[field].includes(muscle)
        ? prev[field].filter(m => m !== muscle)
        : [...prev[field], muscle];
      return { ...prev, [field]: muscles };
    });
  };

  const handleSubmit = async (force = false) => {
    if (!formData.name.trim()) {
      showError('Exercise name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await exerciseAPI.create({
        ...formData,
        force: force,
      });

      if (response.suggestions && !force) {
        // Similar exercises found - show suggestions
        setSuggestions(response.suggestions);
        setLoading(false);
        return;
      }

      success('Exercise created successfully');
      onSuccess();
    } catch (err) {
      console.error('Failed to create exercise:', err);
      showError(err.response?.data?.error || 'Failed to create exercise');
    } finally {
      if (!suggestions) {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create Custom Exercise"
      size="lg"
      className="max-w-2xl"
    >
      <div>

        {/* Suggestions */}
        {suggestions && (
          <Card variant="accent" padding="md" className="mb-6 border-warning bg-warning/5">
            <p className="text-warning font-semibold mb-2 text-[14px]">Similar exercises found:</p>
            <ul className="text-[13px] text-text space-y-1 mb-4">
              {suggestions.map((suggestion, idx) => (
                <li key={idx}>• {suggestion}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="secondary"
                size="md"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                variant="primary"
                size="md"
                fullWidth
              >
                Create Anyway
              </Button>
            </div>
          </Card>
        )}

        {/* Form */}
        {!suggestions && (
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-[13px] font-semibold text-text mb-2">
                Exercise Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Barbell Bench Press"
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[14px] text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-[13px] font-semibold text-text mb-2">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
              >
                {EXERCISE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Equipment */}
            <div>
              <label className="block text-[13px] font-semibold text-text mb-2">
                Equipment *
              </label>
              <select
                value={formData.equipment}
                onChange={(e) => handleChange('equipment', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-[14px] text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
              >
                {EQUIPMENT_TYPES.map(eq => (
                  <option key={eq.value} value={eq.value}>{eq.label}</option>
                ))}
              </select>
            </div>

            {/* Primary Muscles */}
            <div>
              <label className="block text-[13px] font-semibold text-text mb-2">
                Primary Muscles
              </label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(muscle => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleMuscle(muscle, true)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      formData.primary_muscles.includes(muscle)
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-bg-alt text-text hover:bg-accent-light border border-border'
                    }`}
                  >
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Muscles */}
            <div>
              <label className="block text-[13px] font-semibold text-text mb-2">
                Secondary Muscles (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(muscle => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleMuscle(muscle, false)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      formData.secondary_muscles.includes(muscle)
                        ? 'bg-accent/70 text-white shadow-sm'
                        : 'bg-bg-alt text-text hover:bg-accent-light border border-border'
                    }`}
                  >
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={onClose}
                variant="secondary"
                size="md"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                loading={loading}
                variant="primary"
                size="md"
                fullWidth
              >
                Create Exercise
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default Library;
