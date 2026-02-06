/**
 * Set Row Inline Component
 *
 * Compact inline display for completed sets.
 * Used in hybrid pattern: inline for saved sets, full card for active entry.
 */

import { useState } from 'react';
import { formatWeight } from '../lib/formatters';
import { CheckIcon, EditIcon, TrashIcon, NoteIcon } from '../icons';
import Button from './ui/Button';

const SetRowInline = ({
  set,
  setNumber,
  onEdit,
  onDelete,
  exerciseType = 'weighted'
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const isWeighted = exerciseType === 'weighted';

  return (
    <div className="group">
      <div
        className={`
          flex items-center gap-2 p-2 -mx-2 rounded-lg
          bg-success-bg border border-success-border
          transition-all duration-200
        `}
      >
        {/* Completed checkbox */}
        <div className="w-7 h-7 shrink-0 bg-success rounded-lg flex items-center justify-center animate-check-pop">
          <CheckIcon size={14} color="white" strokeWidth={2.5} />
        </div>

        {/* Set number */}
        <span className="w-8 text-[12px] font-semibold text-text-muted shrink-0">
          #{setNumber}
        </span>

        {/* Weight (for weighted exercises) */}
        {isWeighted && (
          <div className="w-16 shrink-0">
            <div className="text-[14px] font-mono font-semibold text-text text-center">
              {set.weight ? formatWeight(set.weight) : '—'}
            </div>
            <div className="text-[10px] text-text-light text-center uppercase tracking-wide">
              lbs
            </div>
          </div>
        )}

        {/* Reps */}
        <div className="w-12 shrink-0">
          <div className="text-[14px] font-mono font-semibold text-text text-center">
            {set.reps || '—'}
          </div>
          <div className="text-[10px] text-text-light text-center uppercase tracking-wide">
            reps
          </div>
        </div>

        {/* RIR */}
        <div className="w-10 shrink-0">
          <div className="text-[14px] font-mono font-semibold text-text text-center">
            {set.rir !== null && set.rir !== undefined ? set.rir : '—'}
          </div>
          <div className="text-[10px] text-text-light text-center uppercase tracking-wide">
            rir
          </div>
        </div>

        {/* Warm-up badge */}
        {set.is_warmup && (
          <span className="px-2 py-0.5 bg-warning/15 text-warning text-[10px] font-semibold rounded-md uppercase tracking-wide shrink-0">
            W
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notes indicator */}
        {set.notes && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-accent transition-colors shrink-0"
            aria-label={showNotes ? 'Hide notes' : 'View notes'}
            aria-expanded={showNotes}
          >
            <NoteIcon size={14} aria-hidden="true" />
          </button>
        )}

        {/* Action buttons - show on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            onClick={onEdit}
            variant="icon"
            size="sm"
            className="w-7 h-7"
            ariaLabel="Edit set"
          >
            <EditIcon size={14} />
          </Button>
          <Button
            onClick={onDelete}
            variant="icon"
            size="sm"
            className="w-7 h-7 text-error hover:bg-error/10"
            ariaLabel="Delete set"
          >
            <TrashIcon size={14} />
          </Button>
        </div>
      </div>

      {/* Notes expansion */}
      {showNotes && set.notes && (
        <div className="mt-1 ml-9 p-2 bg-bg-alt rounded-lg text-[12px] text-text-muted border border-border-light">
          {set.notes}
        </div>
      )}
    </div>
  );
};

export default SetRowInline;
