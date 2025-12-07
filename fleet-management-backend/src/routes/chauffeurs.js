// fleet-management-backend/src/routes/chauffeurs.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcrypt');
// Auth désactivée pour DEV
const authentifier = (req, res, next) => { 
  req.user = { id: 1, role: 'admin', email: 'admin@prirtem.mg' }; 
  next(); 
};
const verifierRole = (...roles) => (req, res, next) => next();

// ============================================
// GESTION DES CHAUFFEURS
// ============================================

// Récupérer tous les chauffeurs
router.get('/chauffeurs', authentifier, async (req, res) => {
  try {
    const { statut } = req.query;
    
    let query = `
      SELECT 
        c.*,
        u.nom,
        u.prenom,
        u.email,
        u.telephone,
        u.est_actif,
        COUNT(DISTINCT m.id) as nombre_missions,
        SUM(m.km_parcourus) as total_km_parcourus
      FROM chauffeurs c
      JOIN utilisateurs u ON c.utilisateur_id = u.id
      LEFT JOIN missions m ON c.id = m.chauffeur_id AND m.statut = 'terminee'
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (statut) {
      query += ` AND c.statut = $${paramCount++}`;
      params.push(statut);
    }
    
    query += ` GROUP BY c.id, u.nom, u.prenom, u.email, u.telephone, u.est_actif
               ORDER BY u.nom, u.prenom`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération chauffeurs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer un chauffeur spécifique
router.get('/chauffeurs/:id', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        u.nom,
        u.prenom,
        u.email,
        u.telephone,
        u.service,
        u.actif as est_actif,
        COUNT(DISTINCT m.id) as nombre_missions,
        SUM(m.kilometrage_retour - m.kilometrage_depart) as total_km_parcourus,
        AVG(m.kilometrage_retour - m.kilometrage_depart) as moyenne_km_mission
      FROM chauffeurs c
      JOIN utilisateurs u ON c.utilisateur_id = u.id
      LEFT JOIN demandes_voiture m ON c.id = m.chauffeur_id AND m.statut = 'terminee'
      WHERE c.id = $1
      GROUP BY c.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.actif
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chauffeur non trouvé' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération chauffeur:', error);
    res.status(500).json({ error: error.message });
  }
});

// Créer un nouveau chauffeur
router.post('/chauffeurs', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        nom, prenom, email, telephone,
        numero_permis, type_permis, date_expiration_permis,
        photo_url
      } = req.body;
      
      // Validation
      if (!nom || !prenom || !email || !numero_permis || !type_permis || !date_expiration_permis) {
        return res.status(400).json({ 
          error: 'Champs requis manquants',
          required: ['nom', 'prenom', 'email', 'numero_permis', 'type_permis', 'date_expiration_permis']
        });
      }
      
      // Vérifier si l'email existe déjà
      const emailExists = await client.query(
        'SELECT id FROM utilisateurs WHERE email = $1',
        [email]
      );
      
      if (emailExists.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Cet email est déjà utilisé' 
        });
      }
      
      // Vérifier si le numéro de permis existe déjà
      const permisExists = await client.query(
        'SELECT id FROM chauffeurs WHERE numero_permis = $1',
        [numero_permis]
      );
      
      if (permisExists.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Ce numéro de permis est déjà enregistré' 
        });
      }
      
      await client.query('BEGIN');
      
      // Générer un mot de passe temporaire
      const motDePasseTemp = `chauffeur${Math.random().toString(36).slice(-8)}`;
      const hashedPassword = await bcrypt.hash(motDePasseTemp, 10);
      
      // Créer l'utilisateur
      const userResult = await client.query(`
        INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, service)
        VALUES ($1, $2, $3, $4, 'chauffeur', $5, 'Logistique')
        RETURNING id
      `, [nom, prenom, email, hashedPassword, telephone || null]);
      
      // Créer le chauffeur
      const chauffeurResult = await client.query(`
        INSERT INTO chauffeurs (
          utilisateur_id, numero_permis, type_permis, 
          date_expiration_permis, photo_url, statut
        ) VALUES ($1, $2, $3, $4, $5, 'disponible')
        RETURNING *
      `, [userResult.rows[0].id, numero_permis, type_permis, 
          date_expiration_permis, photo_url || null]);
      
      await client.query('COMMIT');
      
      res.status(201).json({ 
        success: true, 
        message: 'Chauffeur créé avec succès',
        chauffeur: chauffeurResult.rows[0],
        motDePasseTemporaire: motDePasseTemp,
        info: 'Le chauffeur doit changer ce mot de passe à la première connexion'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur création chauffeur:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

// Modifier un chauffeur
router.put('/chauffeurs/:id', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await client.query('BEGIN');
      
      // Champs du chauffeur
      const champsChauffeur = ['numero_permis', 'type_permis', 'date_expiration_permis', 
                               'photo_url', 'statut', 'note_evaluation'];
      const setChauffeur = [];
      const valuesChauffeur = [];
      let paramCount = 1;
      
      Object.keys(updates).forEach(key => {
        if (champsChauffeur.includes(key)) {
          setChauffeur.push(`${key} = $${paramCount++}`);
          valuesChauffeur.push(updates[key]);
        }
      });
      
      if (setChauffeur.length > 0) {
        valuesChauffeur.push(id);
        await client.query(`
          UPDATE chauffeurs 
          SET ${setChauffeur.join(', ')}
          WHERE id = $${paramCount}
        `, valuesChauffeur);
      }
      
      // Champs de l'utilisateur
      const champsUtilisateur = ['nom', 'prenom', 'email', 'telephone'];
      const setUtilisateur = [];
      const valuesUtilisateur = [];
      paramCount = 1;
      
      Object.keys(updates).forEach(key => {
        if (champsUtilisateur.includes(key)) {
          setUtilisateur.push(`${key} = $${paramCount++}`);
          valuesUtilisateur.push(updates[key]);
        }
      });
      
      if (setUtilisateur.length > 0) {
        valuesUtilisateur.push(id);
        await client.query(`
          UPDATE utilisateurs 
          SET ${setUtilisateur.join(', ')}
          WHERE id = (SELECT utilisateur_id FROM chauffeurs WHERE id = $${paramCount})
        `, valuesUtilisateur);
      }
      
      // Récupérer le chauffeur mis à jour
      const result = await client.query(`
        SELECT 
          c.*,
          u.nom,
          u.prenom,
          u.email,
          u.telephone
        FROM chauffeurs c
        JOIN utilisateurs u ON c.utilisateur_id = u.id
        WHERE c.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Chauffeur non trouvé' });
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Chauffeur modifié avec succès',
        chauffeur: result.rows[0] 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur modification chauffeur:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

// Désactiver un chauffeur
router.put('/chauffeurs/:id/desactiver', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      
      await client.query('BEGIN');
      
      // Vérifier s'il y a des missions en cours
      const missionsEnCours = await client.query(
        'SELECT id FROM missions WHERE chauffeur_id = $1 AND statut = $2',
        [id, 'en_cours']
      );
      
      if (missionsEnCours.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Impossible de désactiver un chauffeur avec des missions en cours' 
        });
      }
      
      // Désactiver le chauffeur
      await client.query(
        'UPDATE chauffeurs SET statut = $1 WHERE id = $2',
        ['indisponible', id]
      );
      
      // Désactiver l'utilisateur
      await client.query(
        'UPDATE utilisateurs SET actif = false WHERE id = (SELECT utilisateur_id FROM chauffeurs WHERE id = $1)',
        [id]
      );
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Chauffeur désactivé avec succès' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur désactivation chauffeur:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
});

