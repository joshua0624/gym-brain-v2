/**
 * Reset Password Page
 *
 * New password form with token validation
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { isValidPassword } from '../lib/formatters';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    // Extract token from URL query params
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      showError('Invalid reset link');
      navigate('/login');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, navigate, showError]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 8) return 'weak';
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong';
    return 'medium';
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isPasswordValid = isValidPassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!isPasswordValid) {
      showError('Password must be at least 8 characters');
      return;
    }

    if (!passwordsMatch) {
      showError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      success('Password reset successful! Please log in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Reset password error:', err);
      if (err.response?.data?.error?.includes('expired') || err.response?.data?.error?.includes('invalid')) {
        showError('Reset link has expired or is invalid. Please request a new one.');
      } else {
        showError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-block mb-6">
            <h1 className="text-3xl font-bold">
              <span className="text-accent font-display">Gym</span>
              <span className="text-text">BrAI</span>
              <span className="text-text">n</span>
            </h1>
          </Link>
          <h2 className="text-[28px] font-display font-semibold text-text mb-2">
            Reset Password
          </h2>
          <p className="text-text-muted">
            Enter your new password below.
          </p>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-sm"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength === 'weak' ? 'bg-error' :
                      passwordStrength === 'medium' ? 'bg-warning' :
                      'bg-success'
                    }`} />
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength === 'medium' || passwordStrength === 'strong' ?
                        passwordStrength === 'medium' ? 'bg-warning' : 'bg-success'
                      : 'bg-border-light'
                    }`} />
                    <div className={`h-1 flex-1 rounded-full ${
                      passwordStrength === 'strong' ? 'bg-success' : 'bg-border-light'
                    }`} />
                  </div>
                  <p className={`text-xs ${
                    passwordStrength === 'weak' ? 'text-error' :
                    passwordStrength === 'medium' ? 'text-warning' :
                    'text-success'
                  }`}>
                    {passwordStrength === 'weak' && 'Weak password'}
                    {passwordStrength === 'medium' && 'Medium strength'}
                    {passwordStrength === 'strong' && 'Strong password'}
                  </p>
                </div>
              )}

              <p className="mt-2 text-xs text-text-muted">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />

              {/* Match Indicator */}
              {confirmPassword && (
                <p className={`mt-2 text-xs ${
                  passwordsMatch ? 'text-success' : 'text-error'
                }`}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!isPasswordValid || !passwordsMatch || loading}
            >
              Reset Password
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-accent hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </Card>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-text-muted">
            Need a new reset link?{' '}
            <Link to="/forgot-password" className="text-accent hover:underline font-medium">
              Request another
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
