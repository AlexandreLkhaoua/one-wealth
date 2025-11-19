"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';

interface UploadPortfolioProps {
  onFileSelect: (file: File) => void;
}

export function UploadPortfolio({ onFileSelect }: UploadPortfolioProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Vérification de l'extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Format invalide', {
        description: 'Veuillez sélectionner un fichier CSV'
      });
      return;
    }

    // Vérification de la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux', {
        description: 'Le fichier ne doit pas dépasser 10MB'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error('Aucun fichier sélectionné');
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Importer votre portefeuille</CardTitle>
          <CardDescription>
            Téléchargez un fichier CSV contenant votre portefeuille d'investissements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Zone de drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
              ${selectedFile ? 'bg-secondary/30' : 'hover:border-primary/50'}
            `}
          >
            {selectedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-1">
                    Glissez-déposez votre fichier CSV ici
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou cliquez pour sélectionner un fichier
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Sélectionner un fichier</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Bouton d'import */}
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleImport}
                className="w-full"
                size="lg"
              >
                Importer mon portefeuille
              </Button>
            </motion.div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Format attendu : CSV avec colonnes :</p>
            <p className="font-mono">
              date, provider, asset_class, instrument_name, isin, region, currency, current_value
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
