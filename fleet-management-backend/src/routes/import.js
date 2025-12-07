// fleet-management-backend/src/routes/import.js - VERSION AMÉLIORÉE
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

// Auth désactivée pour DEV
const authentifier = (req, res, next) => { 
  req.user = { id: 1, role: 'admin', email: 'admin@prirtem.mg' }; 
  next(); 
};
const verifierRole = (...roles) => (req, res, next) => next();

// Configuration Multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont autorisés'));
    }
  }
});

// ============================================
// DÉTECTION AUTOMATIQUE DU TYPE DE FEUILLE
// ============================================
function detecterTypeFeuille(data, nomFeuille) {
  const nomFeuilleNorm = nomFeuille.toLowerCase();
  const colonnes = Object.keys(data[0] || {}).map(c => c.toLowerCase());
  
  // Détection par nom de feuille
  if (nomFeuilleNorm.includes('groupe') && nomFeuilleNorm.includes('electro')) {
    return 'groupe_electrogene';
  }
  if (nomFeuilleNorm.includes('suivi') && nomFeuilleNorm.includes('carburant')) {
    return 'suivi_carburant';
  }
  if (nomFeuilleNorm.includes('autres') && nomFeuilleNorm.includes('carburant')) {
    return 'autres_carburants';
  }
  
  // Détection par colonnes spécifiques
  const hasImmatriculation = colonnes.some(c => c.includes('immat'));
  const hasKmDepart = colonnes.some(c => c.includes('km') && (c.includes('depart') || c.includes('début')));
  const hasNumeroGroupe = colonnes.some(c => (c.includes('numero') || c.includes('numéro')) && c.includes('groupe'));
  const hasHeuresFonctionnement = colonnes.some(c => c.includes('heure') && c.includes('fonction'));
  
  if (hasNumeroGroupe || hasHeuresFonctionnement) {
    return 'groupe_electrogene';
  }
  if (hasImmatriculation && hasKmDepart) {
    return 'suivi_carburant';
  }
  
  return 'suivi_carburant'; // Par défaut
}

function normaliserColonne(nom) {
  const mapping = {
    'date': 'date_operation',
    'immat': 'immatriculation',
    'immatriculation': 'immatriculation',
    'montant': 'montant',
    'prix': 'prix_unitaire',
    'prix unitaire': 'prix_unitaire',
    'litre': 'quantite_litres',
    'litres': 'quantite_litres',
    'quantite': 'quantite_litres',
    'quantité': 'quantite_litres',
    'km départ': 'km_depart',
    'km_depart': 'km_depart',
    'km de départ': 'km_depart',
    'km début': 'km_depart',
    'km arrivée': 'km_arrivee',
    'km_arrivee': 'km_arrivee',
    'km d\'arrivée': 'km_arrivee',
    'km fin': 'km_arrivee',
    'km journalier': 'km_journalier',
    'km_journalier': 'km_journalier',
    'km du jour': 'km_journalier',
    'compteur': 'compteur_actuel',
    'compteur actuel': 'compteur_actuel',
    'compteur précédent': 'compteur_precedent',
    'compteur precedent': 'compteur_precedent',
    'consommation': 'consommation_aux_100',
    'carburant': 'type_carburant',
    'type carburant': 'type_carburant',
    'marque': 'marque',
    'modele': 'modele',
    'modèle': 'modele',
    'commentaire': 'commentaire',
    'observation': 'commentaire',
    'numero groupe': 'numero_equipement',
    'numéro groupe': 'numero_equipement',
    'numero equipement': 'numero_equipement',
    'heures fonctionnement': 'heures_fonctionnement'
  };
  
  const nomNormalise = nom.toLowerCase().trim();
  return mapping[nomNormalise] || nomNormalise.replace(/\s+/g, '_');
}

function normaliserDonnees(ligneExcel, typeFichier) {
  const donneeNormalisee = {
    type_suivi: typeFichier,
    donnees_brutes: JSON.stringify(ligneExcel)
  };
  
  for (const [cle, valeur] of Object.entries(ligneExcel)) {
    if (valeur === null || valeur === undefined || valeur === '') continue;
    
    const colonneNormalisee = normaliserColonne(cle);
    
    // Conversion des dates Excel
    if (colonneNormalisee === 'date_operation') {
      if (typeof valeur === 'number') {
        const date = XLSX.SSF.parse_date_code(valeur);
        donneeNormalisee.date_operation = new Date(date.y, date.m - 1, date.d);
      } else if (valeur instanceof Date) {
        donneeNormalisee.date_operation = valeur;
      } else {
        const parsed = new Date(valeur);
        if (!isNaN(parsed)) {
          donneeNormalisee.date_operation = parsed;
        }
      }
    }
    // Conversion des nombres
    else if (['montant', 'prix_unitaire', 'quantite_litres', 'km_depart', 
              'km_arrivee', 'km_journalier', 'compteur_actuel', 'compteur_precedent',
              'heures_fonctionnement'].includes(colonneNormalisee)) {
      const nombre = parseFloat(String(valeur).replace(/[^0-9.-]/g, ''));
      if (!isNaN(nombre)) {
        donneeNormalisee[colonneNormalisee] = nombre;
      }
    }
    else {
      donneeNormalisee[colonneNormalisee] = String(valeur).trim();
    }
  }
  
  return donneeNormalisee;
}

