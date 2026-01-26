/**
 * Rest Timer Component
 *
 * Manual start rest timer with quick-select presets
 * NO AUTO-START per spec
 */

import { useState, useEffect, useRef } from 'react';
import { REST_TIMER_PRESETS } from '../lib/constants';
import { formatRestTimer } from '../lib/formatters';
import Button from './ui/Button';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import { ClockIcon, PlayIcon, XIcon } from '../icons';

const RestTimer = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [targetTime, setTargetTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            // Play sound if available
            if (audioRef.current) {
              audioRef.current.play().catch(() => {
                // Ignore audio play errors
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  const startTimer = (seconds) => {
    setTimeLeft(seconds);
    setTargetTime(seconds);
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
  };

  const resume = () => {
    if (timeLeft > 0) {
      setIsRunning(true);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setTargetTime(0);
  };

  const addTime = (seconds) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds));
  };

  const progress = targetTime > 0 ? ((targetTime - timeLeft) / targetTime) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <ClockIcon size={22} color="var(--accent)" strokeWidth={1.5} />
        <h3 className="font-display text-lg font-semibold text-text">Rest Timer</h3>
      </div>

      {/* Timer display */}
      <div className="mb-6">
        <div className="relative">
          <div className="font-display text-6xl text-center text-text mb-4 tracking-tight">
            {formatRestTimer(timeLeft)}
          </div>
          {targetTime > 0 && (
            <ProgressBar progress={progress} size="md" variant="success" />
          )}
        </div>
      </div>

      {/* Quick preset buttons */}
      {!isRunning && timeLeft === 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {REST_TIMER_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              onClick={() => startTimer(preset.value)}
              variant="secondary"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2">
        {!isRunning && timeLeft > 0 && (
          <Button
            onClick={resume}
            variant="primary"
            className="flex-1"
            icon={<PlayIcon size={18} />}
          >
            Resume
          </Button>
        )}

        {isRunning && (
          <Button
            onClick={pause}
            variant="secondary"
            className="flex-1"
          >
            Pause
          </Button>
        )}

        {timeLeft > 0 && (
          <>
            <Button
              onClick={() => addTime(-15)}
              variant="ghost"
              disabled={timeLeft < 15}
            >
              -15s
            </Button>
            <Button
              onClick={() => addTime(15)}
              variant="ghost"
            >
              +15s
            </Button>
            <Button
              onClick={reset}
              variant="ghost"
              className="text-error hover:bg-bg-alt"
            >
              Reset
            </Button>
          </>
        )}
      </div>

      {/* Hidden audio element for timer completion sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSmJ0PLEgC4IBmC96d2cSwkNToOm74NlGgyP"
      />
    </Card>
  );
};

export default RestTimer;
