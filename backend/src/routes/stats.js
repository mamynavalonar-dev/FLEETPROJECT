// fleet-management-backend/src/routes/stats.js - CORRIGÉ
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================
// SUIVIS CARBURANT
// ============================================
router.get('/suivis', async (req, res) => {
  try {
    const { type_suivi, statut, date_debut, date_fin, immatriculation } = req.query;
    
    let query = `
      SELECT 
        sc.*,
        v.immatriculation,
        v.marque,
        v.modele
      FROM suivis_carburant sc
      JOIN vehicules v ON sc.vehicule_id = v.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (date_debut && date_debut !== '') {
      query += ` AND sc.date_ravitaillement >= $${paramCount++}`;
      params.push(date_debut);
    }
    
    if (date_fin && date_fin !== '') {
      query += ` AND sc.date_ravitaillement <= $${paramCount++}`;
      params.push(date_fin);
    }
    
    if (immatriculation && immatriculation !== '') {
      query += ` AND v.immatriculation ILIKE $${paramCount++}`;
      params.push(`%${immatriculation}%`);
    }
    
    query += ' ORDER BY sc.date_ravitaillement DESC LIMIT 1000';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération suivis:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTIQUES GLOBALES
// ============================================
router.get('/stats', async (req, res) => {
  try {
    // Stats véhicules
    const statsVehicules = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN statut = 'disponible' THEN id END) as vehicules_disponibles,
        COUNT(DISTINCT CASE WHEN statut = 'en_mission' THEN id END) as vehicules_en_mission,
        COUNT(DISTINCT CASE WHEN statut = 'en_entretien' THEN id END) as vehicules_maintenance
      FROM vehicules
      WHERE actif = true
    `);
    
    // Stats demandes
    const statsDemandes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE statut = 'en_attente') as demandes_en_attente,
        COUNT(*) FILTER (WHERE statut = 'approuvee') as demandes_validees,
        COUNT(*) as total_demandes
      FROM (
        SELECT statut FROM demandes_carburant
        UNION ALL
        SELECT statut FROM demandes_voiture
      ) as all_demandes
    `);
    
    // Stats carburant du mois
    const statsCarburant = await pool.query(`
      SELECT 
        COALESCE(SUM(montant_total), 0) as montant_total_mois,
        COALESCE(SUM(quantite), 0) as litres_total_mois,
        COALESCE(AVG(consommation_theorique), 0) as consommation_moyenne
      FROM suivis_carburant
      WHERE date_ravitaillement >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    res.json({
      success: true,
      global: {
        ...statsVehicules.rows[0],
        ...statsDemandes.rows[0],
        ...statsCarburant.rows[0]
      }
    });
  } catch (error) {
    console.error('Erreur stats globales:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ALERTES
// ============================================
router.get('/alertes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        'REVISION_URGENTE' as type_alerte,
        'Révision urgente' as message,
        v.id as entite_id,
        v.immatriculation as entite_nom,
        v.prochaine_revision_date as date_limite,
        'critique' as priorite
      FROM vehicules v
      WHERE v.prochaine_revision_date < CURRENT_DATE
      AND v.actif = true
      
      UNION ALL
      
      SELECT 
        'ASSURANCE_EXPIREE' as type_alerte,
        'Assurance expirée' as message,
        v.id as entite_id,
        v.immatriculation as entite_nom,
        v.assurance_expiration as date_limite,
        'critique' as priorite
      FROM vehicules v
      WHERE v.assurance_expiration < CURRENT_DATE
      AND v.actif = true
      
      ORDER BY priorite DESC, date_limite ASC
      LIMIT 50
    `);
    
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur alertes:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;