"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';

function getSafeRedirect(value) {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '', password: '', username: '', display_name: '', institution_id: '', hostel: ''
  });
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const loginHref = redirectTo !== '/'
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : '/login';

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/institutions');
      if (data?.institutions) setInstitutions(data.institutions);
    }
    load();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Trim whitespace on blur for all text fields except password
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name !== 'password') {
      setFormData((prev) => ({ ...prev, [name]: value.trim() }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        ...formData,
        username: formData.username.trim(),
        display_name: formData.display_name.trim(),
        email: formData.email.trim(),
        hostel: formData.hostel.trim(),
        institution_id: parseInt(formData.institution_id, 10)
      });

      setToast({ type: 'success', message: 'Account created successfully! Redirecting to login...' });

      setTimeout(() => {
        router.push(loginHref);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed');
      setToast({ type: 'error', message: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-8">
      {toast && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium shadow-lg border transition-all
            ${toast.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-destructive/10 text-destructive border-destructive/20'}`}
        >
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
        </div>
      )}

      <div className="w-full max-w-md bg-card p-8 rounded-xl border border-border shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2 text-sm">Join the Copperbelt Campus Market</p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                name="display_name"
                required
                value={formData.display_name}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength="8"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Institution</label>
            <select
              name="institution_id"
              required
              value={formData.institution_id}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>Select your school/college</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hostel / Location (Optional)</label>
            <input
              type="text"
              name="hostel"
              value={formData.hostel}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Africa Hostel, Room 42"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium shadow hover:bg-primary/90 mt-4 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={loginHref} className="text-primary hover:underline font-medium">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}