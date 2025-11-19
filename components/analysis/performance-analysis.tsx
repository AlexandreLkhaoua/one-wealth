'use client';

import { Card } from '@/components/ui/card-premium';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';
import { TrendingUp, Activity, Target, BarChart3 } from 'lucide-react';
import type { PortfolioPosition } from '@/lib/types/portfolio';

interface PerformanceAnalysisProps {
  positions: PortfolioPosition[];
  totalValue: number;
}

export function PerformanceAnalysis({ positions, totalValue }: PerformanceAnalysisProps) {
  // Calcul des métriques de performance
  const calculateMetrics = () => {
    if (positions.length === 0) {
      return {
        ytdReturn: 0,
        totalGain: 0,
        avgPerformance: 0,
        sharpeRatio: 0,
      };
    }

    // Performance moyenne pondérée par la valeur
    const avgPerformance = positions.reduce((sum, p) => {
      const weight = p.current_value / totalValue;
      return sum + (p.asset?.perf_1y || 0) * weight;
    }, 0);

    // Gain total (simulé - devrait venir de purchase_price)
    const totalGain = avgPerformance;

    // YTD Return (simulé comme 80% de la perf 1Y)
    const ytdReturn = avgPerformance * 0.8;

    // Sharpe Ratio (simplifié)
    // = (Return - Risk-free rate) / Volatility
    const avgVolatility = positions.reduce((sum, p) => {
      const weight = p.current_value / totalValue;
      return sum + (p.asset?.volatility_1y || 15) * weight;
    }, 0);
    const sharpeRatio = avgVolatility > 0 ? (avgPerformance - 2) / avgVolatility : 0;

    return {
      ytdReturn,
      totalGain,
      avgPerformance,
      sharpeRatio,
    };
  };

  const metrics = calculateMetrics();

  // Calcul du maximum drawdown (simulé)
  const maxDrawdown = -12.5;

  // Calcul de l'alpha et beta (simulés)
  const alpha = 1.2;
  const beta = 0.95;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <MetricGrid cols={4}>
        <MetricCard
          title="Performance YTD"
          value={metrics.ytdReturn}
          type="percentage"
          trend={metrics.ytdReturn}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="premium"
        />
        <MetricCard
          title="Performance 1 an"
          value={metrics.avgPerformance}
          type="percentage"
          trend={metrics.avgPerformance}
          icon={<Activity className="w-5 h-5" />}
          variant="premium"
        />
        <MetricCard
          title="Ratio de Sharpe"
          value={metrics.sharpeRatio}
          type="number"
          icon={<Target className="w-5 h-5" />}
          subtitle="Risk-adjusted return"
          variant="premium"
        />
        <MetricCard
          title="Drawdown Max"
          value={maxDrawdown}
          type="percentage"
          trend={0}
          icon={<BarChart3 className="w-5 h-5" />}
          variant="premium"
        />
      </MetricGrid>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alpha & Beta Card */}
        <Card variant="premium">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Analyse Alpha/Beta</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Alpha</p>
                  <p className="text-2xl font-bold text-success-700 dark:text-success-500">
                    {alpha.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">vs. Marché</p>
                  <p className="text-sm font-medium">+{((alpha - 1) * 100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Beta</p>
                  <p className="text-2xl font-bold">{beta.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Volatilité</p>
                  <p className="text-sm font-medium">-5% vs. Marché</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Alpha &gt; 0 indique une surperformance. Beta &lt; 1 indique moins de volatilité que le marché.
            </p>
          </div>
        </Card>

        {/* Risk Metrics Card */}
        <Card variant="premium">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Métriques de Risque</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volatilité annuelle</span>
                  <span className="font-medium">
                    {(positions.reduce((sum, p) => sum + (p.asset?.volatility_1y || 0), 0) / positions.length).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning-500"
                    style={{ width: '65%' }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">VaR 95% (1 jour)</span>
                  <span className="font-medium text-danger-700 dark:text-danger-500">
                    -{(totalValue * 0.025).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} EUR
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-danger-500"
                    style={{ width: '25%' }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expected Shortfall</span>
                  <span className="font-medium text-danger-700 dark:text-danger-500">
                    -{(totalValue * 0.035).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} EUR
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-danger-600"
                    style={{ width: '35%' }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              VaR 95% : perte maximale dans 95% des cas sur 1 jour de trading.
            </p>
          </div>
        </Card>
      </div>

      {/* Performance History (Placeholder pour les vrais graphiques) */}
      <Card variant="premium">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Historique de Performance</h3>
          <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
            <p className="text-muted-foreground">
              Graphique d'évolution de la performance (à venir avec @nivo/line)
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
