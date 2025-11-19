"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: () => void;
}

interface PortfolioRow {
  isin: string;
  nom: string;
  quantite: number;
  prixAchat: number;
  prixActuel: number;
  categorie: string;
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
      // 1. Créer le client
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      console.log('User ID:', user.id);

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

      console.log('Client result:', { clientData, clientError });

      if (clientError) throw clientError;
      if (!clientData) throw new Error('Aucune donnée client retournée');

      // 2. Parser le CSV
      const parsedData = await new Promise<PortfolioRow[]>((resolve, reject) => {
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data as any[];
            const portfolioRows: PortfolioRow[] = rows.map(row => ({
              isin: row.isin || row.ISIN || '',
              nom: row.nom || row.Nom || row.name || row.Name || '',
              quantite: parseFloat(row.quantite || row.Quantite || row.quantity || row.Quantity || '0'),
              prixAchat: parseFloat(row.prixAchat || row['Prix Achat'] || row.purchasePrice || '0'),
              prixActuel: parseFloat(row.prixActuel || row['Prix Actuel'] || row.currentPrice || '0'),
              categorie: row.categorie || row.Categorie || row.category || row.Category || 'Non classé',
            }));
            resolve(portfolioRows);
          },
          error: (error) => reject(error),
        });
      });

      if (parsedData.length === 0) {
        throw new Error('Le fichier CSV est vide');
      }

      // 3. Créer le portefeuille
      const totalValue = parsedData.reduce((sum, row) => 
        sum + (row.quantite * row.prixActuel), 0
      );

      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          client_id: clientData.id,
          name: `Portefeuille ${clientName}`,
          total_value: totalValue,
        })
        .select()
        .single();

      if (portfolioError) throw portfolioError;

      // 4. Insérer les positions
      const positions = parsedData.map(row => ({
        portfolio_id: portfolioData.id,
        isin: row.isin,
        security_name: row.nom,
        quantity: row.quantite,
        purchase_price: row.prixAchat,
        current_price: row.prixActuel,
        current_value: row.quantite * row.prixActuel,
        category: row.categorie,
      }));

      const { error: positionsError } = await supabase
        .from('positions')
        .insert(positions);

      if (positionsError) throw positionsError;

      // 5. Enregistrer l'import CSV
      const { error: csvImportError } = await supabase
        .from('csv_imports')
        .insert({
          portfolio_id: portfolioData.id,
          file_name: csvFile.name,
          row_count: parsedData.length,
          status: 'success',
        });

      if (csvImportError) console.error('Erreur CSV import log:', csvImportError);

      toast.success('Client créé !', {
        description: `${clientName} a été ajouté avec ${parsedData.length} position${parsedData.length > 1 ? 's' : ''}`
      });

      // Réinitialiser le formulaire
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
                Colonnes attendues : isin, nom, quantite, prixAchat, prixActuel, categorie
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
