# 🤖 AI-Assistant - Plateforme d'Assistant IA pour l'Analyse de Données

Une plateforme ultra-rapide d'analyse de données alimentée par l'IA, capable de traiter et d'analyser vos fichiers en moins de 3 secondes.

## ✨ Fonctionnalités Principales

- **📁 Upload Intelligent** : Support CSV, PDF, DOCX, TXT avec analyse automatique
- **⚡ Réponses Ultra-Rapides** : < 3 secondes grâce aux agrégations pré-calculées
- **🔍 Recherche Hybride** : Combine recherche sémantique et requêtes numériques
- **💾 Stockage Optimisé** : Embeddings et agrégations dans MongoDB
- **🎯 Questions Naturelles** : Posez vos questions en français, obtenez des insights précis

## 🏗️ Architecture

### Stack Technique

- **Frontend** : Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **Backend** : API Routes Next.js
- **Base de Données** : MongoDB Atlas (Vector Search)
- **IA** : OpenAI (embeddings + GPT-4)

### Flux de Données

1. **Ingestion** : Parse → Chunk → Embeddings → Agrégations → Stockage
2. **Requête** : Question → Détection type → Recherche/Agrégation → Réponse LLM

## 🚀 Installation

### Prérequis

- Node.js 18+
- MongoDB Atlas (compte gratuit)
- Clé API OpenAI

### Configuration

```bash
# Cloner le repo
git clone https://github.com/votre-username/ai-assistant.git
cd ai-assistant

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
```

### Variables d'environnement

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-assistant

# OpenAI
OPENAI_API_KEY=sk-...

# Next.js
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Lancement

```bash
# Développement
npm run dev

# Production
npm run build
npm start
```

## 📖 Utilisation

### 1. Upload de Fichiers

- Rendez-vous sur `/upload`
- Glissez-déposez vos fichiers (CSV, PDF, DOCX, TXT)
- L'analyse se lance automatiquement

### 2. Consultation

- Vérifiez vos documents sur `/documents`
- Statut d'analyse et métadonnées disponibles

### 3. Questions

- Allez sur `/chat`
- Posez vos questions en langage naturel

### Exemples de Questions

**Questions Numériques :**

- "Quel est le chiffre d'affaires total de Sean Boucart ?"
- "Moyenne des IRPD par mois en 2025 ?"
- "Top 5 des agents par revenus ?"

**Questions Textuelles :**

- "Analyse les performances des agents Exit Employee"
- "Tendances des sous-performants"
- "Résumé du document sur les ventes Q3"

## 🗄️ Structure des Données

### Schema MongoDB

```javascript
// Collection: documents
{
  _id: ObjectId,
  filename: "data.csv",
  type: "csv",
  uploadedAt: Date,

  // Métadonnées
  summary: "Données de performance agents 2025",
  keyFacts: ["255 lignes", "42 agents", "Revenue total: 3.07M€"],

  // Contenu analysé
  chunks: [{
    text: "Agent Sean Boucart - Juin 2025...",
    embedding: [0.123, -0.456, ...], // 1536 dimensions
    chunkIndex: 0
  }],

  // Agrégations pré-calculées (CSV uniquement)
  aggregations: {
    totalRows: 255,
    columns: ["Agent", "Calendar Month", "# Rentals", ...],
    byAgent: {
      "Sean Boucart": { totalRevenue: 545234, avgIRPD: 28.5 }
    },
    byMonth: {
      "2025-06": { totalRentals: 1234, avgRevenue: 25300 }
    },
    global: {
      totalRevenue: 3073185.05,
      totalRentals: 142641
    }
  }
}
```

## 🔧 Configuration Avancée

### Paramètres de Chunking

```typescript
// lib/config.ts
export const CHUNK_CONFIG = {
  maxTokens: 1000,
  overlap: 100,
  preserveStructure: true, // Garde les lignes CSV ensemble
};
```

### Types de Recherche

```typescript
// Détection automatique du type de question
function detectQueryType(question: string): "numeric" | "semantic" | "hybrid" {
  const numericPatterns = [
    /total|somme|moyenne|maximum|minimum|top \d+/i,
    /combien|évolution|tendance/i,
    /\d{4}-\d{2}/i, // dates
  ];

  return numericPatterns.some((p) => p.test(question)) ? "numeric" : "semantic";
}
```

## 📊 Performance

### Benchmarks Typiques

- **Upload + Analyse** : 5-15s (selon taille fichier)
- **Questions Numériques** : < 1s
- **Questions Sémantiques** : 1-2s
- **Questions Complexes** : 2-3s

### Limites

- Fichiers : 50MB max
- Chunks : 10,000 max par document
- Questions : 20/minute par utilisateur

## 🛠️ Développement

### Structure du Projet

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # Ingestion fichiers
│   │   ├── chat/route.ts        # Questions/réponses
│   │   └── documents/route.ts   # Liste documents
│   ├── upload/page.tsx
│   ├── chat/page.tsx
│   └── documents/page.tsx
├── lib/
│   ├── mongodb.ts              # Connexion + schemas
│   ├── openai.ts              # Client OpenAI
│   ├── parsers/               # Parseurs par type
│   ├── embeddings.ts          # Chunking + vectorisation
│   ├── aggregations.ts        # Calculs pré-agrégés
│   └── query-engine.ts        # Moteur de recherche
└── components/
    ├── ui/                    # shadcn/ui
    ├── upload-zone.tsx
    ├── chat-interface.tsx
    └── document-list.tsx
```

### Scripts Utiles

```bash
# Tests
npm test

# Linting
npm run lint

# Base de données
npm run db:seed    # Données de test
npm run db:reset   # Reset complet

# Monitoring
npm run logs       # Logs en temps réel
```

## 🔒 Sécurité

- **Validation stricte** des types de fichiers
- **Sanitisation** du contenu avant stockage
- **Rate limiting** sur les API
- **Chiffrement** des embeddings sensibles

## 🤝 Contribution

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commitez vos changements (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📝 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/votre-username/ai-assistant/issues)
- **Documentation** : [Wiki](https://github.com/votre-username/ai-assistant/wiki)
- **Email** : contact@votre-domain.fr

---

**Fait avec ❤️ pour optimiser l'analyse de données métier**
