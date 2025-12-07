// fleet-management-backend/src/routes/demandes.js
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
    const { type_demande, objet, montant_previsionnel, montant_en_lettre } = req.body;
    
    // Validation
    if (!type_demande || !objet || !montant_previsionnel) {
      return res.status(400).json({ 
        error: 'Champs requis manquants',
        required: ['type_demande', 'objet', 'montant_previsionnel']
      });
    }

    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO demandes_carburant (
        demandeur_id, type_demande, objet, 
        montant_previsionnel, montant_en_lettre, statut
      ) VALUES ($1, $2, $3, $4, $5, 'en_attente_logistique')
      RETURNING *
    `, [req.user.id, type_demande, objet, montant_previsionnel, montant_en_lettre || '']);
    
    // Générer le numéro de demande
    const demande = result.rows[0];
    await client.query(`
      UPDATE demandes_carburant 
      SET numero_demande = $1 
      WHERE id = $2
    `, [`DC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(demande.id).padStart(4, '0')}`, demande.id]);
    
    await client.query('COMMIT');
    
    // Récupérer la demande mise à jour
    const finalResult = await client.query('SELECT * FROM demandes_carburant WHERE id = $1', [demande.id]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Demande créée avec succès',
      demande: finalResult.rows[0] 
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
        u.service,
        vl.nom as verificateur_nom,
        vl.prenom as verificateur_prenom,
        vr.nom as visa_nom,
        vr.prenom as visa_prenom
      FROM demandes_carburant dc
      JOIN utilisateurs u ON dc.demandeur_id = u.id
      LEFT JOIN utilisateurs vl ON dc.verifie_par_logistique = vl.id
      LEFT JOIN utilisateurs vr ON dc.vise_par_raf = vr.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Filtrer selon le rôle
    if (req.user.role === 'demandeur') {
      query += ` AND dc.demandeur_id = $${paramCount++}`;
      params.push(req.user.id);
    } else if (req.user.role === 'logistique') {
      query += ` AND dc.statut IN ('en_attente_logistique', 'approuve_logistique')`;
    } else if (req.user.role === 'raf') {
      query += ` AND dc.statut IN ('en_attente_raf', 'approuve_raf')`;
    }
    
    // Filtres additionnels
    if (statut) {
      query += ` AND dc.statut = $${paramCount++}`;
      params.push(statut);
    }
    
    if (date_debut) {
      query += ` AND dc.date_demande >= $${paramCount++}`;
      params.push(date_debut);
    }
    
    if (date_fin) {
      query += ` AND dc.date_demande <= $${paramCount++}`;
      params.push(date_fin);
    }
    
    query += ' ORDER BY dc.date_demande DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
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
        u.service,
        u.email as demandeur_email,
        vl.nom as verificateur_nom,
        vl.prenom as verificateur_prenom,
        vr.nom as visa_nom,
        vr.prenom as visa_prenom
      FROM demandes_carburant dc
      JOIN utilisateurs u ON dc.demandeur_id = u.id
      LEFT JOIN utilisateurs vl ON dc.verifie_par_logistique = vl.id
      LEFT JOIN utilisateurs vr ON dc.vise_par_raf = vr.id
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

// Vérification par logistique
router.put('/demandes-carburant/:id/verifier', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
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
      
      const nouveauStatut = approuve ? 'en_attente_raf' : 'rejete_logistique';
      
      const result = await client.query(`
        UPDATE demandes_carburant
        SET 
          statut = $1,
          verifie_par_logistique = $2,
          date_verification_logistique = CURRENT_TIMESTAMP,
          commentaire_logistique = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND statut = 'en_attente_logistique'
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
        message: approuve ? 'Demande approuvée et envoyée au RAF' : 'Demande rejetée',
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

