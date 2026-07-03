"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';
import ImageUploader from '../../../components/ImageUploader';
import FreeTierBanner from '../../../components/FreeTierBanner';

export default function NewListingPage() {
  const [formData, setFormData] = useState({
    title: '', description: '', price_zmw: '', category_id: '1', is_negotiable: true, school: '', hostel: ''
  });
  const [images, setImages] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
    async function load() {
      const { data } = await api.get('/institutions');
      if (data?.institutions) setInstitutions(data.institutions);
    }
    load();
    if (profile) {
      setFormData(prev => ({ ...prev, school: profile.school, hostel: profile.hostel || '' }));
    }
  }, [user, profile, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: apiErr } = await api.post('/listings', {
        ...formData,
        price_zmw: parseFloat(formData.price_zmw),
        category_id: parseInt(formData.category_id, 10),
        images
      });
      
      if (apiErr) throw new Error(apiErr);
      if (data?.listing) {
        router.push(`/listing/${data.listing.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Post a New Listing</h1>
      
      <div className="mb-6">
        <FreeTierBanner />
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md mb-6 border border-destructive/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g., iPhone 12 Pro Max" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price (ZMW)</label>
            <input type="number" name="price_zmw" required min="0" step="0.01" value={formData.price_zmw} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select name="category_id" required value={formData.category_id} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="1">Textbooks</option>
              <option value="2">Fashion</option>
              <option value="3">Food</option>
              <option value="4">Electronics</option>
              <option value="5">Services</option>
              <option value="6">Room Essentials</option>
              <option value="7">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" required rows="4" value={formData.description} onChange={handleChange} placeholder="Describe the item, condition, and any other details..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Images (up to 6)</label>
          <ImageUploader images={images} setImages={setImages} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Institution</label>
            <select name="school" required value={formData.school} onChange={handleChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="" disabled>Select institution</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.name}>{inst.short_name} - {inst.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location Details (Optional)</label>
            <input type="text" name="hostel" value={formData.hostel} onChange={handleChange} placeholder="e.g., Africa Hostel" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input type="checkbox" id="negotiable" name="is_negotiable" checked={formData.is_negotiable} onChange={handleChange} className="h-4 w-4 rounded border-input" />
          <label htmlFor="negotiable" className="text-sm font-medium leading-none">Price is negotiable</label>
        </div>

        <div className="pt-4 border-t border-border">
          <button type="submit" disabled={loading} className="w-full h-11 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 text-sm font-medium shadow transition-colors hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Posting...' : 'Post Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
