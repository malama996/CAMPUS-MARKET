"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '', password: '', username: '', display_name: '', institution_id: '', hostel: ''
  });
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/institutions');
      if (data?.institutions) setInstitutions(data.institutions);
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await register({
        ...formData,
        institution_id: parseInt(formData.institution_id, 10)
      });

      if (result?.access_token) {
        router.push('/market');
      } else {
        router.push('/login');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-8">
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
              <input type="text" name="username" required value={formData.username} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input type="text" name="display_name" required value={formData.display_name} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" name="password" required minLength="8" value={formData.password} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Institution</label>
            <select name="institution_id" required value={formData.institution_id} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="" disabled>Select your school/college</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hostel / Location (Optional)</label>
            <input type="text" name="hostel" value={formData.hostel} onChange={handleChange} placeholder="e.g. Africa Hostel, Room 42" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium shadow hover:bg-primary/90 mt-4 disabled:opacity-50">
            {loading ? 'Creating Account...' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
        </div>
      </div>
    </div>
  );
}
