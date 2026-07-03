"use client";

import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function InstitutionFilter({ value, onChange }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/institutions');
      if (data?.institutions) {
        setInstitutions(data.institutions);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="h-10 animate-pulse bg-muted rounded-md" />;

  return (
    <div className="w-full sm:max-w-xs">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">All Copperbelt Institutions</option>
        {institutions.map(inst => (
          <option key={inst.id} value={inst.name}>
            {inst.short_name} - {inst.city}
          </option>
        ))}
      </select>
    </div>
  );
}