// ============================================
// MISSIONS DU CHAUFFEUR
// ============================================

// Récupérer les missions d'un chauffeur
router.get('/chauffeurs/:id/missions', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, date_debut, date_fin } = req.query;
    
    let query = `
      SELECT 
        m.*,
        v.immatriculation,
        v.marque,
        v.modele,
        dv.objet,
        dv.itineraire,
        u.nom as demandeur_nom,
        u.prenom as demandeur_prenom
      FROM missions m
      JOIN vehicules v ON m.vehicule_id = v.id
      LEFT JOIN demandes_voiture dv ON m.demande_voiture_id = dv.id
      LEFT JOIN utilisateurs u ON dv.demandeur_id = u.id
      WHERE m.chauffeur_id = $1
    `;
    
    const params = [id];
    let paramCount = 2;
    
    if (statut) {
      query += ` AND m.statut = $${paramCount++}`;
      params.push(statut);
    }
    
    if (date_debut) {
      query += ` AND m.date_debut >= $${paramCount++}`;
      params.push(date_debut);
    }
    
    if (date_fin) {
      query += ` AND m.date_debut <= $${paramCount++}`;
      params.push(date_fin);
    }
    
    query += ' ORDER BY m.date_debut DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération missions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DASHBOARDS
// ============================================

// Dashboard chauffeurs
router.get('/dashboard/chauffeurs', authentifier, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dashboard_chauffeurs');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur dashboard chauffeurs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chauffeurs disponibles pour une date
router.get('/chauffeurs/disponibles/:date', 
  authentifier, 
  verifierRole('logistique', 'admin'), 
  async (req, res) => {
    try {
      const { date } = req.params;
      
      const result = await pool.query(`
        SELECT 
          c.id,
          u.nom,
          u.prenom,
          c.numero_permis,
          c.type_permis,
          c.note_evaluation
        FROM chauffeurs c
        JOIN utilisateurs u ON c.utilisateur_id = u.id
        WHERE c.statut = 'disponible'
        AND c.id NOT IN (
          SELECT DISTINCT chauffeur_id 
          FROM demandes_voiture 
          WHERE date_proposee = $1 
          AND statut IN ('valide', 'en_cours')
        )
        ORDER BY c.note_evaluation DESC NULLS LAST, u.nom
      `, [date]);
      
      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Erreur chauffeurs disponibles:', error);
      res.status(500).json({ error: error.message });
    }
});

module.exports = router;