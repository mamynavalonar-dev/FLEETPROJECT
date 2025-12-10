-- ============================================
-- VUES POUR REQUÊTES COMPLEXES
-- Fichier: database/views.sql
-- FLEET MANAGEMENT SYSTEM
-- ============================================

-- ============================================
-- VUE: Vue complète des véhicules
-- ============================================
DROP VIEW IF EXISTS vue_vehicules_complet CASCADE;
CREATE VIEW vue_vehicules_complet AS
SELECT 
    v.id,
    v.immatriculation,
    v.marque,
    v.modele,
    v.annee,
    v.couleur,
    v.type_carburant,
    v.capacite_reservoir,
    v.kilometrage,
    v.statut,
    v.nombre_places,
    v.actif,
    
    -- Chauffeur actuel
    c.id AS chauffeur_id,
    CONCAT(u.prenom, ' ', u.nom) AS chauffeur_nom,
    c.numero_permis,
    c.telephone AS chauffeur_telephone,
    
    -- Statistiques carburant
    COUNT(DISTINCT sc.id) AS nombre_ravitaillements,
    COALESCE(SUM(sc.quantite), 0) AS total_carburant,
    COALESCE(AVG(sc.consommation_theorique), 0) AS consommation_moyenne,
    
    -- Dernière révision
    v.date_derniere_revision,
    v.prochaine_revision_km,
    v.prochaine_revision_date,
    
    -- Alertes
    CASE 
        WHEN v.prochaine_revision_date < CURRENT_DATE THEN 'REVISION_URGENTE'
        WHEN v.prochaine_revision_date < CURRENT_DATE + INTERVAL '30 days' THEN 'REVISION_BIENTOT'
        WHEN v.assurance_expiration < CURRENT_DATE THEN 'ASSURANCE_EXPIREE'
        WHEN v.assurance_expiration < CURRENT_DATE + INTERVAL '30 days' THEN 'ASSURANCE_EXPIRE_BIENTOT'
        ELSE 'OK'
    END AS alerte_maintenance

FROM vehicules v
LEFT JOIN affectations a ON v.id = a.vehicule_id AND a.actif = true
LEFT JOIN chauffeurs c ON a.chauffeur_id = c.id
LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
LEFT JOIN suivis_carburant sc ON v.id = sc.vehicule_id
GROUP BY v.id, c.id, u.id;

-- ============================================
-- VUE: Demandes carburant enrichies
-- ============================================
DROP VIEW IF EXISTS vue_demandes_carburant CASCADE;
CREATE VIEW vue_demandes_carburant AS
SELECT 
    dc.id,
    dc.numero_demande,
    dc.statut,
    dc.date_demande,
    dc.date_approbation,
    
    -- Informations demandeur
    dc.demandeur_id,
    CONCAT(u_dem.prenom, ' ', u_dem.nom) AS demandeur_nom,
    u_dem.email AS demandeur_email,
    
    -- Informations véhicule
    dc.vehicule_id,
    v.immatriculation,
    v.marque,
    v.modele,
    v.type_carburant,
    
    -- Informations chauffeur
    dc.chauffeur_id,
    CONCAT(u_ch.prenom, ' ', u_ch.nom) AS chauffeur_nom,
    ch.numero_permis,
    
    -- Quantités
    dc.quantite_demandee,
    dc.quantite_approuvee,
    dc.kilometrage_actuel,
    
    -- Approbation
    dc.approuveur_id,
    CONCAT(u_app.prenom, ' ', u_app.nom) AS approuveur_nom,
    dc.commentaire_approbation,
    
    -- Motif
    dc.motif,
    dc.bon_commande,
    dc.date_livraison,
    
    -- Calculs
    EXTRACT(DAY FROM (COALESCE(dc.date_approbation, CURRENT_TIMESTAMP) - dc.date_demande)) AS jours_traitement

FROM demandes_carburant dc
JOIN utilisateurs u_dem ON dc.demandeur_id = u_dem.id
JOIN vehicules v ON dc.vehicule_id = v.id
LEFT JOIN chauffeurs ch ON dc.chauffeur_id = ch.id
LEFT JOIN utilisateurs u_ch ON ch.utilisateur_id = u_ch.id
LEFT JOIN utilisateurs u_app ON dc.approuveur_id = u_app.id;

