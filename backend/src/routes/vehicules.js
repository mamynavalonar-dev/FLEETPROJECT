// fleet-management-backend/src/routes/vehicules.js - CORRIGÉ
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
// GESTION DES VÉHICULES
// ============================================

// Récupérer tous les véhicules
router.get('/vehicules', authentifier, async (req, res) => {
  try {
    const { statut } = req.query;
    
    let query = 'SELECT * FROM vehicules WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (statut) {
      query += ` AND statut = $${paramCount++}`;
      params.push(statut);
    }
    
    query += ' ORDER BY immatriculation';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération véhicules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer un véhicule spécifique
router.get('/vehicules/:id', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.*,
        COUNT(DISTINCT dv.id) FILTER (WHERE dv.statut = 'terminee') as nombre_missions,
        COALESCE(SUM(dv.kilometrage_retour - dv.kilometrage_depart) FILTER (WHERE dv.statut = 'terminee'), 0) as total_km_missions,
        COALESCE(AVG(sc.consommation_theorique), 0) as consommation_moyenne
      FROM vehicules v
      LEFT JOIN demandes_voiture dv ON v.id = dv.vehicule_id
      LEFT JOIN suivis_carburant sc ON v.id = sc.vehicule_id
      WHERE v.id = $1
      GROUP BY v.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Véhicule non trouvé' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération véhicule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Créer un nouveau véhicule
router.post('/vehicules', 
  authentifier, 
  verifierRole('gestionnaire', 'admin'), 
  async (req, res) => {
    try {
      const {
        immatriculation, marque, modele, annee,
        type_carburant, capacite_reservoir, couleur, numero_chassis
      } = req.body;
      
      // Validation
      if (!immatriculation || !marque || !modele) {
        return res.status(400).json({ 
          error: 'Champs requis manquants',
          required: ['immatriculation', 'marque', 'modele']
        });
      }
      
      const result = await pool.query(`
        INSERT INTO vehicules (
          immatriculation, marque, modele, annee,
          type_carburant, capacite_reservoir, couleur, numero_chassis,
          statut
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'disponible')
        RETURNING *
      `, [
        immatriculation.toUpperCase(), 
        marque, 
        modele, 
        annee || new Date().getFullYear(), 
        type_carburant || 'essence',
        capacite_reservoir || null, 
        couleur || null, 
        numero_chassis || null
      ]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Véhicule créé avec succès',
        vehicule: result.rows[0] 
      });
    } catch (error) {
      if (error.code === '23505') { // Duplicate key
        return res.status(409).json({ 
          error: 'Cette immatriculation existe déjà' 
        });
      }
      console.error('Erreur création véhicule:', error);
      res.status(500).json({ error: error.message });
    }
});

// Modifier un véhicule
router.put('/vehicules/:id', 
  authentifier, 
  verifierRole('gestionnaire', 'admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Champs autorisés
      const champsAutorises = [
        'marque', 'modele', 'annee', 'type_carburant',
        'capacite_reservoir', 'couleur', 'numero_chassis', 'statut',
        'kilometrage'
      ];
      
      const setClauses = [];
      const values = [];
      let paramCount = 1;
      
      Object.keys(updates).forEach(key => {
        if (champsAutorises.includes(key)) {
          setClauses.push(`${key} = $${paramCount++}`);
          values.push(updates[key]);
        }
      });
      
      if (setClauses.length === 0) {
        return res.status(400).json({ 
          error: 'Aucun champ valide à mettre à jour',
          champsAutorises 
        });
      }
      
      values.push(id);
      
      const result = await pool.query(`
        UPDATE vehicules 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Véhicule non trouvé' });
      }
      
      res.json({ 
        success: true, 
        message: 'Véhicule modifié avec succès',
        vehicule: result.rows[0] 
      });
    } catch (error) {
      console.error('Erreur modification véhicule:', error);
      res.status(500).json({ error: error.message });
    }
});

// Supprimer un véhicule
router.delete('/vehicules/:id', 
  authentifier, 
  verifierRole('admin'), 
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      
      await client.query('BEGIN');
      
      // Vérifier missions en cours
      const missionsEnCours = await client.query(
        'SELECT id FROM demandes_voiture WHERE vehicule_id = $1 AND statut = $2',
        [id, 'en_cours']
      );
      
      if (missionsEnCours.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Impossible de supprimer un véhicule avec des missions en cours' 
        });
      }
      
      const result = await client.query(
        'DELETE FROM vehicules WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Véhicule non trouvé' });
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Véhicule supprimé avec succès' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur suppression véhicule:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

module.exports = router;