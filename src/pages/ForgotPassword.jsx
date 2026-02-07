/**
 * Forgot Password Page
 *
 * Email input page to request password reset
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { isValidEmail } from '../lib/formatters';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { error: showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      // Always show success message for security (don't reveal if email exists)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-display font-semibold text-text mb-2">
              Check Your Email
            </h1>
            <p className="text-text-muted">
              If an account exists with that email, you'll receive password reset instructions shortly.
            </p>
          </div>

          <Card>
            <div className="space-y-4">
              <div className="p-4 bg-accent-light rounded-lg">
                <p className="text-sm text-text">
                  <strong className="font-semibold">Didn't receive an email?</strong>
                  <br />
                  Check your spam folder or try again with a different email address.
                </p>
              </div>

              <Link to="/login">
                <Button variant="secondary" fullWidth>
                  Back to Login
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
            Forgot Password
          </h2>
          <p className="text-text-muted">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!email || loading}
            >
              Send Reset Link
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
            Remember your password?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
