"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Alert } from '@/lib/types/portfolio';

interface Props {
  alerts: Alert[];
  portfolioId?: string;
}

export default function PortfolioAlerts({ alerts, portfolioId }: Props) {
  // Filter important alerts (red and orange severity)
  const important = alerts.filter(a => a.severity === 'red' || a.severity === 'orange').slice(0, 3);

  const colorFor = (severity: string) => {
    if (severity === 'red') return 'bg-red-600 text-white';
    if (severity === 'orange') return 'bg-amber-500 text-black';
    return 'bg-emerald-500 text-white';
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Alertes IA</CardTitle>
      </CardHeader>
      <CardContent>
        {important.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucune alerte majeure</div>
        )}
        <div className="space-y-3">
          {important.map((a) => (
            <div key={a.code} className="flex items-start gap-3">
              <div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${colorFor(a.severity)}`}>
                  {a.severity.toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-semibold">{a.message}</div>
                {a.recommendation && (
                  <div className="text-sm text-muted-foreground mt-1">{a.recommendation}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        {portfolioId && important.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Voir le diagnostic"
              className="inline-flex items-center px-3 py-1.5 rounded bg-[color:var(--chart-2)] text-white text-sm font-medium"
            >
              Voir le diagnostic
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
