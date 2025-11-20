"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { apiClient, formatImportErrors } from '@/lib/api/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: () => void;
}

export function CreateClientModal({ isOpen, onClose, onClientCreated }: CreateClientModalProps) {
  const [clientName, setClientName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      toast.error('Erreur', { description: 'Nom du client requis' });
      return;
    }

    if (!csvFile) {
      toast.error('Erreur', { description: 'Veuillez sélectionner un fichier CSV' });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Get authenticated user and session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Utilisateur non connecté');

      const user = session.user;
      const accessToken = session.access_token;

      // 2. Create client in Supabase
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          first_name: clientName.trim(),
          last_name: '',
          email: null,
          investor_profile: 'equilibre',
        })
        .select()
        .single();

      if (clientError) throw clientError;
      if (!clientData) throw new Error('Aucune donnée client retournée');

      // 3. Create portfolio for the client
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          client_id: clientData.id,
          name: `Portefeuille ${clientName}`,
          description: 'Portfolio principal'
        })
        .select()
        .single();

      if (portfolioError) throw portfolioError;
      if (!portfolioData) throw new Error('Erreur lors de la création du portfolio');

      // 4. Call backend API to import CSV and enrich data
      toast.info('Import en cours...', {
        description: 'Le fichier CSV est en cours de traitement'
      });

      const importResult = await apiClient.importPortfolioCSV(
        portfolioData.id,
        csvFile,
        accessToken
      );

      // 5. Show result to user
      if (importResult.success) {
        let description = `${importResult.rows_imported} position${importResult.rows_imported > 1 ? 's' : ''} importée${importResult.rows_imported > 1 ? 's' : ''}`;
        
        if (importResult.enrichment) {
          description += `\n${importResult.enrichment.success} actif${importResult.enrichment.success > 1 ? 's' : ''} enrichi${importResult.enrichment.success > 1 ? 's' : ''}`;
        }

        if (importResult.rows_failed > 0) {
          description += `\n⚠️ ${importResult.rows_failed} ligne${importResult.rows_failed > 1 ? 's' : ''} en erreur`;
        }

        toast.success('Client créé avec succès !', {
          description: description
        });

        // Show errors if any (non-blocking)
        if (importResult.errors.length > 0) {
          console.warn('Import errors:', importResult.errors);
          toast.warning('Quelques erreurs détectées', {
            description: formatImportErrors(importResult.errors)
          });
        }
      } else {
        throw new Error('Import failed');
      }

      // 6. Reset form and refresh
      setClientName('');
      setCsvFile(null);
      onClientCreated();
      
    } catch (error: any) {
      console.error('Erreur création client:', error);
      
      let errorMessage = 'Impossible de créer le client';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error('Erreur', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau client</DialogTitle>
          <DialogDescription>
            Renseignez les informations du client et uploadez son portefeuille (CSV)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client *</Label>
              <Input
                id="clientName"
                placeholder="Jean Dupont"
                value={clientName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv">Portefeuille (CSV) *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  required
                />
                {csvFile && (
                  <div className="mt-2 flex items-center text-sm text-muted-foreground">
                    <Upload className="h-4 w-4 mr-2" />
                    {csvFile.name}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Format attendu : date,provider,asset_class,instrument_name,isin,region,currency,current_value
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
