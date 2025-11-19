"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, TrendingUp, Shield, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-7xl">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6 py-20"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          OneWealth
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
          Le copilote qui vous guide dans la gestion de votre patrimoine.
        </p>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Un tableau de bord clair pour vos investissements, et des ajustements adaptés à votre profil et au marché.
        </p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="pt-8"
        >
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">
              Accéder au dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="py-20"
      >
        <h2 className="text-3xl font-bold text-center mb-12">Pour qui ?</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Conseillers en Investissement Financier</CardTitle>
              <CardDescription>
                Offrez à vos clients une vision claire et consolidée de leurs investissements
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Conseillers en Gestion de Patrimoine</CardTitle>
              <CardDescription>
                Pilotez le patrimoine de vos clients avec des outils d'analyse performants
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Banquiers Privés</CardTitle>
              <CardDescription>
                Accompagnez vos clients fortunés avec une vision globale de leurs actifs
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="py-20 text-center"
      >
        <Card className="border-2 bg-secondary/30">
          <CardContent className="py-12">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à commencer ?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Importez votre portefeuille et découvrez une nouvelle façon de gérer vos investissements
            </p>
            <Link href="/dashboard">
              <Button size="lg" variant="default" className="text-lg px-8 py-6">
                Accéder au dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
