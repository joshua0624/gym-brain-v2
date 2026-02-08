/**
 * Home Dashboard Page
 *
 * Features: Greeting, Today's Plan card, weekly stats, muscle volume progress
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { progressAPI, templateAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { UserIcon, DumbbellIcon, PlusIcon } from '../icons';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, templatesData] = await Promise.all([
        progressAPI.getWeeklyStats(),
        templateAPI.getAll()
      ]);
      setWeeklyStats(statsData.stats || null);
      setTemplates(templatesData.templates || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleNewWorkout = () => {
    setShowStartModal(true);
  };

  const handleStartBlank = () => {
    navigate('/workout', { state: { action: 'blank' } });
  };

  const handleStartFromTemplate = () => {
    if (selectedTemplate) {
      navigate('/workout', { state: { action: 'template', templateId: selectedTemplate } });
    }
  };

  const handleResumeDraft = () => {
    navigate('/workout', { state: { action: 'resume' } });
  };

  // Sample data for Today's Plan (as requested)
  const todaysPlan = {
    name: 'Push Day',
    muscleGroups: 'Chest, Shoulders, Triceps',
    duration: '~60 min',
    exerciseCount: 5
  };

  // Sample goals for muscle groups (will be configurable in future)
  const sampleGoals = {
    chest: 16,
    back: 16,
    legs: 20,
    shoulders: 12,
    arms: 12,
    core: 12,
    glutes: 12,
    calves: 8,
    forearms: 8,
    abs: 12,
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header with Greeting and Profile Icon */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-text-muted text-base mb-1">
              {getGreeting()}
            </p>
            <h1 className="text-[32px] md:text-[40px] font-display font-semibold text-text">
              {user?.username || 'Lifter'}
            </h1>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="p-3 bg-surface border border-border-light rounded-full hover:bg-surface-hover transition-colors"
            aria-label="View profile"
          >
            <UserIcon size={24} className="text-text" />
          </button>
        </div>

        {/* Today's Plan Card */}
        <Card className="mb-5" variant="elevated">
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-text-muted uppercase tracking-wide">
              Today's Plan
            </p>
            <span className="px-3 py-1 bg-accent-light text-accent text-sm font-medium rounded-full">
              {todaysPlan.exerciseCount} exercises
            </span>
          </div>
          <h2 className="text-[28px] font-display font-semibold text-text mb-2">
            {todaysPlan.name}
          </h2>
          <p className="text-text-muted mb-5">
            {todaysPlan.muscleGroups} • {todaysPlan.duration}
          </p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleNewWorkout}
          >
            Start Workout
          </Button>
        </Card>

        {/* This Week Stats & New Workout (2-column grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* This Week Card */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <DumbbellIcon size={20} className="text-accent" />
              <h3 className="text-sm text-text-muted uppercase tracking-wide">
                This Week
              </h3>
            </div>
            {loading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <>
                <p className="text-[32px] font-display font-bold text-text">
                  {weeklyStats?.total_volume
                    ? Math.round(weeklyStats.total_volume).toLocaleString()
                    : '0'}
                </p>
                <p className="text-sm text-text-muted">lbs lifted</p>
              </>
            )}
          </Card>

          {/* New Workout Card */}
          <Card
            variant="elevated"
            className="flex flex-col items-center justify-center cursor-pointer hover:bg-surface-hover transition-colors"
            onClick={handleNewWorkout}
          >
            <div className="p-3 bg-accent-light rounded-xl mb-2">
              <PlusIcon size={24} className="text-accent" />
            </div>
            <p className="text-base font-semibold text-text">New Workout</p>
          </Card>
        </div>

        {/* Weekly Volume by Muscle */}
        {loading ? (
          <Card>
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Card>
        ) : weeklyStats?.sets_by_muscle && Object.keys(weeklyStats.sets_by_muscle).length > 0 ? (
          <Card>
            <h3 className="text-lg font-display font-semibold text-text mb-4">
              Weekly Volume by Muscle
            </h3>
            <div className="space-y-4">
              {Object.entries(weeklyStats.sets_by_muscle)
                .sort(([, a], [, b]) => b - a)
                .map(([muscle, sets]) => {
                  // Get goal for this muscle group (default to 12 if not specified)
                  const goal = sampleGoals[muscle.toLowerCase()] || 12;
                  const percentage = Math.min((sets / goal) * 100, 100);

                  return (
                    <div key={muscle}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-text font-medium capitalize">
                          {muscle}
                        </span>
                        <span className="text-sm text-text-muted">
                          {Math.round(sets)}/{goal}
                        </span>
                      </div>
                      <ProgressBar progress={percentage} />
                    </div>
                  );
                })}
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<DumbbellIcon size={48} />}
              title="No workouts this week"
              description="Start a workout to see your progress"
            />
          </Card>
        )}

        {/* Start Workout Modal */}
        {showStartModal && (
          <Modal isOpen={true} onClose={() => setShowStartModal(false)} title="Start Workout">
            <div className="space-y-3">
              <button
                onClick={handleStartBlank}
                className="w-full py-4 px-5 bg-accent hover:bg-accent-hover rounded-xl text-left transition-all duration-200 active:scale-[0.98] text-surface"
              >
                <div className="font-semibold text-base">Start Blank Workout</div>
                <div className="text-sm opacity-90 mt-0.5">Add exercises as you go</div>
              </button>

              <button
                onClick={handleResumeDraft}
                className="w-full py-4 px-5 bg-accent-light hover:bg-accent/20 rounded-xl text-left transition-all duration-200 active:scale-[0.98] text-text"
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
                    onClick={handleStartFromTemplate}
                    disabled={!selectedTemplate}
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
                onClick={() => setShowStartModal(false)}
                variant="ghost"
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Home;
