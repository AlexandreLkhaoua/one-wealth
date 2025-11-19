"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Users, TrendingUp, Loader2 } from 'lucide-react';
import { CreateClientModal } from '@/components/create-client-modal';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  investor_profile: string;
  created_at: string;
  portfolios?: { id: string; name: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          email,
          investor_profile,
          created_at,
          portfolios (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients(clientsData || []);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger les clients'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientCreated = () => {
    setIsModalOpen(false);
    loadClients();
  };

  const handleClientClick = (clientId: string) => {
    router.push(`/dashboard/client/${clientId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mes Clients</h1>
            <p className="text-muted-foreground text-lg">
              Gérez vos clients et leurs portefeuilles
            </p>
          </div>
          <Button size="lg" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-5 w-5" />
            Créer un nouveau client
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Pas de client</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Commencez par créer votre premier client pour gérer ses investissements
          </p>
          <Button size="lg" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-5 w-5" />
            Créer un nouveau client
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card
                className="border-2 hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg"
                onClick={() => handleClientClick(client.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs px-2 py-1 bg-secondary rounded-full">
                      {client.investor_profile}
                    </span>
                  </div>
                  <CardTitle className="text-xl">
                    {client.first_name} {client.last_name}
                  </CardTitle>
                  <CardDescription>
                    {client.email || 'Pas d\'email renseigné'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {client.portfolios?.length || 0} portefeuille{(client.portfolios?.length || 0) > 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <CreateClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}
