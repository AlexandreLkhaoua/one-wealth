"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { PortfolioSummary } from '@/lib/types/portfolio';

interface PortfolioChartsProps {
  summary: PortfolioSummary;
}

// Palette de couleurs pour les graphiques
const COLORS = [
  'oklch(0.646 0.222 41.116)', // chart-1
  'oklch(0.6 0.118 184.704)',   // chart-2
  'oklch(0.398 0.07 227.392)',  // chart-3
  'oklch(0.828 0.189 84.429)',  // chart-4
  'oklch(0.769 0.188 70.08)',   // chart-5
  'oklch(0.488 0.243 264.376)', // Couleurs additionnelles
  'oklch(0.696 0.17 162.48)',
  'oklch(0.627 0.265 303.9)',
  'oklch(0.645 0.246 16.439)',
];

export function PortfolioCharts({ summary }: PortfolioChartsProps) {
  // Formater les données pour le graphique temporel
  const timeSeriesData = summary.timeSeriesData.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    value: item.value
  }));

  // Formater les données pour le pie chart (régions)
  const regionData = Object.entries(summary.byRegion).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / summary.totalValue) * 100).toFixed(1)
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].payload.date}</p>
          <p className="text-sm text-primary">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-primary">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Graphique d'évolution temporelle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Évolution de la valeur du portefeuille</CardTitle>
            <CardDescription>
              Valeur totale en EUR au fil du temps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-sm"
                    tick={{ fill: 'oklch(0.556 0 0)' }}
                  />
                  <YAxis
                    className="text-sm"
                    tick={{ fill: 'oklch(0.556 0 0)' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="oklch(0.646 0.222 41.116)"
                    strokeWidth={2}
                    dot={{ fill: 'oklch(0.646 0.222 41.116)', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Graphique par région */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Répartition géographique</CardTitle>
            <CardDescription>
              Distribution des actifs par région
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} (${entry.percentage}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {regionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-sm">
                        {value} ({entry.payload.percentage}%)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
