// src/routes/importExcel.js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../config/database');
const fs = require('fs');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/import-excel', upload.single('fichier'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    let totalSuccess = 0, totalWarnings = 0, totalErrors = 0;

    for (const sheetName of workbook.SheetNames) {
      console.log(`Traitement feuille: "${sheetName}"`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

      // Détection immat/équipement stricte
      let immat = '';
      let equipement = filePath.includes('Groupe electrogène') ? 'GROUPE_ELECTROGENE' :
                       filePath.includes('Autres carburants') ? 'AUTRES_CARBURANTS' : null;

      for (let i = 0; i < Math.min(30, data.length); i++) {
        const row = data[i];
        const potentialImmat = row.find(cell =>
          typeof cell === 'string' && cell.trim().match(/^\d{5}\s?WWT$/i)
        );
        if (potentialImmat) {
          immat = potentialImmat.replace(/(\d+)\s?WWT/i, '$1 WWT').trim();
          break;
        }
      }
      if (!immat && equipement) immat = equipement;
      console.log(`Immat/Équipement détecté (normalisé): ${immat}`);

      // Vérifier véhicule
      let vehiculeId = null;
      if (immat) {
        const { rows } = await pool.query('SELECT id FROM vehicules WHERE immatriculation ILIKE $1', [immat]);
        vehiculeId = rows[0]?.id || null;
      }
      if (!vehiculeId) {
        console.log(`Warning: Véhicule non trouvé pour ${immat} – insertion avec null si permis`);
        totalWarnings++;
      }

      // Chercher ligne d’en-têtes (tolérance élargie)
      let headersRowIndex = -1;
      for (let i = 0; i < data.length; i++) {
        const rowStr = data[i].map(cell => (cell || '').toString().toLowerCase());
        if (rowStr.some(cell =>
          cell.includes('date') ||
          cell.includes('km') ||
          cell.includes('litre') ||
          cell.includes('litr') ||
          cell.includes('montant') ||
          cell.includes('consommation') ||
          cell.includes('plein') ||
          cell.includes('plien')
        )) {
          headersRowIndex = i;
          break;
        }
      }
      if (headersRowIndex === -1) {
        console.log(`No headers found in sheet ${sheetName}`);
        continue;
      }

      const headers = data[headersRowIndex].map(h => (h || '').toString().toLowerCase());
      const dataRows = data.slice(headersRowIndex + 1).filter(row => row.some(cell => cell != null));

      // Indices colonnes avec tolérance
      const dateCol = headers.findIndex(h => h.includes('date'));
      const litresCol = headers.findIndex(h => h.includes('litre') || h.includes('litr') || h.includes('plein'));
      const montantCol = headers.findIndex(h => h.includes('montant'));
      const kmJourCol = headers.findIndex(h => h.includes('km') && (h.includes('jour') || h.includes('journali')));
      const consoCol = headers.findIndex(h => h.includes('conso') || h.includes('moyenne'));

      if (dateCol === -1 || litresCol === -1) {
        console.log(`Missing key columns in sheet ${sheetName}`);
        continue;
      }

      for (const row of dataRows) {
        // Date
        let dateVal = dateCol >= 0 ? row[dateCol] : null;
        let date_ravitaillement = null;
        if (typeof dateVal === 'number' && dateVal > 40000) {
          const dateObj = new Date((dateVal - 25569) * 86400 * 1000);
          date_ravitaillement = dateObj.toISOString().split('T')[0];
        } else if (dateVal) {
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) date_ravitaillement = parsed.toISOString().split('T')[0];
        }
        if (!date_ravitaillement) continue;

        const quantite = litresCol >= 0 ? parseFloat(row[litresCol]) : null;
        const montant_total = montantCol >= 0 ? parseFloat(row[montantCol]) : null;
        const kilometrage = kmJourCol >= 0 ? parseInt(row[kmJourCol]) : null;
        const consommation_theorique = consoCol >= 0 ? parseFloat(row[consoCol]) :
          (kilometrage && quantite ? kilometrage / quantite : null);

        if (isNaN(quantite) || quantite <= 0) continue;

        try {
          await pool.query(`
            INSERT INTO suivis_carburant (vehicule_id, quantite, type_carburant, montant_total, kilometrage, consommation_theorique, date_ravitaillement)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [vehiculeId, quantite, 'gazole', montant_total, kilometrage, consommation_theorique, date_ravitaillement]);
          totalSuccess++;
        } catch (insertErr) {
          console.error('Insert error:', insertErr);
          totalErrors++;
        }
      }
    }

    res.json({ message: 'Import terminé', success: totalSuccess, warnings: totalWarnings, errors: totalErrors });
  } catch (error) {
    console.error('Erreur import:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
  }
});

module.exports = router;