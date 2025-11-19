"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

interface Props {
  portfolioId: string;
  onUpdated?: () => void;
}

export default function PortfolioInvestorProfile({ portfolioId, onUpdated }: Props) {
  const [label, setLabel] = useState<string>('equilibre');
  const [horizon, setHorizon] = useState<number | undefined>(undefined);
  const [objective, setObjective] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const profile = await apiClient.getPortfolioProfile(portfolioId, session.access_token);
        if (!mounted) return;
        setLabel(profile.label || 'equilibre');
        setHorizon(profile.investment_horizon_years || undefined);
        setObjective(profile.objective || '');
      } catch (e) {
        console.error('Failed to load profile', e);
      }
    };
    load();
    return () => { mounted = false };
  }, [portfolioId]);

  const save = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session missing');

      await apiClient.updatePortfolioProfile(
        portfolioId,
        { label, investment_horizon_years: horizon, objective },
        session.access_token
      );

      if (onUpdated) onUpdated();
    } catch (e) {
      console.error('Failed to save profile', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Profil investisseur</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4">
          <Button variant={label === 'prudent' ? 'default' : 'ghost'} onClick={() => setLabel('prudent')}>Prudent</Button>
          <Button variant={label === 'equilibre' ? 'default' : 'ghost'} onClick={() => setLabel('equilibre')}>Équilibré</Button>
          <Button variant={label === 'dynamique' ? 'default' : 'ghost'} onClick={() => setLabel('dynamique')}>Dynamique</Button>
        </div>

        <div className="space-y-2 mb-4">
          <label className="text-sm text-muted-foreground block">Horizon (années)</label>
          <Input type="number" min={1} max={30} value={horizon ?? ''} onChange={(e) => setHorizon(Number(e.target.value) || undefined)} />
        </div>

        <div className="space-y-2 mb-4">
          <label className="text-sm text-muted-foreground block">Objectif</label>
          <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
