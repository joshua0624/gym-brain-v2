/**
 * Login Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatError } from '../lib/formatters';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
    rememberMe: false,
  });
  const [localError, setLocalError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setLocalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    const result = await login(
      formData.usernameOrEmail,
      formData.password,
      formData.rememberMe
    );

    if (result.success) {
      navigate('/workout');
    } else {
      setLocalError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-md border border-border-light p-8">
        <div className="text-center mb-8">
          <h1 className="text-[28px] md:text-[32px] font-display font-semibold text-text">
            Gym<span className="text-accent">BrAIn</span>
          </h1>
          <p className="text-text-muted mt-2 text-sm">Workout tracking with AI assistance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {(localError || error) && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-xl text-sm">
              {formatError(localError || error)}
            </div>
          )}

          <Input
            label="Username or Email"
            type="text"
            id="usernameOrEmail"
            name="usernameOrEmail"
            value={formData.usernameOrEmail}
            onChange={handleChange}
            required
            fullWidth
            placeholder="Enter your username or email"
          />

          <Input
            label="Password"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            fullWidth
            placeholder="Enter your password"
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 text-accent bg-bg border-border rounded focus:ring-accent focus:ring-2"
              />
              <span className="ml-2 text-text">Remember me</span>
            </label>

            <Link to="/forgot-password" className="text-accent hover:text-accent-hover transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            fullWidth
            size="lg"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
