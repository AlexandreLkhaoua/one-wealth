"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UploadPortfolio } from '@/components/upload-portfolio';
import { PortfolioSummaryCards } from '@/components/portfolio-summary-cards';
import { PortfolioCharts } from '@/components/portfolio-charts';
import { PortfolioTable } from '@/components/portfolio-table';
import { parsePortfolioCSV } from '@/lib/csv/parsePortfolio';
import type { PortfolioPosition, PortfolioSummary } from '@/lib/types/portfolio';

export default function DashboardPage() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    
    try {
      const result = await parsePortfolioCSV(file);

      if (!result.success) {
        // Afficher les erreurs
        result.errors.forEach(error => {
          toast.error(`Ligne ${error.row}: ${error.message}`, {
            description: error.field
          });
        });
        return;
      }

      if (result.data && result.summary) {
        setPositions(result.data);
        setSummary(result.summary);
        
        toast.success('Portfolio importé avec succès', {
          description: `${result.data.length} position${result.data.length > 1 ? 's' : ''} chargée${result.data.length > 1 ? 's' : ''}`
        });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'importation', {
        description: error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Visualisez et analysez votre portefeuille d'investissements
        </p>
      </motion.div>

      <div className="space-y-8">
        {/* Upload section */}
        <UploadPortfolio onFileSelect={handleFileSelect} />

        {/* Loading state */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Analyse en cours...</p>
          </motion.div>
        )}

        {/* Dashboard content - only show if data is loaded */}
        {!isLoading && summary && positions.length > 0 && (
          <>
            {/* Summary cards */}
            <PortfolioSummaryCards summary={summary} />

            {/* Charts */}
            <PortfolioCharts summary={summary} />

            {/* Table */}
            <PortfolioTable positions={positions} />
          </>
        )}

        {/* Empty state */}
        {!isLoading && !summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucun portefeuille chargé</h3>
            <p className="text-muted-foreground">
              Importez un fichier CSV pour commencer l'analyse
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
