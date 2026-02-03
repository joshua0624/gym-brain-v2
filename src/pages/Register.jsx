/**
 * Register Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToastContext } from '../contexts/ToastContext';
import { isValidUsername, isValidEmail, isValidPassword, formatError } from '../lib/formatters';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const { success, error: showError } = useToastContext();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};

    if (!isValidUsername(formData.username)) {
      newErrors.username = 'Username must be 3-30 characters (letters, numbers, underscore only)';
    }

    if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const result = await register(
      formData.username,
      formData.email,
      formData.password
    );

    if (result.success) {
      success('Account created successfully!');
      navigate('/workout');
    } else {
      showError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-md border border-border-light p-8">
        <div className="text-center mb-8">
          <h1 className="text-[28px] md:text-[32px] font-display font-semibold text-text">
            Gym<span className="text-accent">BrAIn</span>
          </h1>
          <p className="text-text-muted mt-2 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Username"
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            fullWidth
            placeholder="Choose a username"
            error={errors.username}
          />

          <Input
            label="Email"
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            fullWidth
            placeholder="Enter your email"
            error={errors.email}
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
            placeholder="Create a password (min 8 characters)"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            fullWidth
            placeholder="Confirm your password"
            error={errors.confirmPassword}
          />

          <Button
            type="submit"
            disabled={loading}
            fullWidth
            size="lg"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