-- ============================================
-- VUE: Demandes voiture enrichies
-- ============================================
DROP VIEW IF EXISTS vue_demandes_voiture CASCADE;
CREATE VIEW vue_demandes_voiture AS
SELECT 
    dv.id,
    dv.numero_demande,
    dv.statut,
    dv.date_demande,
    dv.date_approbation,
    
    -- Informations demandeur
    dv.demandeur_id,
    CONCAT(u_dem.prenom, ' ', u_dem.nom) AS demandeur_nom,
    u_dem.email AS demandeur_email,
    s.nom AS service_nom,
    
    -- Informations mission
    dv.destination,
    dv.motif,
    dv.date_debut,
    dv.date_fin,
    dv.nombre_passagers,
    dv.besoins_specifiques,
    
    -- Informations véhicule
    dv.vehicule_id,
    v.immatriculation,
    v.marque,
    v.modele,
    
    -- Informations chauffeur
    dv.chauffeur_id,
    CONCAT(u_ch.prenom, ' ', u_ch.nom) AS chauffeur_nom,
    ch.telephone AS chauffeur_telephone,
    
    -- Kilométrage et carburant
    dv.kilometrage_depart,
    dv.kilometrage_retour,
    dv.carburant_utilise,
    CASE 
        WHEN dv.kilometrage_retour IS NOT NULL AND dv.kilometrage_depart IS NOT NULL 
        THEN dv.kilometrage_retour - dv.kilometrage_depart
        ELSE NULL
    END AS distance_parcourue,
    
    -- Dates réelles
    dv.date_depart_reel,
    dv.date_retour_reel,
    
    -- Approbation
    dv.approuveur_id,
    CONCAT(u_app.prenom, ' ', u_app.nom) AS approuveur_nom,
    dv.commentaire_approbation,
    
    -- Durée
    EXTRACT(DAY FROM (dv.date_fin - dv.date_debut)) AS duree_jours,
    EXTRACT(HOUR FROM (dv.date_fin - dv.date_debut)) AS duree_heures

FROM demandes_voiture dv
JOIN utilisateurs u_dem ON dv.demandeur_id = u_dem.id
LEFT JOIN services s ON dv.service_id = s.id
LEFT JOIN vehicules v ON dv.vehicule_id = v.id
LEFT JOIN chauffeurs ch ON dv.chauffeur_id = ch.id
LEFT JOIN utilisateurs u_ch ON ch.utilisateur_id = u_ch.id
LEFT JOIN utilisateurs u_app ON dv.approuveur_id = u_app.id;

-- ============================================
-- VUE: Statistiques véhicules
-- ============================================
DROP VIEW IF EXISTS vue_stats_vehicules CASCADE;
CREATE VIEW vue_stats_vehicules AS
SELECT 
    v.id AS vehicule_id,
    v.immatriculation,
    v.marque,
    v.modele,
    
    -- Missions
    COUNT(DISTINCT dv.id) AS nombre_missions,
    COUNT(DISTINCT CASE WHEN dv.statut = 'terminee' THEN dv.id END) AS missions_terminees,
    COALESCE(SUM(CASE WHEN dv.statut = 'terminee' 
        THEN dv.kilometrage_retour - dv.kilometrage_depart END), 0) AS total_km_parcourus,
    
    -- Carburant
    COUNT(DISTINCT sc.id) AS nombre_ravitaillements,
    COALESCE(SUM(sc.quantite), 0) AS total_carburant_litres,
    COALESCE(SUM(sc.montant_total), 0) AS total_cout_carburant,
    COALESCE(AVG(sc.consommation_theorique), 0) AS consommation_moyenne,
    
    -- Entretiens
    COUNT(DISTINCT e.id) AS nombre_entretiens,
    COALESCE(SUM(e.cout), 0) AS total_cout_entretiens,
    MAX(e.date_fin) AS dernier_entretien,
    
    -- Disponibilité (derniers 30 jours)
    COALESCE(SUM(EXTRACT(EPOCH FROM (
        LEAST(dv.date_fin, CURRENT_TIMESTAMP) - 
        GREATEST(dv.date_debut, CURRENT_TIMESTAMP - INTERVAL '30 days')
    )) / 3600), 0) AS heures_utilisation_30j,
    
    -- Coût total
    COALESCE(SUM(sc.montant_total), 0) + COALESCE(SUM(e.cout), 0) AS cout_total

FROM vehicules v
LEFT JOIN demandes_voiture dv ON v.id = dv.vehicule_id
LEFT JOIN suivis_carburant sc ON v.id = sc.vehicule_id
LEFT JOIN entretiens e ON v.id = e.vehicule_id
GROUP BY v.id, v.immatriculation, v.marque, v.modele;

