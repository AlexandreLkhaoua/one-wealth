#!/bin/bash

# =====================================================
# Script de démarrage OneWealth
# Lance le backend FastAPI et le frontend Next.js
# =====================================================

echo "🚀 Démarrage de OneWealth..."
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour arrêter les processus à la sortie
cleanup() {
    echo ""
    echo -e "${RED}🛑 Arrêt des serveurs...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être lancé depuis la racine du projet onewealth${NC}"
    exit 1
fi

# Démarrer le backend
echo -e "${BLUE}📡 Démarrage du backend FastAPI...${NC}"
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/onewealth-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
echo "⏳ Attente du backend..."
sleep 3

# Vérifier que le backend est en ligne
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend démarré : http://127.0.0.1:8000${NC}"
else
    echo -e "${RED}❌ Le backend n'a pas démarré correctement${NC}"
    echo "Consultez les logs : tail -f /tmp/onewealth-backend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Démarrer le frontend
echo -e "${BLUE}🌐 Démarrage du frontend Next.js...${NC}"
npm run dev > /tmp/onewealth-frontend.log 2>&1 &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
echo "⏳ Attente du frontend..."
sleep 5

echo ""
echo -e "${GREEN}✅ OneWealth est prêt !${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  📡 Backend API  : ${BLUE}http://127.0.0.1:8000${NC}"
echo -e "  📚 API Docs     : ${BLUE}http://127.0.0.1:8000/docs${NC}"
echo -e "  🌐 Frontend     : ${BLUE}http://localhost:3000${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}💡 Logs :${NC}"
echo "  Backend  : tail -f /tmp/onewealth-backend.log"
echo "  Frontend : tail -f /tmp/onewealth-frontend.log"
echo ""
echo -e "${RED}Appuyez sur Ctrl+C pour arrêter les serveurs${NC}"
echo ""

# Garder le script actif
wait
