"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Building2, Globe } from 'lucide-react';
import type { PortfolioSummary } from '@/lib/types/portfolio';

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
}

export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  // Calculer les données pour les cartes
  const topProviders = Object.entries(summary.byProvider)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / summary.totalValue) * 100
    }));

  const topRegions = Object.entries(summary.byRegion)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / summary.totalValue) * 100
    }));

  const topAssetClasses = Object.entries(summary.byAssetClass)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / summary.totalValue) * 100
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-6 md:grid-cols-3"
    >
      {/* Valeur totale */}
      <motion.div variants={itemVariants}>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valeur totale
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(summary.totalValue)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Par établissement */}
      <motion.div variants={itemVariants}>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par établissement
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {topProviders.map((provider, index) => (
              <div key={provider.name} className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {index + 1}. {provider.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {provider.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Par région */}
      <motion.div variants={itemVariants}>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par région géographique
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {topRegions.map((region, index) => (
              <div key={region.name} className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {index + 1}. {region.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {region.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
