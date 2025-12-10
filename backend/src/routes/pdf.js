// fleet-management-backend/src/routes/pdf.js
const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { authentifier } = require('../middleware/auth');

// Créer le dossier pdfs s'il n'existe pas
const pdfsDir = path.join(__dirname, '../../pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

// ============================================
// GÉNÉRATION PDF DEMANDE CARBURANT
// ============================================

async function genererDemandeCarburantPDF(demande, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(10)
         .text('CEP', 50, 50)
         .text('PRIRTEM', 50, 65);

      doc.fontSize(10)
         .text(`N° ${demande.numero_demande}`, 500, 50, { align: 'right' });

      // Titre centré
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('DEMANDE DE CARBURANT', 0, 150, { align: 'center' });

      // Cases SERVICE / MISSION
      const yPos = 200;
      const boxWidth = 15;
      const boxHeight = 15;

      doc.fontSize(12).font('Helvetica');
      
      // Case SERVICE
      doc.rect(150, yPos, boxWidth, boxHeight).stroke();
      if (demande.type_demande === 'service') {
        doc.fontSize(14).text('X', 153, yPos, { width: 10 });
      }
      doc.fontSize(12).text('SERVICE', 170, yPos + 2);

      // Case MISSION
      doc.rect(350, yPos, boxWidth, boxHeight).stroke();
      if (demande.type_demande === 'mission') {
        doc.fontSize(14).text('X', 353, yPos, { width: 10 });
      }
      doc.fontSize(12).text('MISSION', 370, yPos + 2);

      // Objet
      doc.fontSize(11)
         .text('OBJET :', 50, yPos + 50);
      doc.rect(50, yPos + 65, 500, 60).stroke();
      doc.fontSize(10)
         .text(demande.objet, 55, yPos + 75, { width: 490, align: 'left' });

      // Montant prévisionnel
      doc.fontSize(11)
         .text('Montant prévisionnel (en chiffre) :', 50, yPos + 140);
      doc.rect(300, yPos + 135, 200, 20).stroke();
      doc.fontSize(10)
         .text(`${parseFloat(demande.montant_previsionnel).toLocaleString('fr-FR')} Ar`, 305, yPos + 140);

      doc.fontSize(11)
         .text('(en lettre) :', 50, yPos + 170);
      doc.rect(120, yPos + 165, 430, 25).stroke();
      doc.fontSize(9)
         .text(demande.montant_en_lettre || '', 125, yPos + 172, { width: 420 });

      // Date
      const dateFormatee = new Date(demande.date_demande).toLocaleDateString('fr-FR');
      doc.fontSize(10)
         .text(`Date : ${dateFormatee}`, 400, yPos + 210);

      // Tableau des signatures
      const tableY = yPos + 250;
      const tableHeight = 100;
      const col1Width = 180;
      const col2Width = 180;
      const col3Width = 180;

      // En-têtes du tableau
      doc.rect(50, tableY, col1Width, 30).stroke();
      doc.rect(50 + col1Width, tableY, col2Width, 30).stroke();
      doc.rect(50 + col1Width + col2Width, tableY, col3Width, 30).stroke();

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Le Demandeur', 55, tableY + 10, { width: col1Width - 10, align: 'center' });
      doc.text('Vérifié par : A/Logistique', 55 + col1Width, tableY + 10, { width: col2Width - 10, align: 'center' });
      doc.text('Visé par : Le RAF', 55 + col1Width + col2Width, tableY + 10, { width: col3Width - 10, align: 'center' });

      // Corps du tableau
      doc.rect(50, tableY + 30, col1Width, tableHeight).stroke();
      doc.rect(50 + col1Width, tableY + 30, col2Width, tableHeight).stroke();
      doc.rect(50 + col1Width + col2Width, tableY + 30, col3Width, tableHeight).stroke();

      // Informations demandeur
      doc.fontSize(9).font('Helvetica');
      doc.text(`${demande.demandeur_nom} ${demande.demandeur_prenom}`, 55, tableY + 40, { width: col1Width - 10 });
      if (demande.service) {
        doc.fontSize(8).text(demande.service, 55, tableY + 55, { width: col1Width - 10 });
      }

      // Ajouter les informations de vérification si disponibles
      if (demande.verifie_par_logistique) {
        doc.fontSize(9).font('Helvetica');
        const dateVerif = new Date(demande.date_verification_logistique).toLocaleDateString('fr-FR');
        doc.text(`Vérifié le ${dateVerif}`, 55 + col1Width, tableY + 40, { width: col2Width - 10 });
        
        const statutLogistique = demande.statut.includes('rejete_logistique') ? 'REJETÉ' : 'APPROUVÉ';
        doc.font('Helvetica-Bold').text(statutLogistique, 55 + col1Width, tableY + 55, { width: col2Width - 10 });
        
        if (demande.commentaire_logistique) {
          doc.fontSize(8).font('Helvetica').text(demande.commentaire_logistique, 55 + col1Width, tableY + 70, { width: col2Width - 10 });
        }
      }

      if (demande.vise_par_raf) {
        doc.fontSize(9).font('Helvetica');
        const dateVisa = new Date(demande.date_visa_raf).toLocaleDateString('fr-FR');
        doc.text(`Visé le ${dateVisa}`, 55 + col1Width + col2Width, tableY + 40, { width: col3Width - 10 });
        
        const statutRAF = demande.statut === 'valide' ? 'VALIDÉ' : demande.statut.includes('rejete_raf') ? 'REJETÉ' : '';
        if (statutRAF) {
          doc.font('Helvetica-Bold').text(statutRAF, 55 + col1Width + col2Width, tableY + 55, { width: col3Width - 10 });
        }
        
        if (demande.commentaire_raf) {
          doc.fontSize(8).font('Helvetica').text(demande.commentaire_raf, 55 + col1Width + col2Width, tableY + 70, { width: col3Width - 10 });
        }
      }

      // Tampon "VALIDE" ou "REJETÉ"
      if (demande.statut === 'valide') {
        doc.fontSize(48)
           .font('Helvetica-Bold')
           .fillColor('green')
           .opacity(0.3)
           .rotate(-30, { origin: [300, 500] })
           .text('VALIDÉ', 200, 450);
      } else if (demande.statut.includes('rejete')) {
        doc.fontSize(48)
           .font('Helvetica-Bold')
           .fillColor('red')
           .opacity(0.3)
           .rotate(-30, { origin: [300, 500] })
           .text('REJETÉ', 200, 450);
      }

      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// GÉNÉRATION PDF AUTORISATION SORTIE
// ============================================

async function genererAutorisationSortiePDF(demande, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 30,
        layout: 'landscape'
      });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const pageWidth = doc.page.width;
      const midX = pageWidth / 2;

      // ========== PARTIE GAUCHE - DEMANDE ==========
      doc.fontSize(10)
         .text('CEP', 40, 40)
         .text('PRIRTEM', 40, 55)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('DEMANDE DE VOITURE', 40, 90);

      let yPos = 120;
      doc.fontSize(9).font('Helvetica');
      
      doc.text('Date proposée :', 40, yPos);
      const dateProposee = new Date(demande.date_proposee).toLocaleDateString('fr-FR');
      doc.rect(130, yPos - 3, 120, 15).stroke();
      doc.text(dateProposee, 135, yPos);

      yPos += 25;
      doc.text('Objet :', 40, yPos);
      doc.rect(40, yPos + 12, 220, 40).stroke();
      doc.fontSize(8).text(demande.objet, 45, yPos + 17, { width: 210, align: 'left' });

      yPos += 60;
      doc.fontSize(9).text('Itinéraire :', 40, yPos);
      doc.rect(40, yPos + 12, 220, 40).stroke();
      doc.fontSize(8).text(demande.itineraire || '-', 45, yPos + 17, { width: 210 });

      yPos += 60;
      doc.fontSize(9).text('Personnes transportées:', 40, yPos);
      doc.rect(40, yPos + 12, 220, 30).stroke();
      doc.fontSize(8).text(demande.personnes_transportees || '-', 45, yPos + 17, { width: 210 });

      yPos += 45;
      doc.fontSize(9).text('Heure de départ souhaitée :', 40, yPos);
      doc.rect(170, yPos - 3, 90, 15).stroke();
      doc.text(demande.heure_depart_souhaitee || '-', 175, yPos);

      yPos += 20;
      doc.text('Heure probable de retour :', 40, yPos);
      doc.rect(170, yPos - 3, 90, 15).stroke();
      doc.text(demande.heure_retour_probable || '-', 175, yPos);

      yPos += 20;
      doc.text('Immatriculation :', 40, yPos);
      doc.rect(130, yPos - 3, 130, 15).stroke();
      doc.text(demande.immatriculation || '-', 135, yPos);

      yPos += 20;
      doc.text('Chauffeur :', 40, yPos);
      doc.rect(110, yPos - 3, 150, 15).stroke();
      const chauffeur = demande.chauffeur_nom ? `${demande.chauffeur_nom} ${demande.chauffeur_prenom}` : '-';
      doc.fontSize(8).text(chauffeur, 115, yPos + 1);

      yPos += 30;
      doc.fontSize(9).text('Date :', 40, yPos);
      doc.fontSize(8).text('Le Demandeur,', 40, yPos + 15);

      // Ligne de séparation
      doc.moveTo(midX - 10, 30)
         .lineTo(midX - 10, doc.page.height - 30)
         .dash(5, { space: 5 })
         .stroke()
         .undash();

      // ========== PARTIE DROITE - AUTORISATION ==========
      const rightX = midX + 10;
      
      doc.fontSize(10)
         .text('CEP', rightX, 40)
         .text('PRIRTEM', rightX, 55)
         .text(`N° ${demande.numero_demande}`, doc.page.width - 150, 40, { align: 'right' });

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('AUTORISATION SORTIE', rightX, 90, { width: 380 })
         .text('DE VOITURE', rightX, 105, { width: 380 });

      yPos = 140;
      doc.fontSize(9).font('Helvetica');
      
      doc.text('Date:', rightX, yPos);
      doc.rect(rightX + 50, yPos - 3, 150, 15).stroke();
      doc.text(dateProposee, rightX + 55, yPos);

      yPos += 22;
      doc.text('Heure :', rightX, yPos);
      doc.rect(rightX + 50, yPos - 3, 150, 15).stroke();
      doc.text(demande.heure_depart_souhaitee || '-', rightX + 55, yPos);

      yPos += 22;
      doc.text('Immatriculation :', rightX, yPos);
      doc.rect(rightX + 90, yPos - 3, 110, 15).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(demande.immatriculation || '-', rightX + 95, yPos);

      yPos += 22;
      doc.fontSize(9).font('Helvetica').text('Chauffeur :', rightX, yPos);
      doc.rect(rightX + 60, yPos - 3, 140, 15).stroke();
      doc.fontSize(8).text(chauffeur, rightX + 65, yPos + 1);

      yPos += 22;
      doc.fontSize(9).text('Itinéraire :', rightX, yPos);
      doc.rect(rightX + 60, yPos - 3, 140, 40).stroke();
      doc.fontSize(8).text(demande.itineraire || '-', rightX + 65, yPos + 2, { width: 130 });

      // Tableau visa/approbation
      yPos += 60;
      const tableWidth = 280;
      const colWidth = tableWidth / 2;
      const tableHeight = 120;

      // En-têtes
      doc.rect(rightX, yPos, colWidth, 25).stroke();
      doc.rect(rightX + colWidth, yPos, colWidth, 25).stroke();

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Visa A/Logistique', rightX + 20, yPos + 8);
      doc.text('Approuvée par Le RAF', rightX + colWidth + 15, yPos + 8);

      // Corps
      doc.rect(rightX, yPos + 25, colWidth, tableHeight).stroke();
      doc.rect(rightX + colWidth, yPos + 25, colWidth, tableHeight).stroke();

      doc.fontSize(8).font('Helvetica');
      
      if (demande.verifie_par_logistique) {
        const dateVerif = new Date(demande.date_verification_logistique).toLocaleDateString('fr-FR');
        doc.text(`Vérifié le ${dateVerif}`, rightX + 5, yPos + 35, { width: colWidth - 10 });
        doc.text(demande.verificateur_nom || '', rightX + 5, yPos + 50, { width: colWidth - 10 });
        
        if (demande.commentaire_logistique) {
          doc.text(demande.commentaire_logistique, rightX + 5, yPos + 65, { width: colWidth - 10 });
        }
      }

      if (demande.approuve_par_raf) {
        const dateApprob = new Date(demande.date_approbation_raf).toLocaleDateString('fr-FR');
        doc.text(`Approuvé le ${dateApprob}`, rightX + colWidth + 5, yPos + 35, { width: colWidth - 10 });
        doc.text(demande.approbateur_nom || '', rightX + colWidth + 5, yPos + 50, { width: colWidth - 10 });
        
        if (demande.commentaire_raf) {
          doc.text(demande.commentaire_raf, rightX + colWidth + 5, yPos + 65, { width: colWidth - 10 });
        }
      }

      // Tampon VALIDE
      if (demande.statut === 'valide') {
        doc.fontSize(42)
           .font('Helvetica-Bold')
           .fillColor('green')
           .opacity(0.25)
           .rotate(-25, { origin: [rightX + 140, yPos + 70] })
           .text('VALIDE', rightX + 60, yPos + 40);
      }

      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// ENDPOINTS
// ============================================

// Générer PDF demande carburant
router.get('/demandes-carburant/:id/pdf', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
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
      WHERE dc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = result.rows[0];
    const fileName = `demande_carburant_${demande.numero_demande}.pdf`;
    const outputPath = path.join(pdfsDir, fileName);
    
    await genererDemandeCarburantPDF(demande, outputPath);
    
    res.download(outputPath, fileName, (err) => {
      if (err) {
        console.error('Erreur téléchargement PDF:', err);
      }
      // Optionnel: supprimer le fichier après téléchargement
      // fs.unlinkSync(outputPath);
    });
  } catch (error) {
    console.error('Erreur génération PDF carburant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Générer PDF autorisation sortie
router.get('/demandes-voiture/:id/pdf', authentifier, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
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
      WHERE dv.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    
    const demande = result.rows[0];
    const fileName = `autorisation_sortie_${demande.numero_demande}.pdf`;
    const outputPath = path.join(pdfsDir, fileName);
    
    await genererAutorisationSortiePDF(demande, outputPath);
    
    res.download(outputPath, fileName, (err) => {
      if (err) {
        console.error('Erreur téléchargement PDF:', err);
      }
    });
  } catch (error) {
    console.error('Erreur génération PDF autorisation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;