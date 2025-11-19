"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PortfolioSummaryCards } from '@/components/portfolio-summary-cards';
import { PortfolioCharts } from '@/components/portfolio-charts';
import { PortfolioTable } from '@/components/portfolio-table';
import type { PortfolioPosition, PortfolioSummary } from '@/lib/types/portfolio';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  investor_profile: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

      // Charger les positions
      if (portfolioData) {
        const { data: positionsData, error: positionsError } = await supabase
          .from('positions')
          .select('*')
          .eq('portfolio_id', portfolioData.id)
          .order('current_value', { ascending: false });

        if (positionsError) throw positionsError;

        // Convertir en format PortfolioPosition
        const portfolioPositions: PortfolioPosition[] = (positionsData || []).map(p => ({
          date: new Date().toISOString().split('T')[0],
          provider: 'Portfolio',
          asset_class: p.category,
          instrument_name: p.security_name,
          isin: p.isin,
          region: p.isin?.startsWith('FR') ? 'France' : 
                  p.isin?.startsWith('LU') ? 'Luxembourg' :
                  p.isin?.startsWith('US') ? 'USA' : 'Autre',
          currency: 'EUR',
          current_value: p.current_value,
        }));

        setPositions(portfolioPositions);

        // Calculer le summary
        const totalValue = portfolioPositions.reduce((sum, p) => sum + p.current_value, 0);

        // Répartition par catégorie (asset_class)
        const byAssetClass = portfolioPositions.reduce((acc: Record<string, number>, p) => {
          acc[p.asset_class] = (acc[p.asset_class] || 0) + p.current_value;
          return acc;
        }, {});

        // Répartition par région
        const byRegion = portfolioPositions.reduce((acc: Record<string, number>, p) => {
          acc[p.region] = (acc[p.region] || 0) + p.current_value;
          return acc;
        }, {});

        // Répartition par provider (fixe pour l'instant)
        const byProvider = { 'Portfolio': totalValue };

        // Données temporelles simulées (on prendra les snapshots plus tard)
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {client.first_name}
          </h1>
          <p className="text-muted-foreground text-lg">
            {client.email || 'Pas d\'email'} • Profil {client.investor_profile}
          </p>
        </div>
      </motion.div>

      {/* Dashboard content - only show if data is loaded */}
      {summary && positions.length > 0 ? (
        <div className="space-y-8">
          {/* Summary cards */}
          <PortfolioSummaryCards summary={summary} />

          {/* Charts */}
          <PortfolioCharts summary={summary} />

          {/* Table */}
          <PortfolioTable positions={positions} />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-20"
        >
          <h3 className="text-xl font-semibold mb-2">Aucun portefeuille</h3>
          <p className="text-muted-foreground">
            Ce client n'a pas encore de portefeuille
          </p>
        </motion.div>
      )}
    </div>
  );
}
