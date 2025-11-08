/**
 * Test simple de l'API upload sans frontend
 * Usage: node test-api-simple.js
 */

const { readFileSync } = require('fs');
const { join } = require('path');

// Simuler une requête multipart/form-data
function simulateUploadRequest() {
  console.log('🧪 TEST API UPLOAD (SIMULATION)');
  console.log('===============================\n');

  try {
    // 1. Lire le fichier comme le ferait un navigateur
    const csvPath = join(process.cwd(), 'test-data', 'IRPD.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const fileSize = Buffer.byteLength(csvContent, 'utf-8');

    console.log('📤 SIMULATION UPLOAD REQUEST:');
    console.log(`   - Fichier: IRPD.csv`);
    console.log(`   - Taille: ${fileSize} bytes`);
    console.log(`   - Type MIME: text/csv`);
    console.log(`   - Endpoint: POST /api/upload`);

    // 2. Simuler la validation côté serveur
    console.log('\n🔍 VALIDATION CÔTÉ SERVEUR:');
    
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileSize > MAX_SIZE) {
      console.log(`   ❌ Fichier trop volumineux`);
      return;
    }
    console.log(`   ✅ Taille OK (${(fileSize/1024).toFixed(1)} KB < ${MAX_SIZE/(1024*1024)} MB)`);

    const SUPPORTED_TYPES = ['text/csv'];
    const mimeType = 'text/csv';
    if (!SUPPORTED_TYPES.includes(mimeType)) {
      console.log(`   ❌ Type non supporté`);
      return;
    }
    console.log(`   ✅ Type supporté (${mimeType})`);

    // 3. Simuler le traitement
    console.log('\n⚙️ TRAITEMENT SIMULÉ:');
    console.log(`   🔄 Génération nom unique...`);
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_IRPD.csv`;
    console.log(`   ✅ Nom généré: ${uniqueName}`);

    console.log(`   🔄 Parsing CSV...`);
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').length;
    const rows = lines.length - 1;
    console.log(`   ✅ Parsing réussi: ${rows} lignes, ${headers} colonnes`);

    console.log(`   🔄 Création document MongoDB...`);
    const documentId = `doc_${timestamp}_abc123`;
    console.log(`   ✅ Document créé: ${documentId}`);

    console.log(`   🔄 Calcul agrégations...`);
    console.log(`   ✅ Agrégations calculées: 7 colonnes numériques`);

    console.log(`   🔄 Génération chunks...`);
    const chunksCount = Math.ceil(rows / 20);
    console.log(`   ✅ Chunks créés: ${chunksCount}`);

    console.log(`   🔄 Embeddings OpenAI (simulé)...`);
    const estimatedTokens = chunksCount * 500;
    console.log(`   ✅ Embeddings générés: ${chunksCount} × 1536D (~${estimatedTokens} tokens)`);

    console.log(`   🔄 Stockage MongoDB...`);
    console.log(`   ✅ Stockage terminé`);

    // 4. Réponse API simulée
    console.log('\n📡 RÉPONSE API SIMULÉE:');
    const response = {
      success: true,
      document: {
        id: documentId,
        filename: uniqueName,
        originalName: 'IRPD.csv',
        type: 'csv',
        size: fileSize,
        status: 'completed',
        chunksCount: chunksCount,
        summary: "Données de performance d'agents avec métriques IRPD, nombres de locations et revenus sur plusieurs mois de 2025.",
        keyFacts: [
          "Données de 49 agents sur différentes périodes de 2025",
          "Métriques principales: IRPD, locations, revenus", 
          "Présence d'agents 'Exit Employee' dans les données",
          "Revenus allant de 0€ à 962€ par entrée",
          "Données mensuelles de janvier à octobre 2025"
        ],
        processingTimeMs: 1234,
        tokensUsed: estimatedTokens
      }
    };

    console.log(JSON.stringify(response, null, 2));

    // 5. Test de requêtes possibles
    console.log('\n🎯 QUESTIONS MAINTENANT POSSIBLES:');
    console.log(`   📊 Numériques:`);
    console.log(`      • "Quel est le total des revenus ?"`);
    console.log(`      • "Moyenne IRPD par agent ?"`);
    console.log(`      • "Top 5 des agents par locations ?"`);
    
    console.log(`   🔍 Sémantiques:`);
    console.log(`      • "Qui sont les agents Exit Employee ?"`);
    console.log(`      • "Analyse les performances de William Couzon"`);
    console.log(`      • "Tendances des sous-performants"`);

    console.log('\n🎉 UPLOAD SIMULÉ AVEC SUCCÈS !');
    console.log('📌 Pour tester avec de vraies API, configure MongoDB + OpenAI dans .env.local');

  } catch (error) {
    console.log(`\n❌ ERREUR SIMULATION: ${error.message}`);
  }
}

// Test avec vérification du fichier
function checkSetup() {
  console.log('🔍 VÉRIFICATION SETUP');
  console.log('=====================\n');

  // Vérifier le fichier test
  try {
    const csvPath = join(process.cwd(), 'test-data', 'IRPD.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    console.log(`✅ Fichier test trouvé: ${csvPath}`);
    console.log(`   - Taille: ${csvContent.length} caractères`);
    console.log(`   - Premières lignes: ${csvContent.split('\n')[0].substring(0, 50)}...`);
  } catch (error) {
    console.log(`❌ Fichier test manquant: test-data/IRPD.csv`);
    console.log(`   Copie ton fichier CSV dans le dossier test-data/`);
    return false;
  }

  // Vérifier les modules créés
  const modules = [
    'src/lib/config.ts',
    'src/types/database.ts', 
    'src/lib/mongodb.ts',
    'src/lib/openai.ts',
    'src/lib/parsers/csv-parser.ts',
    'src/app/api/upload/route.ts'
  ];

  console.log('\n📁 MODULES CRÉÉS:');
  modules.forEach(module => {
    try {
      const exists = require('fs').existsSync(module);
      console.log(`   ${exists ? '✅' : '❌'} ${module}`);
    } catch (error) {
      console.log(`   ❌ ${module} (erreur lecture)`);
    }
  });

  // Vérifier les variables d'env
  console.log('\n🔧 VARIABLES D\'ENVIRONNEMENT:');
  const envVars = ['MONGODB_URI', 'OPENAI_API_KEY'];
  envVars.forEach(envVar => {
    const exists = process.env[envVar];
    console.log(`   ${exists ? '✅' : '⚠️'} ${envVar}${exists ? ' (configuré)' : ' (manquant - optionnel pour simulation)'}`);
  });

  return true;
}

// Exécuter les tests
if (require.main === module) {
  if (checkSetup()) {
    console.log('\n');
    simulateUploadRequest();
  }
}

module.exports = { simulateUploadRequest, checkSetup };