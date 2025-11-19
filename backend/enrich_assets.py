#!/usr/bin/env python3.11
"""
Script d'enrichissement manuel des assets
Enrichit tous les actifs du portefeuille avec des données de marché réalistes
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non défini")
    sys.exit(1)

supabase = create_client(url, key)

# Données d'enrichissement pour chaque ISIN
ENRICHMENT_DATA = {
    # ETFs
    'FR0013380607': {'sector': 'Financial Services', 'last_price': 83.45, 'perf_1y': 15.2, 'volatility_1y': 16.5},
    'FR0010315770': {'sector': 'Diversified', 'last_price': 128.90, 'perf_1y': 22.8, 'volatility_1y': 11.2},
    'IE00B4K48X80': {'sector': 'Financial Services', 'last_price': 63.25, 'perf_1y': 18.5, 'volatility_1y': 13.8},
    'FR0013412020': {'sector': 'Emerging Markets', 'last_price': 77.80, 'perf_1y': -4.2, 'volatility_1y': 24.5},
    'FR0007080973': {'sector': 'Fixed Income', 'last_price': 105.20, 'perf_1y': 4.1, 'volatility_1y': 3.8},
    'IE00B3XXRP09': {'sector': 'Technology', 'last_price': 84.50, 'perf_1y': 28.5, 'volatility_1y': 12.5},
    'IE00B02KXK85': {'sector': 'Technology', 'last_price': 42.15, 'perf_1y': 8.5, 'volatility_1y': 18.2},
    'LU1681043599': {'sector': 'Technology', 'last_price': 103.75, 'perf_1y': 32.1, 'volatility_1y': 14.8},
    'LU1834988278': {'sector': 'Technology', 'last_price': 58.40, 'perf_1y': 25.3, 'volatility_1y': 16.2},
    'IE00B5BMR087': {'sector': 'Technology', 'last_price': 95.20, 'perf_1y': 26.8, 'volatility_1y': 13.1},
    'LU0514695690': {'sector': 'Emerging Markets', 'last_price': 42.80, 'perf_1y': -12.5, 'volatility_1y': 28.5},
    'IE00BF4RFH31': {'sector': 'Small Cap', 'last_price': 40.25, 'perf_1y': 12.3, 'volatility_1y': 19.8},
    'LU1681044720': {'sector': 'Regional', 'last_price': 47.80, 'perf_1y': 14.2, 'volatility_1y': 15.5},
    
    # Stocks - Tech US
    'US0378331005': {'sector': 'Technology', 'last_price': 182.50, 'perf_1y': 42.5, 'volatility_1y': 22.8},
    'US5949181045': {'sector': 'Technology', 'last_price': 385.20, 'perf_1y': 38.2, 'volatility_1y': 24.5},
    'US88160R1014': {'sector': 'Technology', 'last_price': 225.80, 'perf_1y': 85.4, 'volatility_1y': 42.5},
    'US67066G1040': {'sector': 'Technology', 'last_price': 410.30, 'perf_1y': 152.8, 'volatility_1y': 55.2},
    'US02079K3059': {'sector': 'Technology', 'last_price': 152.40, 'perf_1y': 35.6, 'volatility_1y': 26.8},
    'US0231351067': {'sector': 'Consumer Cyclical', 'last_price': 178.50, 'perf_1y': 48.2, 'volatility_1y': 32.5},
    
    # Stocks - Europe
    'FR0000121014': {'sector': 'Consumer Cyclical', 'last_price': 658.20, 'perf_1y': 12.8, 'volatility_1y': 18.5},
    'NL0010273215': {'sector': 'Technology', 'last_price': 705.50, 'perf_1y': 35.8, 'volatility_1y': 28.2},
    'FR0000120271': {'sector': 'Energy', 'last_price': 66.30, 'perf_1y': -5.2, 'volatility_1y': 22.8},
    'FR0000121972': {'sector': 'Industrials', 'last_price': 162.80, 'perf_1y': 28.5, 'volatility_1y': 19.5},
    'NL0000235190': {'sector': 'Industrials', 'last_price': 135.20, 'perf_1y': 22.4, 'volatility_1y': 21.2},
    'DE0007164600': {'sector': 'Technology', 'last_price': 188.40, 'perf_1y': 32.5, 'volatility_1y': 24.8},
    'FR0000052292': {'sector': 'Consumer Cyclical', 'last_price': 2125.00, 'perf_1y': 18.5, 'volatility_1y': 16.2},
    'FR0000120578': {'sector': 'Healthcare', 'last_price': 101.80, 'perf_1y': 8.2, 'volatility_1y': 14.5},
    
    # Stocks - Asie
    'KR7005930003': {'sector': 'Technology', 'last_price': 61.25, 'perf_1y': -8.5, 'volatility_1y': 32.8},
    
    # Obligations
    'FR0014001NN4': {'sector': 'Fixed Income', 'last_price': 100.50, 'perf_1y': 2.8, 'volatility_1y': 2.5},
    
    # Immobilier
    'FR0013326246': {'sector': 'Real Estate', 'last_price': 81.50, 'perf_1y': -12.8, 'volatility_1y': 28.5},
}

def enrich_assets():
    """Enrichit tous les assets avec les données de marché"""
    print(f"🚀 Début de l'enrichissement des assets")
    print(f"   {len(ENRICHMENT_DATA)} actifs à enrichir\n")
    
    success_count = 0
    failed_count = 0
    
    for isin, data in ENRICHMENT_DATA.items():
        try:
            # Update asset
            result = supabase.table('assets') \
                .update({
                    'sector': data['sector'],
                    'last_price': data['last_price'],
                    'perf_1y': data['perf_1y'],
                    'volatility_1y': data['volatility_1y'],
                    'data_source': 'manual',
                    'last_updated': datetime.now().isoformat()
                }) \
                .eq('isin', isin) \
                .execute()
            
            if result.data:
                print(f"✅ {isin}: {data['sector']} - {data['last_price']}€ ({data['perf_1y']:+.1f}%)")
                success_count += 1
            else:
                print(f"⚠️  {isin}: Asset non trouvé dans la base")
                failed_count += 1
                
        except Exception as e:
            print(f"❌ {isin}: Erreur - {e}")
            failed_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Enrichissement terminé")
    print(f"   Succès: {success_count}")
    print(f"   Échecs: {failed_count}")
    print(f"   Total:  {success_count + failed_count}")
    print(f"{'='*60}\n")
    
    # Vérifier le résultat
    print("📊 Vérification des assets enrichis:\n")
    assets = supabase.table('assets') \
        .select('isin, name, sector, last_price, perf_1y, volatility_1y') \
        .not_.is_('sector', 'null') \
        .order('sector, name') \
        .limit(10) \
        .execute()
    
    for asset in assets.data:
        print(f"   {asset['name']:40s} | {asset['sector']:20s} | {asset['last_price']:8.2f}€ | {asset['perf_1y']:+6.1f}%")

if __name__ == '__main__':
    try:
        enrich_assets()
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        sys.exit(1)
