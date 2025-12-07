const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration de connexion PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'postgres' // Connexion initiale à la base postgres
});

const DB_NAME = process.env.DB_NAME || 'fleet_management';

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBox(title, content = '', color = 'cyan') {
  const width = 50;
  const line = '═'.repeat(width);
  
  console.log(`${colors[color]}╔${line}╗${colors.reset}`);
  console.log(`${colors[color]}║${colors.bright} ${title.padEnd(width - 1)}${colors[color]}║${colors.reset}`);
  
  if (content) {
    console.log(`${colors[color]}╠${line}╣${colors.reset}`);
    const lines = content.split('\n');
    lines.forEach(line => {
      console.log(`${colors[color]}║${colors.reset} ${line.padEnd(width - 1)} ${colors[color]}║${colors.reset}`);
    });
  }
  
  console.log(`${colors[color]}╚${line}╝${colors.reset}`);
}

async function testConnection() {
  try {
    const client = await pool.connect();
    log('✅ Connexion à PostgreSQL réussie!', 'green');
    client.release();
    return true;
  } catch (error) {
    log('❌ Erreur de connexion à PostgreSQL:', 'red');
    console.error(error.message);
    log('\n⚠️  Vérifiez:', 'yellow');
    log('   1. PostgreSQL est démarré', 'yellow');
    log('   2. Le mot de passe dans .env est correct', 'yellow');
    log('   3. Les paramètres de connexion sont bons', 'yellow');
    return false;
  }
}

async function databaseExists() {
  try {
    const result = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function createDatabase() {
  try {
    const exists = await databaseExists();
    
    if (exists) {
      log(`\n⚠️  La base de données '${DB_NAME}' existe déjà`, 'yellow');
      
      // Demander confirmation pour recréer
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Voulez-vous la recréer? (o/N): ', (answer) => {
          rl.close();
          if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui') {
            pool.query(`DROP DATABASE IF EXISTS ${DB_NAME}`)
              .then(() => {
                return pool.query(`CREATE DATABASE ${DB_NAME}`);
              })
              .then(() => {
                log(`✅ Base de données '${DB_NAME}' recréée avec succès!`, 'green');
                resolve(true);
              })
              .catch((error) => {
                log('❌ Erreur lors de la recréation:', 'red');
                console.error(error.message);
                resolve(false);
              });
          } else {
            log('ℹ️  Utilisation de la base existante', 'blue');
            resolve(true);
          }
        });
      });
    } else {
      await pool.query(`CREATE DATABASE ${DB_NAME}`);
      log(`✅ Base de données '${DB_NAME}' créée avec succès!`, 'green');
      return true;
    }
  } catch (error) {
    log('❌ Erreur lors de la création de la base:', 'red');
    console.error(error.message);
    return false;
  }
}

async function executeSQLFile(filePath, description) {
  const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: DB_NAME
  });

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    log(`\n📄 Exécution: ${description}...`, 'cyan');
    
    await dbPool.query(sql);
    
    log(`✅ ${description} exécuté avec succès!`, 'green');
    return true;
  } catch (error) {
    log(`❌ Erreur dans ${description}:`, 'red');
    console.error(error.message);
    return false;
  } finally {
    await dbPool.end();
  }
}

async function initializeDatabase() {
  logBox('🚀 INITIALISATION DE LA BASE DE DONNÉES', 
         `Base de données: ${DB_NAME}\nHôte: ${process.env.DB_HOST}:${process.env.DB_PORT}`, 
         'blue');

  // Étape 1: Test de connexion
  log('\n📡 Étape 1/5: Test de connexion...', 'cyan');
  const connected = await testConnection();
  if (!connected) {
    log('\n❌ Impossible de continuer sans connexion', 'red');
    process.exit(1);
  }

  // Étape 2: Création de la base
  log('\n🗄️  Étape 2/5: Création de la base de données...', 'cyan');
  const created = await createDatabase();
  if (!created) {
    log('\n❌ Impossible de continuer sans base de données', 'red');
    process.exit(1);
  }

  // Fermer la connexion à postgres
  await pool.end();

  // Étape 3: Création du schéma
  log('\n📐 Étape 3/5: Création du schéma...', 'cyan');
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    log(`❌ Fichier non trouvé: ${schemaPath}`, 'red');
    process.exit(1);
  }
  const schemaOk = await executeSQLFile(schemaPath, 'Schéma des tables');
  if (!schemaOk) process.exit(1);

  // Étape 4: Création des triggers
  log('\n⚡ Étape 4/5: Création des triggers...', 'cyan');
  const triggersPath = path.join(__dirname, 'database', 'triggers.sql');
  if (!fs.existsSync(triggersPath)) {
    log(`❌ Fichier non trouvé: ${triggersPath}`, 'red');
    process.exit(1);
  }
  const triggersOk = await executeSQLFile(triggersPath, 'Triggers et fonctions');
  if (!triggersOk) process.exit(1);

  // Étape 5: Création des vues
  log('\n👁️  Étape 5/5: Création des vues...', 'cyan');
  const viewsPath = path.join(__dirname, 'database', 'views.sql');
  if (!fs.existsSync(viewsPath)) {
    log(`❌ Fichier non trouvé: ${viewsPath}`, 'red');
    process.exit(1);
  }
  const viewsOk = await executeSQLFile(viewsPath, 'Vues SQL');
  if (!viewsOk) process.exit(1);

  // Étape 6: Insertion des données initiales (optionnel)
  const seedPath = path.join(__dirname, 'database', 'seed.sql');
  if (fs.existsSync(seedPath)) {
    log('\n🌱 Étape bonus: Insertion des données initiales...', 'cyan');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('Voulez-vous insérer les données de test? (o/N): ', async (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui') {
          await executeSQLFile(seedPath, 'Données initiales');
          
          logBox('✅ INITIALISATION TERMINÉE AVEC SUCCÈS!', 
                 `Base: ${DB_NAME}\nSchéma: ✅\nTriggers: ✅\nVues: ✅\nDonnées: ✅`, 
                 'green');
          
          log('\n📝 Prochaines étapes:', 'yellow');
          log('   1. npm run dev           - Démarrer le serveur', 'yellow');
          log('   2. http://localhost:3000 - Tester l\'API', 'yellow');
          
        } else {
          logBox('✅ INITIALISATION TERMINÉE SANS DONNÉES!', 
                 `Base: ${DB_NAME}\nSchéma: ✅\nTriggers: ✅\nVues: ✅\nDonnées: ❌`, 
                 'green');
                 
          log('\n📝 Prochaines étapes:', 'yellow');
          log('   1. Créer un utilisateur admin manuellement', 'yellow');
          log('   2. npm run dev           - Démarrer le serveur', 'yellow');
        }
        
        resolve();
      });
    });
  } else {
    logBox('✅ INITIALISATION TERMINÉE!', 
           `Base: ${DB_NAME}\nSchéma: ✅\nTriggers: ✅\nVues: ✅`, 
           'green');
  }
}

// Exécution
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      log('\n👋 Au revoir!', 'cyan');
      process.exit(0);
    })
    .catch((error) => {
      log('\n❌ Erreur fatale:', 'red');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };