// fleet-management-backend/src/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuration de connexion PostgreSQL CORRIGÉE
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fleet_management', // CORRECTION ICI
  // Options supplémentaires pour éviter les erreurs de connexion
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Gérer les erreurs de connexion
pool.on('error', (err, client) => {
  console.error('❌ Erreur inattendue sur un client inactif:', err);
  process.exit(-1);
});

// Test de connexion au démarrage
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion à PostgreSQL:', err.message);
    console.error('⚠️  Vérifiez vos paramètres de connexion dans .env');
  } else {
    console.log('✅ Connexion PostgreSQL établie avec succès');
  }
});

module.exports = pool;