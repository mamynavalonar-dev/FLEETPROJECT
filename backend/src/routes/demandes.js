// fleet-management-backend/src/routes/demandes.js - CORRIGÉ
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Auth désactivée pour DEV
const authentifier = (req, res, next) => { 
  req.user = { id: 1, role: 'admin', email: 'admin@prirtem.mg' }; 
  next(); 
};
const verifierRole = (...roles) => (req, res, next) => next();

// ============================================
// DEMANDES DE CARBURANT
// ============================================

// Créer une demande de carburant
router.post('/demandes-carburant', authentifier, async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      vehicule_id, 
      quantite_demandee, 
      type_carburant, 
      motif, 
      kilometrage_actuel 
    } = req.body;
    
    // Validation
    if (!vehicule_id || !quantite_demandee || !type_carburant || !motif) {
      return res.status(400).json({ 
        error: 'Champs requis manquants',
        required: ['vehicule_id', 'quantite_demandee', 'type_carburant', 'motif']
      });
    }

    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO demandes_carburant (
        vehicule_id, 
        demandeur_id, 
        quantite_demandee, 
        type_carburant,
        motif, 
        kilometrage_actuel,
        statut
      ) VALUES ($1, $2, $3, $4, $5, $6, 'en_attente')
      RETURNING *
    `, [vehicule_id, req.user.id, quantite_demandee, type_carburant, motif, kilometrage_actuel]);
    
    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true, 
      message: 'Demande créée avec succès',
      demande: result.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur création demande carburant:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Récupérer les demandes de carburant
router.get('/demandes-carburant', authentifier, async (req, res) => {
  try {
    const { statut, date_debut, date_fin } = req.query;
    
    let query = `
      SELECT 
        dc.*,
        u.nom as demandeur_nom,
        u.prenom as demandeur_prenom,
        v.immatriculation,
        v.marque,
        v.modele
      FROM demandes_carburant dc
      JOIN utilisateurs u ON dc.demandeur_id = u.id
      JOIN vehicules v ON dc.vehicule_id = v.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (statut && statut !== '') {
      query += ` AND dc.statut = $${paramCount++}`;
      params.push(statut);
    }
    
    if (date_debut && date_debut !== '') {
      query += ` AND dc.date_demande >= $${paramCount++}`;
      params.push(date_debut);
    }
    
    if (date_fin && date_fin !== '') {
      query += ` AND dc.date_demande <= $${paramCount++}`;
      params.push(date_fin);
    }
    
    query += ' ORDER BY dc.date_demande DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération demandes carburant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer une demande spécifique
router.get('/demandes-carburant/:id', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        dc.*,
        u.nom as demandeur_nom,
        u.prenom as demandeur_prenom,
        v.immatriculation,
        v.marque,
        v.modele
      FROM demandes_carburant dc
      JOIN utilisateurs u ON dc.demandeur_id = u.id
      JOIN vehicules v ON dc.vehicule_id = v.id
      WHERE dc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération demande:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approuver une demande
router.put('/demandes-carburant/:id/verifier', 
  authentifier, 
  verifierRole('gestionnaire', 'admin'), 
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { approuve, commentaire } = req.body;
      
      if (typeof approuve !== 'boolean') {
        return res.status(400).json({ 
          error: 'Le champ "approuve" est requis et doit être un boolean' 
        });
      }
      
      await client.query('BEGIN');
      
      const nouveauStatut = approuve ? 'approuvee' : 'rejetee';
      
      const result = await client.query(`
        UPDATE demandes_carburant
        SET 
          statut = $1,
          approuveur_id = $2,
          date_approbation = CURRENT_TIMESTAMP,
          commentaire_approbation = $3,
          quantite_approuvee = CASE WHEN $1 = 'approuvee' THEN quantite_demandee ELSE NULL END
        WHERE id = $4 AND statut = 'en_attente'
        RETURNING *
      `, [nouveauStatut, req.user.id, commentaire || null, id]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Demande non trouvée ou déjà traitée' 
        });
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: approuve ? 'Demande approuvée avec succès' : 'Demande rejetée',
        demande: result.rows[0] 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur vérification demande:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

// ============================================
// DEMANDES DE VOITURE
// ============================================

// Créer une demande de voiture
router.post('/demandes-voiture', authentifier, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      destination,
      motif,
      date_debut,
      date_fin,
      nombre_passagers
    } = req.body;
    
    // Validation
    if (!destination || !motif || !date_debut || !date_fin) {
      return res.status(400).json({ 
        error: 'Champs requis manquants',
        required: ['destination', 'motif', 'date_debut', 'date_fin']
      });
    }

    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO demandes_voiture (
        demandeur_id, 
        destination, 
        motif,
        date_debut, 
        date_fin,
        nombre_passagers,
        statut
      ) VALUES ($1, $2, $3, $4, $5, $6, 'en_attente')
      RETURNING *
    `, [req.user.id, destination, motif, date_debut, date_fin, nombre_passagers || 1]);
    
    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true, 
      message: 'Demande créée avec succès',
      demande: result.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur création demande voiture:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Récupérer les demandes de voiture
router.get('/demandes-voiture', authentifier, async (req, res) => {
  try {
    let query = `
      SELECT 
        dv.*,
        u.nom as demandeur_nom,
        u.prenom as demandeur_prenom,
        s.nom as service_nom,
        v.immatriculation,
        v.marque,
        v.modele
      FROM demandes_voiture dv
      JOIN utilisateurs u ON dv.demandeur_id = u.id
      LEFT JOIN services s ON dv.service_id = s.id
      LEFT JOIN vehicules v ON dv.vehicule_id = v.id
      ORDER BY dv.date_debut ASC, dv.date_demande DESC
    `;
    
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération demandes voiture:', error);
    res.status(500).json({ error: error.message });
  }
});

// Affecter véhicule et chauffeur
router.put('/demandes-voiture/:id/affecter',
  authentifier,
  verifierRole('gestionnaire', 'admin'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { vehicule_id, chauffeur_id, approuve, commentaire } = req.body;
      
      if (!vehicule_id || !chauffeur_id || typeof approuve !== 'boolean') {
        return res.status(400).json({ 
          error: 'Champs requis manquants',
          required: ['vehicule_id', 'chauffeur_id', 'approuve (boolean)']
        });
      }
      
      await client.query('BEGIN');
      
      const nouveauStatut = approuve ? 'approuvee' : 'rejetee';
      
      const result = await client.query(`
        UPDATE demandes_voiture
        SET 
          vehicule_id = $1,
          chauffeur_id = $2,
          statut = $3,
          approuveur_id = $4,
          date_approbation = CURRENT_TIMESTAMP,
          commentaire_approbation = $5
        WHERE id = $6 AND statut = 'en_attente'
        RETURNING *
      `, [vehicule_id, chauffeur_id, nouveauStatut, req.user.id, commentaire || null, id]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Demande non trouvée ou déjà traitée' 
        });
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: approuve ? 'Véhicule et chauffeur affectés avec succès' : 'Demande rejetée',
        demande: result.rows[0] 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur affectation:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

module.exports = router;