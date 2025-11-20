'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card-premium';
import { Badge } from '@/components/ui/badge-premium';
import { AnimatedCurrency, AnimatedPercentage } from '@/components/ui/animated-number';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Search,
  AlertTriangle 
} from 'lucide-react';
import type { PortfolioPosition } from '@/lib/types/portfolio';
import { Input } from '@/components/ui/input';

interface HoldingsAnalysisProps {
  positions: PortfolioPosition[];
  totalValue: number;
}

export function HoldingsAnalysis({ positions, totalValue }: HoldingsAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'value' | 'performance' | 'name'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Enrichir les positions avec des calculs
  const enrichedPositions = positions.map(position => {
    const performance = position.asset?.perf_1y || 0;
    const weight = (position.current_value / totalValue) * 100;
    const volatility = position.asset?.volatility_1y || 15;
    
    // Risk contribution (simplifié: weight * volatility)
    const riskContribution = (weight / 100) * volatility;
    
    // Simulation P&L (si on avait purchase_price)
    const gainLoss = performance > 0 ? performance * 0.8 : performance * 1.2;
    
    return {
      ...position,
      performance,
      weight,
      volatility,
      riskContribution,
      gainLoss,
      riskLevel: volatility > 25 ? 'Élevé' : volatility > 15 ? 'Modéré' : 'Faible'
    };
  });

  // Filtrage et tri
  const filteredPositions = enrichedPositions
    .filter(p => 
      p.instrument_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.isin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.asset?.sector?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'value':
          comparison = a.current_value - b.current_value;
          break;
        case 'performance':
          comparison = a.performance - b.performance;
          break;
        case 'name':
          comparison = a.instrument_name.localeCompare(b.instrument_name);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Statistiques
  const avgPerformance = enrichedPositions.reduce((sum, p) => sum + p.performance, 0) / enrichedPositions.length;
  const bestPerformer = enrichedPositions.reduce((best, p) => p.performance > best.performance ? p : best);
  const worstPerformer = enrichedPositions.reduce((worst, p) => p.performance < worst.performance ? p : worst);
  const highRiskCount = enrichedPositions.filter(p => p.volatility > 25).length;

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Performance Moyenne</p>
          <p className="text-2xl font-bold">
            <AnimatedPercentage value={avgPerformance} />
          </p>
        </Card>
        <Card variant="glass" className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Meilleur Actif</p>
          <p className="text-lg font-semibold truncate">{bestPerformer.instrument_name}</p>
          <p className="text-sm text-success-700 dark:text-success-500">
            +{bestPerformer.performance.toFixed(1)}%
          </p>
        </Card>
        <Card variant="glass" className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Pire Actif</p>
          <p className="text-lg font-semibold truncate">{worstPerformer.instrument_name}</p>
          <p className="text-sm text-danger-700 dark:text-danger-500">
            {worstPerformer.performance.toFixed(1)}%
          </p>
        </Card>
        <Card variant="glass" className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Positions à Risque</p>
          <p className="text-2xl font-bold">{highRiskCount}</p>
          <p className="text-sm text-warning-700 dark:text-warning-500">
            Volatilité &gt; 25%
          </p>
        </Card>
      </div>

      {/* Barre de recherche et tri */}
      <Card variant="premium">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par nom, ISIN ou secteur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('value')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortField === 'value'
                    ? 'bg-[color:var(--chart-2)] text-white'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Valeur <ArrowUpDown className="inline w-3 h-3 ml-1" />
              </button>
              <button
                onClick={() => handleSort('performance')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortField === 'performance'
                    ? 'bg-[color:var(--chart-2)] text-white'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Performance <ArrowUpDown className="inline w-3 h-3 ml-1" />
              </button>
              <button
                onClick={() => handleSort('name')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortField === 'name'
                    ? 'bg-[color:var(--chart-2)] text-white'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Nom <ArrowUpDown className="inline w-3 h-3 ml-1" />
              </button>
            </div>
          </div>

          {/* Table des holdings */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Actif
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Valeur
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Poids
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Performance
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Volatilité
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Risque
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredPositions.map((position) => (
                  <tr 
                    key={position.id} 
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="font-medium">{position.instrument_name}</p>
                        <div className="flex items-center gap-2">
                          {position.isin && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {position.isin}
                            </span>
                          )}
                          {position.asset?.sector && (
                            <Badge variant="outline" className="text-xs">
                              {position.asset.sector}
                            </Badge>
                          )}
                          {position.volatility > 25 && (
                            <AlertTriangle className="w-3 h-3 text-warning-500" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="font-semibold">
                        <AnimatedCurrency value={position.current_value} />
                      </p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="text-sm text-muted-foreground">
                        {position.weight.toFixed(2)}%
                      </p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {position.performance >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-success-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-danger-500" />
                        )}
                        <span className={position.performance >= 0 
                          ? 'text-success-700 dark:text-success-500 font-medium'
                          : 'text-danger-700 dark:text-danger-500 font-medium'
                        }>
                          {position.performance >= 0 ? '+' : ''}
                          {position.performance.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm text-muted-foreground">
                        {position.volatility.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Badge 
                        variant={
                          position.riskLevel === 'Élevé' ? 'danger' :
                          position.riskLevel === 'Modéré' ? 'warning' : 'success'
                        }
                      >
                        {position.riskLevel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPositions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Aucune position trouvée
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
