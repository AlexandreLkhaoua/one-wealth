"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PortfolioPosition } from '@/lib/types/portfolio';

interface PortfolioTableProps {
  positions: PortfolioPosition[];
}

export function PortfolioTable({ positions }: PortfolioTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value?: number) => {
    if (value === undefined || value === null) return 'text-muted-foreground';
    return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Détail des positions</CardTitle>
          <CardDescription>
            Liste complète de vos {positions.length} position{positions.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Classe d'actif</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right">Perf 1 an</TableHead>
                  <TableHead className="text-right">Volatilité</TableHead>
                  <TableHead className="text-right">Valeur (EUR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      Aucune position à afficher
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((position, index) => (
                    <TableRow key={position.id || index}>
                      <TableCell className="font-medium">
                        {formatDate(position.date)}
                      </TableCell>
                      <TableCell>{position.provider}</TableCell>
                      <TableCell className="max-w-[250px] truncate" title={position.instrument_name}>
                        {position.instrument_name}
                      </TableCell>
                      <TableCell>
                        {position.asset?.sector ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {position.asset.sector}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                          {position.asset_class}
                        </span>
                      </TableCell>
                      <TableCell>{position.asset?.region || position.region}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {position.isin || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {position.asset?.last_price ? 
                          formatCurrency(position.asset.last_price) : 
                          <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getPerformanceColor(position.asset?.perf_1y)}`}>
                        {formatPercentage(position.asset?.perf_1y)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPercentage(position.asset?.volatility_1y)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(position.current_value)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