-- ============================================
-- VUE: Statistiques chauffeurs
-- ============================================
DROP VIEW IF EXISTS vue_stats_chauffeurs CASCADE;
CREATE VIEW vue_stats_chauffeurs AS
SELECT 
    c.id AS chauffeur_id,
    CONCAT(u.prenom, ' ', u.nom) AS nom_complet,
    c.numero_permis,
    c.disponible,
    c.note_moyenne,
    
    -- Missions
    c.nombre_missions,
    COUNT(DISTINCT CASE WHEN dv.statut = 'en_cours' THEN dv.id END) AS missions_en_cours,
    COUNT(DISTINCT CASE WHEN dv.statut = 'terminee' THEN dv.id END) AS missions_terminees,
    
    -- Kilométrage
    COALESCE(SUM(CASE WHEN dv.statut = 'terminee' 
        THEN dv.kilometrage_retour - dv.kilometrage_depart END), 0) AS km_parcourus,
    
    -- Carburant consommé
    COALESCE(SUM(dv.carburant_utilise), 0) AS carburant_total_litres,
    
    -- Dates
    MAX(dv.date_retour_reel) AS derniere_mission,
    MIN(dv.date_depart_reel) AS premiere_mission,
    
    -- Véhicule actuel
    v.immatriculation AS vehicule_actuel,
    v.marque AS vehicule_marque,
    v.modele AS vehicule_modele

FROM chauffeurs c
JOIN utilisateurs u ON c.utilisateur_id = u.id
LEFT JOIN demandes_voiture dv ON c.id = dv.chauffeur_id
LEFT JOIN affectations a ON c.id = a.chauffeur_id AND a.actif = true
LEFT JOIN vehicules v ON a.vehicule_id = v.id
GROUP BY c.id, u.id, v.id;

-- ============================================
-- VUE: Consommation carburant mensuelle
-- ============================================
DROP VIEW IF EXISTS vue_consommation_mensuelle CASCADE;
CREATE VIEW vue_consommation_mensuelle AS
SELECT 
    TO_CHAR(sc.date_ravitaillement, 'YYYY-MM') AS mois,
    EXTRACT(YEAR FROM sc.date_ravitaillement) AS annee,
    EXTRACT(MONTH FROM sc.date_ravitaillement) AS numero_mois,
    
    v.id AS vehicule_id,
    v.immatriculation,
    v.marque,
    v.modele,
    v.type_carburant,
    
    COUNT(*) AS nombre_ravitaillements,
    SUM(sc.quantite) AS quantite_totale,
    AVG(sc.prix_unitaire) AS prix_moyen,
    SUM(sc.montant_total) AS montant_total,
    AVG(sc.consommation_theorique) AS consommation_moyenne

FROM suivis_carburant sc
JOIN vehicules v ON sc.vehicule_id = v.id
WHERE sc.date_ravitaillement >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY 
    TO_CHAR(sc.date_ravitaillement, 'YYYY-MM'),
    EXTRACT(YEAR FROM sc.date_ravitaillement),
    EXTRACT(MONTH FROM sc.date_ravitaillement),
    v.id, v.immatriculation, v.marque, v.modele, v.type_carburant
ORDER BY annee DESC, numero_mois DESC;

-- ============================================
-- VUE: Alertes et notifications
-- ============================================
DROP VIEW IF EXISTS vue_alertes CASCADE;
CREATE VIEW vue_alertes AS
SELECT 
    'REVISION_URGENTE' AS type_alerte,
    'Révision urgente requise' AS message,
    v.id AS vehicule_id,
    v.immatriculation,
    v.prochaine_revision_date AS date_limite,
    'critique' AS priorite
FROM vehicules v
WHERE v.prochaine_revision_date < CURRENT_DATE
  AND v.actif = true

UNION ALL

SELECT 
    'REVISION_PROCHE' AS type_alerte,
    'Révision à planifier' AS message,
    v.id AS vehicule_id,
    v.immatriculation,
    v.prochaine_revision_date AS date_limite,
    'haute' AS priorite
FROM vehicules v
WHERE v.prochaine_revision_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND v.actif = true

UNION ALL

SELECT 
    'ASSURANCE_EXPIREE' AS type_alerte,
    'Assurance expirée' AS message,
    v.id AS vehicule_id,
    v.immatriculation,
    v.assurance_expiration AS date_limite,
    'critique' AS priorite
FROM vehicules v
WHERE v.assurance_expiration < CURRENT_DATE
  AND v.actif = true

UNION ALL

SELECT 
    'ASSURANCE_EXPIRE_BIENTOT' AS type_alerte,
    'Assurance expire bientôt' AS message,
    v.id AS vehicule_id,
    v.immatriculation,
    v.assurance_expiration AS date_limite,
    'haute' AS priorite
