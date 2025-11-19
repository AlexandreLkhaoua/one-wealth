"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge-premium';

import type { ScoreAlert } from '@/lib/types/portfolio';

interface Props {
  alerts: ScoreAlert[];
  portfolioId?: string;
}

export default function PortfolioAlerts({ alerts, portfolioId }: Props) {
  const important = alerts.filter(a => a.level === 'red' || a.level === 'orange').slice(0, 3);

  const colorFor = (level: string) => {
    if (level === 'red') return 'bg-red-600 text-white';
    if (level === 'orange') return 'bg-amber-500 text-black';
    return 'bg-emerald-500 text-white';
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Alertes IA</CardTitle>
      </CardHeader>
      <CardContent>
        {important.length === 0 && <div className="text-sm text-muted-foreground">Aucune alerte majeure</div>}
        <div className="space-y-3">
          {important.map((a) => (
            <div key={a.code} className="flex items-start gap-3">
              <div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colorFor(a.level)}`}>{a.level.toUpperCase()}</span>
              </div>
              <div>
                <div className="font-semibold">{a.message}</div>
                {a.detail && <div className="text-sm text-muted-foreground">{a.detail}</div>}
              </div>
            </div>
          ))}
        </div>
        {portfolioId && important.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => window.open(`/dashboard/client/${portfolioId}`, '_self')}
              className="inline-flex items-center px-3 py-1.5 rounded bg-royal-500 text-white text-sm font-medium"
            >
              Voir le diagnostic
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
