/**
 * Progress Page - Charts and PR tracking
 *
 * Features: Exercise progression charts, PR table (1RM, 3RM, 5RM, 10RM), weekly stats
 */

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { exerciseAPI, progressAPI } from '../lib/api';
import { formatDate, formatWeight, calculateEstimated1RM, formatEstimated1RM } from '../lib/formatters';
import { CHART_COLORS, REP_RANGES } from '../lib/constants';
import { useToast } from '../hooks/useToast';
import SegmentedControl from '../components/ui/SegmentedControl';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { SkeletonChart } from '../components/ui/Skeleton';
import { TrophyIcon } from '../icons';

const Progress = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [prs, setPRs] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('charts'); // 'charts' | 'prs' | 'weekly'
  const [selectedPRExerciseId, setSelectedPRExerciseId] = useState(null);
  const [muscleChartMode, setMuscleChartMode] = useState('volume'); // 'volume' | 'sets'
  const { error: showError } = useToast();

  useEffect(() => {
    loadExercises();
    loadPRs();
    loadWeeklyStats();
  }, []);

  useEffect(() => {
    if (selectedExerciseId) {
      loadProgressData(selectedExerciseId);
    }
  }, [selectedExerciseId]);

  const loadExercises = async () => {
    try {
      const data = await exerciseAPI.getAll();
      const weightedExercises = (data.exercises || []).filter(ex => ex.type === 'weighted');
      setExercises(weightedExercises);
      if (weightedExercises.length > 0 && !selectedExerciseId) {
        setSelectedExerciseId(weightedExercises[0].id);
      }
    } catch (err) {
      console.error('Failed to load exercises:', err);
      showError('Failed to load exercises');
    }
  };

  const loadProgressData = async (exerciseId) => {
    setLoading(true);
    try {
      const result = await progressAPI.getExerciseProgress(exerciseId);
      setProgressData(result.progress || []);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      showError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const loadPRs = async () => {
    try {
      const data = await progressAPI.getPRs();
      setPRs(data.prs || []);
    } catch (err) {
      console.error('Failed to load PRs:', err);
      showError('Failed to load PRs');
    }
  };

  const loadWeeklyStats = async () => {
    try {
      const data = await progressAPI.getWeeklyStats();
      setWeeklyStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load weekly stats:', err);
      showError('Failed to load weekly stats');
    }
  };

  const selectedExercise = exercises.find(ex => ex.id === selectedExerciseId);

  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-text mb-6">
          Progress Tracking
        </h1>

        {/* View tabs */}
        <div className="mb-6">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'charts', label: 'Exercise Charts' },
              { value: 'prs', label: 'Personal Records' },
              { value: 'weekly', label: 'Weekly Stats' },
            ]}
          />
        </div>

        {/* Charts view */}
        {view === 'charts' && (
          <div className="space-y-6">
            {/* Exercise selector */}
            <Card>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Select Exercise
              </label>
              <select
                value={selectedExerciseId || ''}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="w-full md:w-96 px-4 py-2.5 bg-surface border border-border rounded-lg text-text font-body focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              >
                {exercises.map(exercise => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </Card>

            {/* Charts */}
            {loading ? (
              <div className="space-y-6">
                <SkeletonChart height={300} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SkeletonChart height={250} />
                  <SkeletonChart height={250} />
                </div>
              </div>
            ) : progressData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-muted mb-2">No progress data for this exercise</p>
                <p className="text-sm text-text-light">
                  Complete workouts to see your progress charts
                </p>
              </div>
            ) : (
              <>
                {/* Weight progression chart - Full width primary chart */}
                <Card>
                  <h3 className="font-display text-lg font-semibold text-text mb-4">
                    Weight Progression
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => formatDate(date)}
                        stroke="var(--text-light)"
                        style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}
                      />
                      <YAxis
                        stroke="var(--text-light)"
                        style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-md)',
                          fontFamily: 'var(--font-body)'
                        }}
                        labelStyle={{ color: 'var(--text)', fontWeight: 500 }}
                        labelFormatter={(date) => formatDate(date)}
                      />
                      <Legend
                        wrapperStyle={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: 'var(--text-muted)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="max_weight"
                        stroke={CHART_COLORS.weight}
                        name="Max Weight (lbs)"
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.weight, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Secondary charts - 2-column grid on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Estimated 1RM chart */}
                  <Card>
                    <h3 className="font-display text-lg font-semibold text-text mb-4">
                      Estimated 1RM Progression
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => formatDate(date)}
                          stroke="var(--text-light)"
                          style={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}
                        />
                        <YAxis
                          stroke="var(--text-light)"
                          style={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-md)',
                            fontFamily: 'var(--font-body)'
                          }}
                          labelStyle={{ color: 'var(--text)', fontWeight: 500 }}
                          labelFormatter={(date) => formatDate(date)}
                        />
                        <Legend
                          wrapperStyle={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '12px',
                            color: 'var(--text-muted)'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="estimated_1rm"
                          stroke={CHART_COLORS.estimated1RM}
                          name="Estimated 1RM (lbs)"
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.estimated1RM, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Volume chart */}
                  <Card>
                    <h3 className="font-display text-lg font-semibold text-text mb-4">
                      Volume Progression
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => formatDate(date)}
                          stroke="var(--text-light)"
                          style={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}
                        />
                        <YAxis
                          stroke="var(--text-light)"
                          style={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-md)',
                            fontFamily: 'var(--font-body)'
                          }}
                          labelStyle={{ color: 'var(--text)', fontWeight: 500 }}
                          labelFormatter={(date) => formatDate(date)}
                        />
                        <Legend
                          wrapperStyle={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '12px',
                            color: 'var(--text-muted)'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total_volume"
                          stroke={CHART_COLORS.volume}
                          name="Total Volume (lbs)"
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.volume, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* PRs view */}
        {view === 'prs' && (
          <div className="space-y-6">
            {prs.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-light mb-4">
                  <TrophyIcon size={32} color="var(--accent)" strokeWidth={1.5} />
                </div>
                <p className="text-xl text-text font-display mb-2">No PRs yet</p>
                <p className="text-text-muted">Start logging workouts to track your personal records</p>
              </div>
            ) : (
              <>
                {/* Exercise selector */}
                <Card>
                  <label className="block text-sm font-medium text-text-muted mb-2">
                    Select Exercise
                  </label>
                  <select
                    value={selectedPRExerciseId || ''}
                    onChange={(e) => setSelectedPRExerciseId(e.target.value)}
                    className="w-full md:w-96 px-4 py-2.5 bg-surface border border-border rounded-lg text-text font-body focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  >
                    <option value="">All Exercises</option>
                    {exercises.map(exercise => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </Card>

                {/* PR table by exercise */}
                {exercises
                  .filter(exercise => !selectedPRExerciseId || exercise.id === selectedPRExerciseId)
                  .map(exercise => {
                    const exercisePRs = prs.filter(pr => pr.exercise_id === exercise.id);
                    if (exercisePRs.length === 0) return null;

                    return (
                      <Card key={exercise.id}>
                        <h3 className="font-display text-lg font-semibold text-text mb-4">
                          {exercise.name}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {REP_RANGES.map(repRange => {
                            const pr = exercisePRs.find(p => p.rep_range === repRange.value);
                            return (
                              <div
                                key={repRange.value}
                                className="bg-bg-alt rounded-lg p-4 border border-border-light"
                              >
                                <div className="text-sm font-medium text-text-muted mb-1">
                                  {repRange.label}
                                </div>
                                {pr ? (
                                  <>
                                    <div className="font-mono text-2xl font-bold text-text mb-1">
                                      {formatWeight(pr.max_weight)}
                                    </div>
                                    <div className="text-xs text-text-muted">
                                      <span className="font-mono">{pr.reps}</span> reps • {formatDate(pr.date)}
                                    </div>
                                    {pr.estimated_1rm && (
                                      <div className="text-xs text-text-light mt-1">
                                        Est. 1RM: <span className="font-mono">{formatWeight(pr.estimated_1rm)}</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-text-light">No data</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
              </>
            )}
          </div>
        )}

        {/* Weekly stats view */}
        {view === 'weekly' && (
          <div className="space-y-6">
            {!weeklyStats ? (
              <div className="text-center py-12 text-text-muted">Loading weekly stats...</div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="text-center">
                    <div className="text-sm font-medium text-text-muted mb-1">Total Workouts</div>
                    <div className="font-display text-2xl font-bold text-text">
                      {weeklyStats.total_workouts || 0}
                    </div>
                  </Card>
                  <Card className="text-center">
                    <div className="text-sm font-medium text-text-muted mb-1">Total Volume</div>
                    <div className="font-display text-2xl font-bold text-text">
                      {Math.round(weeklyStats.total_volume || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-light mt-0.5">lbs</div>
                  </Card>
                  <Card className="text-center">
                    <div className="text-sm font-medium text-text-muted mb-1">Total Sets</div>
                    <div className="font-display text-2xl font-bold text-text">
                      {weeklyStats.total_sets || 0}
                    </div>
                  </Card>
                  <Card className="text-center">
                    <div className="text-sm font-medium text-text-muted mb-1">Avg Duration</div>
                    <div className="font-display text-2xl font-bold text-text">
                      {weeklyStats.avg_duration_minutes
                        ? `${Math.round(weeklyStats.avg_duration_minutes)}m`
                        : '-'}
                    </div>
                  </Card>
                </div>

                {/* Volume/Sets by muscle group */}
                {weeklyStats.volume_by_muscle && Object.keys(weeklyStats.volume_by_muscle).length > 0 && (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg font-semibold text-text">
                        {muscleChartMode === 'volume' ? 'Volume' : 'Sets'} by Muscle Group
                      </h3>
                      <SegmentedControl
                        value={muscleChartMode}
                        onChange={setMuscleChartMode}
                        options={[
                          { value: 'volume', label: 'Volume' },
                          { value: 'sets', label: 'Sets' }
                        ]}
                      />
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const muscleData = muscleChartMode === 'volume'
                          ? weeklyStats.volume_by_muscle
                          : weeklyStats.sets_by_muscle || {};
                        const maxValue = Math.max(...Object.values(muscleData));
                        const sortedData = Object.entries(muscleData).sort(([, a], [, b]) => b - a);

                        return sortedData.map(([muscle, value]) => {
                          const percentage = (value / maxValue) * 100;
                          return (
                            <div key={muscle}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-text font-medium capitalize">{muscle}</span>
                                <span className="font-display text-text font-semibold">
                                  {muscleChartMode === 'volume'
                                    ? `${Math.round(value).toLocaleString()} lbs`
                                    : `${Math.round(value)} sets`
                                  }
                                </span>
                              </div>
                              <ProgressBar progress={percentage} />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Progress;
