// fleet-management-backend/src/routes/vehicules.js
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
    const { statut, type_vehicule } = req.query;
    
    let query = 'SELECT * FROM vehicules WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (statut) {
      query += ` AND statut = $${paramCount++}`;
      params.push(statut);
    }
    
    if (type_vehicule) {
      query += ` AND type_vehicule = $${paramCount++}`;
      params.push(type_vehicule);
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
        COUNT(DISTINCT m.id) as nombre_missions,
        SUM(m.km_parcourus) as total_km_missions,
        AVG(sc.consommation_aux_100) as consommation_moyenne
      FROM vehicules v
      LEFT JOIN missions m ON v.id = m.vehicule_id AND m.statut = 'terminee'
      LEFT JOIN suivi_carburant sc ON v.immatriculation = sc.immatriculation
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
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    try {
      const {
        immatriculation, marque, modele, annee, type_vehicule,
        type_carburant, capacite_reservoir, couleur, numero_chassis,
        date_acquisition
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
          immatriculation, marque, modele, annee, type_vehicule,
          type_carburant, capacite_reservoir, couleur, numero_chassis,
          date_acquisition, statut
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'disponible')
        RETURNING *
      `, [
        immatriculation.toUpperCase(), marque, modele, annee || null, 
        type_vehicule || 'voiture', type_carburant || 'essence',
        capacite_reservoir || null, couleur || null, numero_chassis || null,
        date_acquisition || null
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
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Champs autorisés à être modifiés
      const champsAutorises = [
        'marque', 'modele', 'annee', 'type_vehicule', 'type_carburant',
        'capacite_reservoir', 'couleur', 'numero_chassis', 'statut',
        'km_actuel', 'photo_url'
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
        SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
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
      
      // Vérifier si le véhicule a des missions en cours
      const missionsEnCours = await client.query(
        'SELECT id FROM missions WHERE vehicule_id = $1 AND statut = $2',
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

// ============================================
// MAINTENANCE VÉHICULES
// ============================================

// Récupérer les maintenances d'un véhicule
router.get('/vehicules/:id/maintenances', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM entretiens 
      WHERE vehicule_id = $1
      ORDER BY date_debut DESC
    `, [id]);
    
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération maintenances:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ajouter une maintenance
router.post('/vehicules/:id/maintenances', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type_entretien, description, date_debut, kilometrage, cout, garage } = req.body;
      
      if (!type_entretien || !date_debut) {
        return res.status(400).json({ 
          error: 'Champs requis manquants',
          required: ['type_entretien', 'date_debut']
        });
      }
      
      const result = await pool.query(`
        INSERT INTO entretiens (
          vehicule_id, type_entretien, description, date_debut,
          kilometrage, cout, garage, statut
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'planifie')
        RETURNING *
      `, [id, type_entretien, description || null, date_debut, 
          kilometrage || null, cout || null, garage || null]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Maintenance ajoutée avec succès',
        maintenance: result.rows[0] 
      });
    } catch (error) {
      console.error('Erreur ajout maintenance:', error);
      res.status(500).json({ error: error.message });
    }
});

// ============================================
// DOCUMENTS VÉHICULES
// ============================================

// Récupérer les documents d'un véhicule
router.get('/vehicules/:id/documents', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM documents_vehicules
      WHERE vehicule_id = $1
      ORDER BY date_expiration ASC
    `, [id]);
    
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un document
router.post('/vehicules/:id/documents', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type_document, numero_document, date_emission, date_expiration, fichier_url } = req.body;
      
      if (!type_document || !date_expiration) {
        return res.status(400).json({ 
          error: 'Champs requis manquants',
          required: ['type_document', 'date_expiration']
        });
      }
      
      const result = await pool.query(`
        INSERT INTO documents_vehicules (
          vehicule_id, type_document, numero_document, date_emission,
          date_expiration, fichier_url
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [id, type_document, numero_document || null, date_emission || null,
          date_expiration, fichier_url || null]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Document ajouté avec succès',
        document: result.rows[0] 
      });
    } catch (error) {
      console.error('Erreur ajout document:', error);
      res.status(500).json({ error: error.message });
    }
});

// ============================================
// DASHBOARDS
// ============================================

// Dashboard véhicules
router.get('/dashboard/vehicules', authentifier, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dashboard_vehicules');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur dashboard véhicules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alertes documents expirés
router.get('/dashboard/alertes-documents', authentifier, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alertes_documents_expires');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur alertes documents:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;