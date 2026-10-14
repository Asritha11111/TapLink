// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: '' }));
    setApiError('');
  }

  function validate() {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Enter a valid email address';
    if (form.password.length < 8)
      errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm)
      errs.confirm = 'Passwords do not match';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/home');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⌁</div>
          <h1>TapLink</h1>
          <p>Create your account</p>
        </div>

        {apiError && <div className="alert alert-error" role="alert">{apiError}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name" className="form-input" type="text"
              name="name" autoComplete="name" placeholder="Jane Doe"
              value={form.name} onChange={handleChange} required
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email" className="form-input" type="email"
              name="email" autoComplete="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange} required
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password" className="form-input" type="password"
              name="password" autoComplete="new-password" placeholder="Min. 8 characters"
              value={form.password} onChange={handleChange} required
            />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm" className="form-input" type="password"
              name="confirm" autoComplete="new-password" placeholder="Repeat password"
              value={form.confirm} onChange={handleChange} required
            />
            {errors.confirm && <span className="form-error">{errors.confirm}</span>}
          </div>

          <button
            id="register-submit" type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <span className="spinner spinner-sm" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-link" style={{ marginTop: 20 }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