// Visa par RAF
router.put('/demandes-carburant/:id/viser', 
  authentifier, 
  verifierRole('raf', 'admin'), 
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
      
      const nouveauStatut = approuve ? 'valide' : 'rejete_raf';
      
      const result = await client.query(`
        UPDATE demandes_carburant
        SET 
          statut = $1,
          vise_par_raf = $2,
          date_visa_raf = CURRENT_TIMESTAMP,
          commentaire_raf = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND statut = 'en_attente_raf'
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
        message: approuve ? 'Demande validée avec succès' : 'Demande rejetée',
        demande: result.rows[0] 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur visa demande:', error);
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
      date_proposee, objet, itineraire, personnes_transportees,
      heure_depart_souhaitee, heure_retour_probable
    } = req.body;
    
    // Validation
    if (!date_proposee || !objet) {
      return res.status(400).json({ 
        error: 'Champs requis manquants',
        required: ['date_proposee', 'objet']
      });
    }

    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO demandes_voiture (
        demandeur_id, date_proposee, objet, itineraire,
        personnes_transportees, heure_depart_souhaitee,
        heure_retour_probable, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente_logistique')
      RETURNING *
    `, [req.user.id, date_proposee, objet, itineraire || null, 
        personnes_transportees || null, heure_depart_souhaitee || null, 
        heure_retour_probable || null]);
    
    // Générer le numéro de demande
    const demande = result.rows[0];
    await client.query(`
      UPDATE demandes_voiture 
      SET numero_demande = $1 
      WHERE id = $2
    `, [`DV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(demande.id).padStart(4, '0')}`, demande.id]);
    
    await client.query('COMMIT');
    
    // Récupérer la demande mise à jour
    const finalResult = await client.query(`
          INSERT INTO demandes_voiture (
            demandeur_id, date_proposee, objet, itineraire,
            personnes_transportees, heure_depart_souhaitee,
            heure_retour_probable, statut
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente_logistique')
          RETURNING *
        `, [req.user.id, date_proposee, objet, itineraire || null, 
            personnes_transportees || null, heure_depart_souhaitee || null, 
            heure_retour_probable || null]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Demande créée avec succès',
      demande: finalResult.rows[0] 
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
        u.service,
        v.immatriculation,
        v.marque,
        v.modele,
        uc.nom as chauffeur_nom,
        uc.prenom as chauffeur_prenom,
        vl.nom as verificateur_nom,
        vr.nom as approbateur_nom
      FROM demandes_voiture dv
      JOIN utilisateurs u ON dv.demandeur_id = u.id
      LEFT JOIN vehicules v ON dv.vehicule_id = v.id
      LEFT JOIN chauffeurs c ON dv.chauffeur_id = c.id
      LEFT JOIN utilisateurs uc ON c.utilisateur_id = uc.id
      LEFT JOIN utilisateurs vl ON dv.verifie_par_logistique = vl.id
      LEFT JOIN utilisateurs vr ON dv.approuve_par_raf = vr.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (req.user.role === 'demandeur') {
      query += ` AND dv.demandeur_id = $${paramCount++}`;
      params.push(req.user.id);
    } else if (req.user.role === 'logistique') {
      query += ` AND dv.statut IN ('en_attente_logistique', 'approuve_logistique')`;
    } else if (req.user.role === 'raf') {
      query += ` AND dv.statut IN ('en_attente_raf', 'approuve_raf')`;
    }
    
    query += ' ORDER BY dv.date_debut ASC, dv.date_demande DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération demandes voiture:', error);
    res.status(500).json({ error: error.message });
  }
});

// Affecter véhicule et chauffeur (logistique)
router.put('/demandes-voiture/:id/affecter',
  authentifier,
  verifierRole('logistique', 'admin'),
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
      
      const nouveauStatut = approuve ? 'en_attente_raf' : 'rejete_logistique';
      
      const result = await client.query(`
        UPDATE demandes_voiture
        SET 
          vehicule_id = $1,
          chauffeur_id = $2,
          statut = $3,
          verifie_par_logistique = $4,
          date_verification_logistique = CURRENT_TIMESTAMP,
          commentaire_logistique = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND statut = 'en_attente_logistique'
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
        message: approuve ? 'Véhicule et chauffeur affectés, demande envoyée au RAF' : 'Demande rejetée',
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

// Approuver par RAF et générer autorisation
router.put('/demandes-voiture/:id/approuver',
  authentifier,
  verifierRole('raf', 'admin'),
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
      
      const nouveauStatut = approuve ? 'valide' : 'rejete_raf';
      
      const result = await client.query(`
        UPDATE demandes_voiture
        SET 
          statut = $1,
          approuve_par_raf = $2,
          date_approbation_raf = CURRENT_TIMESTAMP,
          commentaire_raf = $3,
          date_autorisation = CASE WHEN $1 = 'valide' THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND statut = 'en_attente_raf'
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
        message: approuve ? 'Autorisation de sortie générée avec succès' : 'Demande rejetée',
        demande: result.rows[0],
        autorisationGeneree: approuve
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur approbation:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

module.exports = router;