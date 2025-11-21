'use client';

import { Card } from '@/components/ui/card-premium';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge-premium';
import { PieChart, LayoutGrid, TrendingDown, AlertCircle } from 'lucide-react';
import type { PortfolioPosition } from '@/lib/types/portfolio';

interface AllocationAnalysisProps {
  positions: PortfolioPosition[];
  totalValue: number;
  byAssetClass: Record<string, number>;
  byRegion: Record<string, number>;
}

export function AllocationAnalysis({ 
  positions, 
  totalValue,
  byAssetClass,
  byRegion 
}: AllocationAnalysisProps) {
  // Calcul de la concentration (Index d'Herfindahl)
  const calculateConcentration = () => {
    const herfindahl = positions.reduce((sum, p) => {
      const share = p.current_value / totalValue;
      return sum + share * share;
    }, 0);
    
    return {
      index: herfindahl * 10000, // Normalisé sur 10000
      level: herfindahl > 0.15 ? 'Élevée' : herfindahl > 0.10 ? 'Modérée' : 'Faible',
      color: herfindahl > 0.15 ? 'danger' : herfindahl > 0.10 ? 'warning' : 'success'
    };
  };

  const concentration = calculateConcentration();

  // Top 5 positions
  const topPositions = [...positions]
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 5);

  // Répartition par secteur (depuis asset.sector)
  const bySector = positions.reduce((acc: Record<string, number>, p) => {
    const sector = p.asset?.sector || 'Non classifié';
    acc[sector] = (acc[sector] || 0) + p.current_value;
    return acc;
  }, {});

  const sectorData = Object.entries(bySector)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalValue) * 100
    }))
    .sort((a, b) => b.value - a.value);

  // Répartition par classe d'actifs
  const assetClassData = Object.entries(byAssetClass)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalValue) * 100
    }))
    .sort((a, b) => b.value - a.value);

  // Répartition par région
  const regionData = Object.entries(byRegion)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalValue) * 100
    }))
    .sort((a, b) => b.value - a.value);

  // Calcul des métriques d'allocation
  const numPositions = positions.length;
  const avgPositionSize = totalValue / numPositions;
  const largestPosition = Math.max(...positions.map(p => p.current_value));
  const largestPositionPct = (largestPosition / totalValue) * 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <MetricGrid cols={4}>
        <MetricCard
          title="Nombre de Positions"
          value={numPositions}
          type="number"
          icon={<LayoutGrid className="w-5 h-5" />}
          subtitle={`Taille moy. ${(avgPositionSize / 1000).toFixed(0)}k EUR`}
          variant="premium"
        />
        <MetricCard
          title="Plus Grande Position"
          value={largestPositionPct}
          type="percentage"
          icon={<TrendingDown className="w-5 h-5" />}
          subtitle={`${(largestPosition / 1000).toFixed(0)}k EUR`}
          variant="premium"
        />
        <MetricCard
          title="Concentration (HHI)"
          value={concentration.index}
          type="number"
          icon={<PieChart className="w-5 h-5" />}
          subtitle={concentration.level}
          variant="premium"
        />
        <MetricCard
          title="Diversification"
          value={numPositions > 20 ? 85 : numPositions > 10 ? 70 : 50}
          type="number"
          icon={<AlertCircle className="w-5 h-5" />}
          subtitle="Score sur 100"
          variant="premium"
        />
      </MetricGrid>

      {/* Top 5 Positions */}
      <Card variant="premium">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top 5 Positions</h3>
            <Badge variant={concentration.color as any}>
              Concentration {concentration.level}
            </Badge>
          </div>
          <div className="space-y-3">
            {topPositions.map((position, index) => {
              const percentage = (position.current_value / totalValue) * 100;
              return (
                <div key={position.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{position.instrument_name}</span>
                      {position.asset?.sector && (
                        <Badge variant="outline" className="text-xs">
                          {position.asset.sector}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {position.current_value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} EUR
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% du portefeuille
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--chart-2)] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Allocation Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Par Classe d'Actifs */}
        <Card variant="premium">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Par Classe d'Actifs</h3>
            <div className="space-y-3">
              {assetClassData.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[color:var(--chart-2)] to-[color:var(--chart-2)]/80"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Par Secteur */}
        <Card variant="premium">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Par Secteur</h3>
            <div className="space-y-3">
              {sectorData.slice(0, 6).map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-success-500 to-success-400"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Par Région */}
        <Card variant="premium">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Par Région</h3>
            <div className="space-y-3">
              {regionData.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-warning-500 to-warning-400"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Placeholder pour les graphiques avancés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="premium">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Treemap - Allocation</h3>
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground text-center">
                Visualisation Treemap<br />
                <span className="text-xs">(à venir avec @nivo/treemap)</span>
              </p>
            </div>
          </div>
        </Card>

        <Card variant="premium">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sankey - Flux d'Allocation</h3>
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground text-center">
                Diagramme Sankey<br />
                <span className="text-xs">(à venir avec @nivo/sankey)</span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
