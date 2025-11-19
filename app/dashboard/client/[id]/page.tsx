"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, TrendingUp, PieChart, List, BarChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs-premium';
import { MetricCard, MetricGrid } from '@/components/ui/metric-card';
import { PerformanceAnalysis } from '@/components/analysis/performance-analysis';
import { AllocationAnalysis } from '@/components/analysis/allocation-analysis';
import { HoldingsAnalysis } from '@/components/analysis/holdings-analysis';
import { PortfolioCharts } from '@/components/portfolio-charts';
import PortfolioInvestorProfile from '@/components/portfolio-investor-profile';
import PortfolioScore from '@/components/portfolio-score';
import PortfolioAlerts from '@/components/portfolio-alerts';
import type { PortfolioPosition, PortfolioSummary, ScoreAlert } from '@/lib/types/portfolio';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  investor_profile: string;
}

export default function ClientDetailPremiumPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [scoreAlerts, setScoreAlerts] = useState<ScoreAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vue-ensemble');
  const supabase = createClient();

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    setIsLoading(true);
    try {
      // Charger le client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Charger le portefeuille
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (portfolioError && portfolioError.code !== 'PGRST116') throw portfolioError;

      // Charger les positions enrichies depuis l'API backend
      if (portfolioData) {
        setPortfolioId(portfolioData.id);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Session expirée');
        }

        const portfolioPositions = await apiClient.getPortfolioPositions(
          portfolioData.id,
          session.access_token
        );

        setPositions(portfolioPositions);

        // Calculer le summary
        const totalValue = portfolioPositions.reduce((sum, p) => sum + p.current_value, 0);

        const byAssetClass = portfolioPositions.reduce((acc: Record<string, number>, p) => {
          acc[p.asset_class] = (acc[p.asset_class] || 0) + p.current_value;
          return acc;
        }, {});

        const byRegion = portfolioPositions.reduce((acc: Record<string, number>, p) => {
          acc[p.region] = (acc[p.region] || 0) + p.current_value;
          return acc;
        }, {});

        const byProvider = { 'Portfolio': totalValue };

        const timeSeriesData = [
          { date: new Date(Date.now() - 5 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: totalValue * 0.92 },
          { date: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: totalValue * 0.95 },
          { date: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: totalValue * 0.97 },
          { date: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: totalValue * 0.98 },
          { date: new Date(Date.now() - 1 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: totalValue * 0.99 },
          { date: new Date().toISOString().split('T')[0], value: totalValue },
        ];

        setSummary({
          totalValue,
          byProvider,
          byAssetClass,
          byRegion,
          timeSeriesData
        });
      }
    } catch (error) {
      console.error('Erreur chargement client:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger les données du client'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-royal-500 mx-auto" />
          <p className="text-muted-foreground">Chargement du portefeuille...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Client introuvable</p>
      </div>
    );
  }

  const totalValue = summary?.totalValue || 0;
  const avgPerformance = positions.length > 0 
    ? positions.reduce((sum, p) => {
        const weight = p.current_value / totalValue;
        return sum + (p.asset?.perf_1y || 0) * weight;
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-6 hover:bg-white/5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au dashboard
          </Button>

          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{client.email || 'Pas d\'email'}</span>
                <span>•</span>
                <span className="px-3 py-1 rounded-full bg-royal-500/10 text-royal-400 text-sm font-medium">
                  Profil {client.investor_profile}
                </span>
              </div>
            </div>
          </div>

          {/* Profile / Score / Alerts */}
          {portfolioId && (
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <PortfolioInvestorProfile portfolioId={portfolioId} onUpdated={loadClientData} />
              <PortfolioScore portfolioId={portfolioId} onAlerts={(alerts) => setScoreAlerts(alerts)} />
              <PortfolioAlerts alerts={scoreAlerts} portfolioId={portfolioId} />
            </div>
          )}

          {/* Summary KPIs */}
          {summary && positions.length > 0 && (
            <MetricGrid cols={4}>
              <MetricCard
                title="Valeur Totale"
                value={totalValue}
                type="currency"
                trend={avgPerformance}
                icon={<TrendingUp className="w-5 h-5" />}
                variant="premium"
              />
              <MetricCard
                title="Performance Moyenne"
                value={avgPerformance}
                type="percentage"
                trend={avgPerformance}
                icon={<BarChart className="w-5 h-5" />}
                variant="premium"
              />
              <MetricCard
                title="Nombre d'Actifs"
                value={positions.length}
                type="number"
                icon={<List className="w-5 h-5" />}
                subtitle={`${Object.keys(summary.byAssetClass).length} classes`}
                variant="premium"
              />
              <MetricCard
                title="Diversification"
                value={Object.keys(summary.byRegion).length}
                type="number"
                icon={<PieChart className="w-5 h-5" />}
                subtitle="régions"
                variant="premium"
              />
            </MetricGrid>
          )}
        </motion.div>

        {/* Dashboard Content with Tabs */}
        {summary && positions.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="vue-ensemble" className="gap-2">
                  <BarChart className="w-4 h-4" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="performance" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="allocation" className="gap-2">
                  <PieChart className="w-4 h-4" />
                  Allocation
                </TabsTrigger>
                <TabsTrigger value="holdings" className="gap-2">
                  <List className="w-4 h-4" />
                  Positions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vue-ensemble" className="space-y-6">
                <PortfolioCharts summary={summary} />
              </TabsContent>

              <TabsContent value="performance">
                <PerformanceAnalysis 
                  positions={positions} 
                  totalValue={totalValue} 
                />
              </TabsContent>

              <TabsContent value="allocation">
                <AllocationAnalysis 
                  positions={positions}
                  totalValue={totalValue}
                  byAssetClass={summary.byAssetClass}
                  byRegion={summary.byRegion}
                />
              </TabsContent>

              <TabsContent value="holdings">
                <HoldingsAnalysis 
                  positions={positions}
                  totalValue={totalValue}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <div className="glass-effect p-12 rounded-2xl inline-block">
              <h3 className="text-2xl font-semibold mb-2">Aucun portefeuille</h3>
              <p className="text-muted-foreground">
                Ce client n'a pas encore de portefeuille
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
