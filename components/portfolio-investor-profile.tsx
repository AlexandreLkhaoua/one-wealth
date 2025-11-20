"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Props {
  portfolioId: string;
  onUpdated?: () => void;
}

export default function PortfolioInvestorProfile({ portfolioId, onUpdated }: Props) {
  const [profile, setProfile] = useState<string>('equilibre');
  const [targetEquity, setTargetEquity] = useState<number>(60);
  const [horizon, setHorizon] = useState<number>(10);
  const [objective, setObjective] = useState<string>('croissance');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Session expirée');
          return;
        }

        const data = await apiClient.getPortfolioProfile(portfolioId, session.access_token);
        if (!mounted) return;
        
        setProfile(data.investor_profile);
        setTargetEquity(data.target_equity_pct);
        setHorizon(data.investment_horizon_years);
        setObjective(data.objective);
      } catch (e) {
        console.error('Failed to load profile', e);
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Erreur de chargement');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [portfolioId]);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expirée');
      }

      await apiClient.updatePortfolioProfile(
        portfolioId,
        { 
          investor_profile: profile,
          target_equity_pct: targetEquity,
          investment_horizon_years: horizon, 
          objective 
        },
        session.access_token
      );

      toast.success('Profil mis à jour');
      if (onUpdated) onUpdated();
    } catch (e) {
      console.error('Failed to save profile', e);
      const errorMsg = e instanceof Error ? e.message : 'Erreur de sauvegarde';
      setError(errorMsg);
      toast.error(errorMsg);
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
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement...</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Profil investisseur</label>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant={profile === 'prudent' ? 'default' : 'outline'} 
                    onClick={() => { setProfile('prudent'); setTargetEquity(20); }}
                    size="sm"
                  >
                    Prudent (20%)
                  </Button>
                  <Button 
                    variant={profile === 'equilibre' ? 'default' : 'outline'} 
                    onClick={() => { setProfile('equilibre'); setTargetEquity(60); }}
                    size="sm"
                  >
                    Équilibré (60%)
                  </Button>
                  <Button 
                    variant={profile === 'dynamique' ? 'default' : 'outline'} 
                    onClick={() => { setProfile('dynamique'); setTargetEquity(80); }}
                    size="sm"
                  >
                    Dynamique (80%)
                  </Button>
                  <Button 
                    variant={profile === 'agressif' ? 'default' : 'outline'} 
                    onClick={() => { setProfile('agressif'); setTargetEquity(90); }}
                    size="sm"
                  >
                    Agressif (90%)
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Actions cible: {targetEquity}%
                </label>
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  step={5}
                  value={targetEquity} 
                  onChange={(e) => setTargetEquity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Horizon (années)</label>
                <Input 
                  type="number" 
                  min={1} 
                  max={30} 
                  value={horizon} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0) setHorizon(val);
                  }} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Objectif</label>
                <Input 
                  value={objective} 
                  onChange={(e) => setObjective(e.target.value)} 
                  placeholder="ex: croissance, retraite, etc."
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={save} disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
