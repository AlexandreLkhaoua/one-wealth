"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import type { PortfolioScoreResult, Alert } from '@/lib/types/portfolio';
import { RadialBarChart, RadialBar, Tooltip } from 'recharts';

interface Props {
  portfolioId: string;
  onAlerts?: (alerts: Alert[]) => void;
}

export default function PortfolioScore({ portfolioId, onAlerts }: Props) {
  const [score, setScore] = useState<PortfolioScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const result = await apiClient.getPortfolioScore(portfolioId, session.access_token);
        if (!mounted) return;
        setScore(result);
        if (onAlerts) onAlerts(result.alerts || []);
      } catch (err) {
        console.error('Failed to load portfolio score', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false };
  }, [portfolioId, onAlerts]);

  const chartSize = 160;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Score portefeuille</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Chargement du score...</div>}

        {!loading && score ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center relative" style={{ width: chartSize }}>
              {/* Recharts radial gauge */}
              <RadialBarChart
                width={chartSize}
                height={chartSize}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="100%"
                startAngle={180}
                endAngle={-180}
                data={[{ name: 'score', value: score.global_score }]}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={8}
                  fill={score.global_score < 40 ? '#ef4444' : score.global_score < 70 ? '#f59e0b' : '#10b981'}
                />
                <Tooltip formatter={(v:number) => `${v}/100`} />
              </RadialBarChart>

              <div className="absolute text-center" style={{ width: chartSize }}>
                <div className="text-2xl font-bold">{score.global_score}</div>
                <div className="text-xs text-muted-foreground">/100</div>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {score.sub_scores.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium capitalize">{s.name.replace('_', ' ')}</div>
                    {s.description && (
                      <div className="text-sm text-muted-foreground">{s.description}</div>
                    )}
                  </div>
                  <div className="text-lg font-bold ml-4">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && <div className="text-sm text-muted-foreground">Aucun score disponible</div>
        )}
      </CardContent>
    </Card>
  );
}
