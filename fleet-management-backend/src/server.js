// fleet-management-backend/src/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Routes d'authentification (à implémenter)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // TODO: Implémenter la logique d'authentification
    res.json({ 
      success: true, 
      message: 'Connexion simulée',
      token: 'mock_token',
      user: { id: 1, email, role: 'admin' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import des routes
const demandesRoutes = require('./routes/demandes');
const vehiculesRoutes = require('./routes/vehicules');
const chauffeursRoutes = require('./routes/chauffeurs');
const importRoutes = require('./routes/import');
const pdfRoutes = require('./routes/pdf');

// Montage des routes SANS authentification pour le développement
app.use('/api', demandesRoutes);
app.use('/api', vehiculesRoutes);
app.use('/api', chauffeursRoutes);
app.use('/api', importRoutes);
app.use('/api', pdfRoutes);

// Route de suivi carburant SANS authentification
app.get('/api/suivis', async (req, res) => {
  try {
    const pool = require('./config/database');
    const { type_suivi, statut, date_debut, date_fin, immatriculation } = req.query;
    
    let query = 'SELECT * FROM suivi_carburant WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (type_suivi) {
      query += ` AND type_suivi = $${paramCount++}`;
      params.push(type_suivi);
    }
    
    if (statut) {
      query += ` AND statut_validation = $${paramCount++}`;
      params.push(statut);
    }
    
    if (date_debut) {
      query += ` AND date_operation >= $${paramCount++}`;
      params.push(date_debut);
    }
    
    if (date_fin) {
      query += ` AND date_operation <= $${paramCount++}`;
      params.push(date_fin);
    }
    
    if (immatriculation) {
      query += ` AND immatriculation ILIKE $${paramCount++}`;
      params.push(`%${immatriculation}%`);
    }
    
    query += ' ORDER BY date_operation DESC, created_at DESC LIMIT 1000';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération suivis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route stats globales SANS authentification
app.get('/api/stats', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    const statsVehicules = await pool.query('SELECT * FROM stats_vehicule');
    const dashboard = await pool.query('SELECT * FROM dashboard_carburant LIMIT 30');
    
    // Stats globales
    const globalStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN statut = 'disponible' THEN id END) as vehicules_disponibles,
        COUNT(DISTINCT CASE WHEN statut = 'en_mission' THEN id END) as vehicules_en_mission,
        COUNT(DISTINCT CASE WHEN statut = 'en_entretien' THEN id END) as vehicules_maintenance
      FROM vehicules
    `);
    
    const demandesStats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN statut::text LIKE '%attente%' THEN 1 END) as demandes_en_attente,
        COUNT(CASE WHEN statut::text = 'valide' THEN 1 END) as demandes_validees,
        COUNT(*) as total_demandes
      FROM (
        SELECT statut FROM demandes_carburant
        UNION ALL
        SELECT statut FROM demandes_voiture
      ) as all_demandes
    `);
    
    const carburantStats = await pool.query(`
      SELECT 
        SUM(montant) as montant_total_mois,
        SUM(quantite_litres) as litres_total_mois,
        AVG(consommation_aux_100) as consommation_moyenne
      FROM suivi_carburant
      WHERE date_operation >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    res.json({
      success: true,
      parVehicule: statsVehicules.rows,
      dashboard: dashboard.rows,
      global: {
        ...globalStats.rows[0],
        ...demandesStats.rows[0],
        ...carburantStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route alertes SANS authentification
app.get('/api/alertes', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    const result = await pool.query(`
      SELECT 
        a.*,
        s.immatriculation,
        s.date_operation,
        s.type_suivi
      FROM alertes_carburant a
      JOIN suivi_carburant s ON a.suivi_id = s.id
      WHERE a.est_resolue = false
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur alertes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES DE TEST
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test de connexion à la base de données
app.get('/api/test-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({ 
      success: true, 
      message: 'Connexion à la base de données réussie',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Liste des routes disponibles
app.get('/api/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ success: true, routes });
});

// ============================================
// GESTION DES ERREURS
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// Error Handler global
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🚀 Serveur PRIRTEM Fleet Management    ║
╠═══════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Env:  ${process.env.NODE_ENV || 'development'}                  ║
║   URL:  http://localhost:${PORT}             ║
║   Auth: ❌ DÉSACTIVÉE (DEV MODE)            ║
╚═══════════════════════════════════════════╝
  `);
  
  console.log('📋 Routes disponibles:');
  console.log('   GET  /health              - Health check');
  console.log('   GET  /api/test-db         - Test base de données');
  console.log('   GET  /api/routes          - Liste des routes');
  console.log('   POST /api/auth/login      - Connexion');
  console.log('');
  console.log('   📦 Demandes:');
  console.log('   GET/POST /api/demandes-carburant');
  console.log('   GET/POST /api/demandes-voiture');
  console.log('');
  console.log('   🚗 Véhicules:');
  console.log('   GET/POST /api/vehicules');
  console.log('');
  console.log('   👨‍✈️ Chauffeurs:');
  console.log('   GET/POST /api/chauffeurs');
  console.log('');
  console.log('   📊 Import & Stats:');
  console.log('   POST /api/import-excel');
  console.log('   GET  /api/stats');
  console.log('   GET  /api/suivis');
  console.log('   GET  /api/alertes');
  console.log('');
  console.log('⚠️  MODE DÉVELOPPEMENT - Authentification désactivée');
  console.log('✨ Serveur prêt à recevoir des requêtes!');
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, fermeture du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT reçu, fermeture du serveur...');
  process.exit(0);
});

module.exports = app;