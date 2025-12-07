const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Route de suivi carburant
router.get('/suivis', async (req, res) => {
  try {
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

// Route stats globales
router.get('/stats', async (req, res) => {
  try {
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

// Route alertes
router.get('/alertes', async (req, res) => {
  try {
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

module.exports = router;