function validerEtCalculer(donnee) {
  const erreurs = [];
  
  // Calcul km_entre_repleins
  if (donnee.compteur_actuel && donnee.compteur_precedent) {
    donnee.km_entre_repleins = donnee.compteur_actuel - donnee.compteur_precedent;
    
    if (donnee.km_entre_repleins < 0) {
      erreurs.push('KM entre repleins négatif');
    }
  }
  
  // Calcul km_arrivee si manquant
  if (!donnee.km_arrivee && donnee.km_depart && donnee.km_journalier) {
    donnee.km_arrivee = donnee.km_depart + donnee.km_journalier;
  }
  
  // Calcul de la consommation
  if (donnee.quantite_litres && donnee.km_entre_repleins && donnee.km_entre_repleins > 0) {
    donnee.consommation_aux_100 = (donnee.quantite_litres / donnee.km_entre_repleins) * 100;
  }
  
  // Détermination replein
  if (donnee.montant) {
    donnee.est_replein = donnee.montant >= 200000;
  }
  
  // Validations
  if (donnee.km_journalier && donnee.km_journalier >= 120) {
    erreurs.push('KM journalier >= 120 (limite dépassée)');
  }
  
  if (donnee.consommation_aux_100) {
    if (donnee.consommation_aux_100 < 15) {
      erreurs.push(`Consommation ${donnee.consommation_aux_100.toFixed(2)} L/100km < 15`);
    }
    if (donnee.consommation_aux_100 >= 16) {
      erreurs.push(`Consommation ${donnee.consommation_aux_100.toFixed(2)} L/100km >= 16`);
    }
  }
  
  if (!donnee.date_operation) {
    donnee.date_operation = new Date();
  }
  
  return { donnee, erreurs };
}

// ============================================
// ENDPOINT IMPORT EXCEL AMÉLIORÉ
// ============================================

