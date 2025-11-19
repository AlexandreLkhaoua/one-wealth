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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Classe d'actif</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead className="text-right">Valeur (EUR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Aucune position à afficher
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((position, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {formatDate(position.date)}
                      </TableCell>
                      <TableCell>{position.provider}</TableCell>
                      <TableCell className="max-w-[250px] truncate" title={position.instrument_name}>
                        {position.instrument_name}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                          {position.asset_class}
                        </span>
                      </TableCell>
                      <TableCell>{position.region}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {position.isin || '—'}
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