FROM vehicules v
WHERE v.assurance_expiration BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND v.actif = true

UNION ALL

SELECT 
    'PERMIS_EXPIRE' AS type_alerte,
    'Permis de conduire expiré' AS message,
    c.id AS chauffeur_id,
    CONCAT(u.prenom, ' ', u.nom) AS nom,
    c.date_expiration_permis AS date_limite,
    'critique' AS priorite
FROM chauffeurs c
JOIN utilisateurs u ON c.utilisateur_id = u.id
WHERE c.date_expiration_permis < CURRENT_DATE

UNION ALL

SELECT 
    'PERMIS_EXPIRE_BIENTOT' AS type_alerte,
    'Permis expire bientôt' AS message,
    c.id AS chauffeur_id,
    CONCAT(u.prenom, ' ', u.nom) AS nom,
    c.date_expiration_permis AS date_limite,
    'moyenne' AS priorite
FROM chauffeurs c
JOIN utilisateurs u ON c.utilisateur_id = u.id
WHERE c.date_expiration_permis BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days';

-- ============================================
-- VUE: Dashboard statistiques globales
-- ============================================
DROP VIEW IF EXISTS vue_dashboard_stats CASCADE;
CREATE VIEW vue_dashboard_stats AS
SELECT 
    -- Véhicules
    (SELECT COUNT(*) FROM vehicules WHERE actif = true) AS total_vehicules,
    (SELECT COUNT(*) FROM vehicules WHERE statut = 'disponible') AS vehicules_disponibles,
    (SELECT COUNT(*) FROM vehicules WHERE statut = 'en_mission') AS vehicules_en_mission,
    (SELECT COUNT(*) FROM vehicules WHERE statut = 'en_entretien') AS vehicules_en_entretien,
    
    -- Chauffeurs
    (SELECT COUNT(*) FROM chauffeurs WHERE disponible = true) AS chauffeurs_disponibles,
    (SELECT COUNT(*) FROM chauffeurs) AS total_chauffeurs,
    
    -- Demandes en attente
    (SELECT COUNT(*) FROM demandes_carburant WHERE statut = 'en_attente') AS demandes_carburant_attente,
    (SELECT COUNT(*) FROM demandes_voiture WHERE statut = 'en_attente') AS demandes_voiture_attente,
    
    -- Missions du mois
    (SELECT COUNT(*) FROM demandes_voiture 
     WHERE EXTRACT(MONTH FROM date_debut) = EXTRACT(MONTH FROM CURRENT_DATE)
     AND EXTRACT(YEAR FROM date_debut) = EXTRACT(YEAR FROM CURRENT_DATE)) AS missions_mois,
    
    -- Carburant du mois
    (SELECT COALESCE(SUM(quantite), 0) FROM suivis_carburant
     WHERE EXTRACT(MONTH FROM date_ravitaillement) = EXTRACT(MONTH FROM CURRENT_DATE)
     AND EXTRACT(YEAR FROM date_ravitaillement) = EXTRACT(YEAR FROM CURRENT_DATE)) AS carburant_mois_litres,
    
    (SELECT COALESCE(SUM(montant_total), 0) FROM suivis_carburant
     WHERE EXTRACT(MONTH FROM date_ravitaillement) = EXTRACT(MONTH FROM CURRENT_DATE)
     AND EXTRACT(YEAR FROM date_ravitaillement) = EXTRACT(YEAR FROM CURRENT_DATE)) AS carburant_mois_cout,
    
    -- Alertes
    (SELECT COUNT(*) FROM vue_alertes WHERE priorite = 'critique') AS alertes_critiques,
    (SELECT COUNT(*) FROM vue_alertes WHERE priorite = 'haute') AS alertes_importantes;

-- ============================================
-- AFFICHAGE RÉSUMÉ
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VUES CRÉÉES AVEC SUCCÈS';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Vues disponibles:';
    RAISE NOTICE '  ✓ vue_vehicules_complet';
    RAISE NOTICE '  ✓ vue_demandes_carburant';
    RAISE NOTICE '  ✓ vue_demandes_voiture';
    RAISE NOTICE '  ✓ vue_stats_vehicules';
    RAISE NOTICE '  ✓ vue_stats_chauffeurs';
    RAISE NOTICE '  ✓ vue_consommation_mensuelle';
    RAISE NOTICE '  ✓ vue_alertes';
    RAISE NOTICE '  ✓ vue_dashboard_stats';
    RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- FIN DES VUES
-- ============================================