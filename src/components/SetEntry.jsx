/**
 * Set Entry Component
 *
 * Form for logging a single set (weight, reps, RIR, warm-up)
 */

import { useState, useEffect } from 'react';
import { parseWeight, parseReps, parseRIR, formatSet } from '../lib/formatters';
import { VALIDATION_LIMITS } from '../lib/constants';
import Input from './ui/Input';
import Checkbox from './ui/Checkbox';
import Button from './ui/Button';
import { CheckIcon, XIcon } from '../icons';

const SetEntry = ({ setNumber, previousSet, onSave, onDelete, initialData, exerciseType }) => {
  const [formData, setFormData] = useState({
    weight: initialData?.weight || previousSet?.weight || '',
    reps: initialData?.reps || previousSet?.reps || '',
    rir: initialData?.rir ?? previousSet?.rir ?? '',
    is_warmup: initialData?.is_warmup || false,
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState({});
  const [isSaved, setIsSaved] = useState(!!initialData);

  const isWeightedExercise = exerciseType === 'weighted';

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
    setIsSaved(false);
  };

  const validate = () => {
    const newErrors = {};

    // Weight validation (only for weighted exercises)
    if (isWeightedExercise && formData.weight !== '') {
      const weight = parseWeight(formData.weight);
      if (weight === null) {
        newErrors.weight = `Weight must be between ${VALIDATION_LIMITS.weight.min} and ${VALIDATION_LIMITS.weight.max} lbs`;
      }
    }

    // Reps validation
    if (formData.reps !== '') {
      const reps = parseReps(formData.reps);
      if (reps === null) {
        newErrors.reps = `Reps must be between ${VALIDATION_LIMITS.reps.min} and ${VALIDATION_LIMITS.reps.max}`;
      }
    } else {
      newErrors.reps = 'Reps are required';
    }

    // RIR validation (optional)
    if (formData.rir !== '') {
      const rir = parseRIR(formData.rir);
      if (rir === null) {
        newErrors.rir = `RIR must be between ${VALIDATION_LIMITS.rir.min} and ${VALIDATION_LIMITS.rir.max}`;
      }
    }

    return newErrors;
  };

  const handleSave = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const setData = {
      set_number: setNumber,
      weight: isWeightedExercise ? parseWeight(formData.weight) || null : null,
      reps: parseReps(formData.reps),
      rir: formData.rir !== '' ? parseRIR(formData.rir) : null,
      is_warmup: formData.is_warmup,
      notes: formData.notes || null,
      is_completed: true,
    };

    onSave(setData);
    setIsSaved(true);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this set?')) {
      onDelete?.();
    }
  };

  return (
    <div className={`bg-surface rounded-xl p-4 border-2 transition-all ${
      isSaved
        ? 'border-success shadow-md'
        : 'border-border-light shadow-sm hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-lg font-semibold text-text">
          Set {setNumber}
        </h4>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={formData.is_warmup}
            onChange={(checked) => handleChange('is_warmup', checked)}
            label="Warm-up"
            disabled={isSaved}
          />
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-error hover:bg-bg-alt rounded-lg transition-colors"
              aria-label="Delete set"
            >
              <XIcon size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Previous performance reference */}
      {previousSet && !isSaved && (
        <div className="mb-3 text-sm text-text-muted bg-bg-alt rounded-lg p-2.5 border border-border-light">
          <span className="font-medium">Previous:</span> <span className="font-mono">{formatSet(previousSet.weight, previousSet.reps, previousSet.rir)}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Weight (only for weighted exercises) */}
        {isWeightedExercise && (
          <Input
            type="number"
            step="0.5"
            min={VALIDATION_LIMITS.weight.min}
            max={VALIDATION_LIMITS.weight.max}
            label="Weight (lbs)"
            value={formData.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            placeholder="0"
            disabled={isSaved}
            error={errors.weight}
            className="font-mono"
          />
        )}

        {/* Reps */}
        <Input
          type="number"
          min={VALIDATION_LIMITS.reps.min}
          max={VALIDATION_LIMITS.reps.max}
          label="Reps"
          value={formData.reps}
          onChange={(e) => handleChange('reps', e.target.value)}
          placeholder="0"
          disabled={isSaved}
          error={errors.reps}
          className="font-mono"
        />

        {/* RIR */}
        <Input
          type="number"
          min={VALIDATION_LIMITS.rir.min}
          max={VALIDATION_LIMITS.rir.max}
          label="RIR"
          value={formData.rir}
          onChange={(e) => handleChange('rir', e.target.value)}
          placeholder="0-10"
          disabled={isSaved}
          error={errors.rir}
          className="font-mono"
        />
      </div>

      {/* Notes */}
      <div className="mb-3">
        <Input
          type="text"
          maxLength={VALIDATION_LIMITS.notes.max}
          label="Notes (optional)"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Form notes, difficulty, etc."
          disabled={isSaved}
        />
      </div>

      {/* Save button */}
      {!isSaved && (
        <Button
          onClick={handleSave}
          variant="primary"
          fullWidth
        >
          Save Set
        </Button>
      )}

      {isSaved && (
        <div className="flex items-center justify-center gap-2 text-success font-medium">
          <CheckIcon size={18} strokeWidth={2.5} />
          <span>Set saved</span>
        </div>
      )}
    </div>
  );
};

export default SetEntry;