router.post('/import-excel', 
  authentifier, 
  verifierRole('logistique', 'admin'),
  upload.single('fichier'), 
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: 'Aucun fichier fourni',
          message: 'Veuillez sélectionner un fichier Excel' 
        });
      }
      
      const buffer = req.file.buffer;
      const nomFichier = req.file.originalname;
      const batchId = uuidv4();
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Début import: ${nomFichier}`);
      console.log(`Batch ID: ${batchId}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Lecture du fichier Excel - TOUTES LES FEUILLES
      const workbook = XLSX.read(buffer, { 
        type: 'buffer', 
        cellDates: true,
        dateNF: 'dd/mm/yyyy'
      });
      
      console.log(`📊 Feuilles trouvées: ${workbook.SheetNames.join(', ')}\n`);
      
      await client.query('BEGIN');
      
      const resultatGlobal = {
        succes: 0,
        erreurs: 0,
        avertissements: 0,
        details: [],
        parFeuille: {}
      };
      
      // PARCOURIR TOUTES LES FEUILLES
      for (const nomFeuille of workbook.SheetNames) {
        console.log(`\n📄 Traitement de la feuille: "${nomFeuille}"`);
        
        const feuille = workbook.Sheets[nomFeuille];
        const donnees = XLSX.utils.sheet_to_json(feuille);
        
        if (donnees.length === 0) {
          console.log(`⚠️  Feuille vide, ignorée\n`);
          continue;
        }
        
        // Détection du type pour cette feuille
        const typeFichier = detecterTypeFeuille(donnees, nomFeuille);
        console.log(`🔍 Type détecté: ${typeFichier}`);
        console.log(`📊 Nombre de lignes: ${donnees.length}\n`);
        
        resultatGlobal.parFeuille[nomFeuille] = {
          type: typeFichier,
          lignes: donnees.length,
          succes: 0,
          erreurs: 0,
          avertissements: 0
        };
        
        // Traiter chaque ligne de cette feuille
        for (let i = 0; i < donnees.length; i++) {
          const ligneExcel = donnees[i];
          
          try {
            // Normalisation
            let donneeNormalisee = normaliserDonnees(ligneExcel, typeFichier);
            
            // Validation et calculs
            const { donnee, erreurs } = validerEtCalculer(donneeNormalisee);
            donneeNormalisee = donnee;
            donneeNormalisee.import_batch_id = batchId;
            donneeNormalisee.nom_feuille = nomFeuille;
            
            // Insertion en base
            const query = `
              INSERT INTO suivi_carburant (
                type_suivi, date_operation, immatriculation, numero_equipement,
                marque, modele, montant, prix_unitaire, quantite_litres,
                type_carburant, km_depart, km_arrivee, km_journalier,
                compteur_actuel, compteur_precedent, km_entre_repleins,
                consommation_aux_100, est_replein, commentaire,
                donnees_brutes, import_batch_id
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
              ) RETURNING id
            `;
            
            const values = [
              donneeNormalisee.type_suivi,
              donneeNormalisee.date_operation,
              donneeNormalisee.immatriculation || null,
              donneeNormalisee.numero_equipement || null,
              donneeNormalisee.marque || null,
              donneeNormalisee.modele || null,
              donneeNormalisee.montant || null,
              donneeNormalisee.prix_unitaire || null,
              donneeNormalisee.quantite_litres || null,
              donneeNormalisee.type_carburant || 'essence',
              donneeNormalisee.km_depart || null,
              donneeNormalisee.km_arrivee || null,
              donneeNormalisee.km_journalier || null,
              donneeNormalisee.compteur_actuel || null,
              donneeNormalisee.compteur_precedent || null,
              donneeNormalisee.km_entre_repleins || null,
              donneeNormalisee.consommation_aux_100 || null,
              donneeNormalisee.est_replein || false,
              donneeNormalisee.commentaire || null,
              donneeNormalisee.donnees_brutes,
              batchId
            ];
            
            const result = await client.query(query, values);
            
            // Créer des alertes si erreurs
            if (erreurs.length > 0) {
              for (const erreur of erreurs) {
                await client.query(`
                  INSERT INTO alertes_carburant (suivi_id, type_alerte, severite, message)
                  VALUES ($1, 'validation', 'warning', $2)
                `, [result.rows[0].id, erreur]);
              }
              resultatGlobal.avertissements++;
              resultatGlobal.parFeuille[nomFeuille].avertissements++;
              resultatGlobal.details.push({
                feuille: nomFeuille,
                ligne: i + 2,
                statut: 'warning',
                message: 'Importé avec avertissements',
                erreurs: erreurs
              });
            } else {
              resultatGlobal.succes++;
              resultatGlobal.parFeuille[nomFeuille].succes++;
            }
            
          } catch (error) {
            resultatGlobal.erreurs++;
            resultatGlobal.parFeuille[nomFeuille].erreurs++;
            resultatGlobal.details.push({
              feuille: nomFeuille,
              ligne: i + 2,
              statut: 'error',
              message: 'Erreur lors de l\'import',
              erreurs: [error.message]
            });
          }
        }
        
        console.log(`✅ Feuille "${nomFeuille}" traitée:`);
        console.log(`   - Succès: ${resultatGlobal.parFeuille[nomFeuille].succes}`);
        console.log(`   - Avertissements: ${resultatGlobal.parFeuille[nomFeuille].avertissements}`);
        console.log(`   - Erreurs: ${resultatGlobal.parFeuille[nomFeuille].erreurs}`);
      }
      
      // Enregistrer l'import global
      await client.query(`
        INSERT INTO imports_excel (batch_id, nom_fichier, type_fichier, nombre_lignes, statut, details_erreurs)
        VALUES ($1, $2, 'multi-feuilles', $3, 'termine', $4)
      `, [
        batchId, 
        nomFichier, 
        resultatGlobal.succes + resultatGlobal.erreurs + resultatGlobal.avertissements,
        JSON.stringify(resultatGlobal.parFeuille)
      ]);
      
      await client.query('COMMIT');
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Import terminé avec succès!`);
      console.log(`Total: ${resultatGlobal.succes} succès, ${resultatGlobal.avertissements} avertissements, ${resultatGlobal.erreurs} erreurs`);
      console.log(`${'='.repeat(60)}\n`);
      
      res.json({
        success: true,
        message: 'Import terminé',
        batchId,
        nomFichier,
        nombreFeuilles: workbook.SheetNames.length,
        feuilles: workbook.SheetNames,
        resultats: {
          total: resultatGlobal.succes + resultatGlobal.erreurs + resultatGlobal.avertissements,
          succes: resultatGlobal.succes,
          avertissements: resultatGlobal.avertissements,
          erreurs: resultatGlobal.erreurs
        },
        parFeuille: resultatGlobal.parFeuille,
        details: resultatGlobal.details.slice(0, 50) // Limiter les détails pour la réponse
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur import:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'import',
        error: error.message
      });
    } finally {
      client.release();
    }
});

// Autres endpoints...
router.get('/imports', authentifier, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM imports_excel
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Erreur récupération imports:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/imports/:batchId', authentifier, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const importResult = await pool.query(
      'SELECT * FROM imports_excel WHERE batch_id = $1',
      [batchId]
    );
    
    if (importResult.rows.length === 0) {
      return res.status(404).json({ error: 'Import non trouvé' });
    }
    
    const donnees = await pool.query(
      'SELECT * FROM suivi_carburant WHERE import_batch_id = $1 ORDER BY created_at',
      [batchId]
    );
    
    res.json({ 
      success: true, 
      import: importResult.rows[0],
      donnees: donnees.rows,
      count: donnees.rows.length
    });
  } catch (error) {
    console.error('Erreur récupération détails import:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;