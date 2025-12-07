// fleet-management-backend/test-corrections.js
// Script de test pour vérifier les corrections

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

async function testAPI(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

async function runTests() {
  logSection('🧪 TESTS DE VÉRIFICATION DES CORRECTIONS');
  
  let passedTests = 0;
  let failedTests = 0;
  
  // ============================================
  // TEST 1: Connexion API
  // ============================================
  logSection('Test 1: Connexion à l\'API');
  
  const healthCheck = await testAPI('/health');
  if (healthCheck.success) {
    log('✅ API accessible', 'green');
    passedTests++;
  } else {
    log('❌ API non accessible', 'red');
    failedTests++;
    return;
  }
  
  // ============================================
  // TEST 2: Routes véhicules
  // ============================================
  logSection('Test 2: Routes véhicules');
  
  const vehicules = await testAPI('/vehicules');
  if (vehicules.success) {
    log(`✅ Route /vehicules fonctionne (${vehicules.data.count || 0} véhicules)`, 'green');
    passedTests++;
  } else {
    log('❌ Route /vehicules échoue', 'red');
    failedTests++;
  }
  
  // ============================================
  // TEST 3: Routes chauffeurs
  // ============================================
  logSection('Test 3: Routes chauffeurs');
  
  const chauffeurs = await testAPI('/chauffeurs');
  if (chauffeurs.success) {
    log(`✅ Route /chauffeurs fonctionne (${chauffeurs.data.count || 0} chauffeurs)`, 'green');
    passedTests++;
  } else {
    log('❌ Route /chauffeurs échoue', 'red');
    failedTests++;
  }
  
  // ============================================
  // TEST 4: Routes suivi carburant
  // ============================================
  logSection('Test 4: Routes suivi carburant');
  
  const suivis = await testAPI('/suivis');
  if (suivis.success) {
    log(`✅ Route /suivis fonctionne (${suivis.data.count || 0} entrées)`, 'green');
    passedTests++;
  } else {
    log('❌ Route /suivis échoue', 'red');
    failedTests++;
  }
  
  // ============================================
  // TEST 5: Vérification colonne nom_feuille
  // ============================================
  logSection('Test 5: Vérification colonne nom_feuille');
  
  const { Pool } = require('pg');
  require('dotenv').config();
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fleet_management'
  });
  
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'suivi_carburant' 
      AND column_name = 'nom_feuille'
    `);
    
    if (result.rows.length > 0) {
      log('✅ Colonne nom_feuille existe dans suivi_carburant', 'green');
      passedTests++;
    } else {
      log('❌ Colonne nom_feuille manquante', 'red');
      log('   Exécutez: psql -U postgres -d fleet_management -f database/migration_add_nom_feuille.sql', 'yellow');
      failedTests++;
    }
  } catch (error) {
    log('❌ Erreur vérification BDD: ' + error.message, 'red');
    failedTests++;
  } finally {
    await pool.end();
  }
  
  // ============================================
  // TEST 6: Vérification fichier import.js
  // ============================================
  logSection('Test 6: Vérification fichier import.js');
  
  const importPath = path.join(__dirname, 'src', 'routes', 'import.js');
  
  if (fs.existsSync(importPath)) {
    const content = fs.readFileSync(importPath, 'utf8');
    
    // Vérifier présence du code multi-feuilles
    if (content.includes('for (const nomFeuille of workbook.SheetNames)')) {
      log('✅ Import multi-feuilles implémenté', 'green');
      passedTests++;
    } else {
      log('❌ Import multi-feuilles non détecté', 'red');
      log('   Remplacez src/routes/import.js par la nouvelle version', 'yellow');
      failedTests++;
    }
    
    if (content.includes('detecterTypeFeuille')) {
      log('✅ Détection automatique du type présente', 'green');
      passedTests++;
    } else {
      log('❌ Détection automatique manquante', 'red');
      failedTests++;
    }
  } else {
    log('❌ Fichier import.js non trouvé', 'red');
    failedTests++;
  }
  
  // ============================================
  // TEST 7: Vérification imports frontend
  // ============================================
  logSection('Test 7: Vérification imports frontend');
  
  const vehiculesPath = path.join(__dirname, '..', 'fleet-management-frontend', 'src', 'components', 'Vehicules.jsx');
  const chauffeursPath = path.join(__dirname, '..', 'fleet-management-frontend', 'src', 'components', 'Chauffeurs.jsx');
  
  let frontendOK = true;
  
  if (fs.existsSync(vehiculesPath)) {
    const content = fs.readFileSync(vehiculesPath, 'utf8');
    if (content.includes('XCircle')) {
      log('✅ XCircle importé dans Vehicules.jsx', 'green');
      passedTests++;
    } else {
      log('❌ XCircle manquant dans Vehicules.jsx', 'red');
      log('   Ajoutez XCircle aux imports de lucide-react', 'yellow');
      failedTests++;
      frontendOK = false;
    }
  } else {
    log('⚠️  Vehicules.jsx non trouvé (vérification manuelle requise)', 'yellow');
  }
  
  if (fs.existsSync(chauffeursPath)) {
    const content = fs.readFileSync(chauffeursPath, 'utf8');
    if (content.includes('XCircle')) {
      log('✅ XCircle importé dans Chauffeurs.jsx', 'green');
      passedTests++;
    } else {
      log('❌ XCircle manquant dans Chauffeurs.jsx', 'red');
      log('   Ajoutez XCircle aux imports de lucide-react', 'yellow');
      failedTests++;
      frontendOK = false;
    }
  } else {
    log('⚠️  Chauffeurs.jsx non trouvé (vérification manuelle requise)', 'yellow');
  }
  
  // ============================================
  // RÉSUMÉ
  // ============================================
  logSection('📊 RÉSUMÉ DES TESTS');
  
  const total = passedTests + failedTests;
  const percentage = Math.round((passedTests / total) * 100);
  
  console.log(`Tests réussis: ${passedTests}/${total} (${percentage}%)`);
  
  if (failedTests === 0) {
    log('\n🎉 TOUS LES TESTS SONT PASSÉS!', 'green');
    log('✅ Les corrections ont été appliquées correctement', 'green');
    log('✅ L\'application est prête à être utilisée', 'green');
  } else {
    log(`\n⚠️  ${failedTests} test(s) échoué(s)`, 'yellow');
    log('Consultez les messages ci-dessus pour corriger les problèmes', 'yellow');
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Retourner le code de sortie approprié
  process.exit(failedTests > 0 ? 1 : 0);
}

// Exécution
if (require.main === module) {
  runTests().catch(error => {
    log('\n❌ Erreur fatale durant les tests:', 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests };