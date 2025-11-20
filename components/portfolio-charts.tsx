"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-premium';
import { AnimatedCurrency } from '@/components/ui/animated-number';
import { Badge } from '@/components/ui/badge-premium';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Globe, BarChart3, Activity, Sparkles, Award } from 'lucide-react';
import type { PortfolioSummary } from '@/lib/types/portfolio';

interface PortfolioChartsProps {
  summary: PortfolioSummary;
}

// Palette de couleurs premium pour les graphiques
const COLORS = [
  '#3B82F6', // Royal Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#06B6D4', // Cyan
];

// Tooltip custom déplacé hors du composant principal pour éviter les re-renders
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect-strong rounded-xl p-4 shadow-premium border border-royal-500/20"
      >
        <p className="font-semibold text-white mb-2">{data.date}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-400">Valeur</span>
            <span className="text-sm font-bold text-royal-400">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.value)}
            </span>
          </div>
          {data.change !== undefined && Math.abs(data.change) > 0.01 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-400">Variation</span>
              <span className={`text-sm font-semibold ${data.change >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect-strong rounded-xl p-4 shadow-premium border border-royal-500/20"
      >
        <p className="font-semibold text-white mb-2">{data.name}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-400">Valeur</span>
            <span className="text-sm font-bold text-royal-400">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.value)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-400">Proportion</span>
            <span className="text-sm font-semibold text-white">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

export function PortfolioCharts({ summary }: PortfolioChartsProps) {
  // Calculs de performance
  const firstValue = summary.timeSeriesData[0]?.value || 0;
  const currentValue = summary.totalValue;
  const totalGain = currentValue - firstValue;
  const totalGainPercentage = firstValue > 0 ? ((totalGain / firstValue) * 100) : 0;
  const isPositiveGain = totalGain >= 0;

  // Formater les données pour le graphique temporel avec variation
  const timeSeriesData = summary.timeSeriesData.map((item, index, arr) => {
    const prevValue = index > 0 ? arr[index - 1].value : item.value;
    const change = item.value - prevValue;
    const changePercent = prevValue > 0 ? ((change / prevValue) * 100) : 0;
    
    return {
      date: new Date(item.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      }),
      value: item.value,
      change: changePercent
    };
  });

  // Formater les données pour le pie chart (classes d'actifs)
  const assetClassData = Object.entries(summary.byAssetClass)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / summary.totalValue) * 100)
    }))
    .sort((a, b) => b.value - a.value);

  // Formater les données pour le graphique régions
  const regionData = Object.entries(summary.byRegion)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / summary.totalValue) * 100)
    }))
    .sort((a, b) => b.value - a.value);

  // Identifier les top allocations
  const topAssetClass = assetClassData[0];
  const topRegion = regionData[0];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k €`;
    }
    return formatCurrency(value);
  };

  return (
    <div className="space-y-6">
      {/* Header avec insights premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Performance totale */}
        <Card variant="glass" glow className="p-6 group hover:scale-[1.02] transition-transform duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-royal-500/20 group-hover:bg-royal-500/30 transition-colors">
              {isPositiveGain ? (
                <TrendingUp className="w-6 h-6 text-royal-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-danger-400" />
              )}
            </div>
            <Badge variant={isPositiveGain ? "success" : "danger"} className="text-xs">
              {totalGainPercentage >= 0 ? '+' : ''}{totalGainPercentage.toFixed(2)}%
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Performance Totale</p>
            <div className="flex items-baseline gap-2">
              <AnimatedCurrency
                value={totalGain}
                className={`text-2xl font-bold ${isPositiveGain ? 'text-success-500' : 'text-danger-500'}`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Depuis {timeSeriesData[0]?.date || 'le début'}
            </p>
          </div>
        </Card>

        {/* Top allocation classe d'actif */}
        {topAssetClass && (
          <Card variant="glass" className="p-6 group hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <Badge variant="glass" className="text-xs">
                Top Actif
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Allocation Principale</p>
              <p className="text-xl font-bold text-white mb-1">{topAssetClass.name}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topAssetClass.percentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                  />
                </div>
                <span className="text-sm font-semibold text-purple-400">
                  {topAssetClass.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Top région */}
        {topRegion && (
          <Card variant="glass" className="p-6 group hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-teal-500/20 group-hover:bg-teal-500/30 transition-colors">
                <Globe className="w-6 h-6 text-teal-400" />
              </div>
              <Badge variant="glass" className="text-xs">
                Top Région
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Exposition Géographique</p>
              <p className="text-xl font-bold text-white mb-1">{topRegion.name}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topRegion.percentage}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-600"
                  />
                </div>
                <span className="text-sm font-semibold text-teal-400">
                  {topRegion.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Graphique d'évolution temporelle - Premium Area Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card variant="glass" className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Activity className="w-6 h-6 text-royal-500" />
                  Évolution du Portefeuille
                </CardTitle>
                <CardDescription className="mt-2">
                  Performance sur {timeSeriesData.length} mois • Valeur actuelle: {formatCompactCurrency(currentValue)}
                </CardDescription>
              </div>
              <Badge variant="glow" className="gap-1">
                <Sparkles className="w-3 h-3" />
                En temps réel
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickFormatter={(value) => formatCompactCurrency(value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#valueGradient)"
                    dot={{ fill: '#3B82F6', r: 4, strokeWidth: 2, stroke: '#1E293B' }}
                    activeDot={{ r: 7, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Grid avec répartitions - 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par classe d'actif */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Classes d'Actifs
              </CardTitle>
              <CardDescription>
                Répartition par type d'investissement • {assetClassData.length} classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetClassData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetClassData.map((entry, index) => (
                        <Cell
                          key={`asset-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Légende custom */}
              <div className="mt-4 space-y-2">
                {assetClassData.slice(0, 5).map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-300">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {formatCompactCurrency(item.value)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Répartition géographique */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-500" />
                Répartition Géographique
              </CardTitle>
              <CardDescription>
                Distribution par région • {regionData.length} zones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {regionData.map((entry, index) => (
                        <Cell
                          key={`region-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Légende custom */}
              <div className="mt-4 space-y-2">
                {regionData.slice(0, 5).map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-300">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {formatCompactCurrency(item.value)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Footer avec badge premium */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-4"
      >
        <Award className="w-4 h-4" />
        <span>Analyse premium • Données actualisées en temps réel</span>
      </motion.div>
    </div>
  );
}
