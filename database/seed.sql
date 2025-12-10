-- ============================================
-- DONNÉES INITIALES (SEED) - PARTIE 1/2
-- Fichier: database/seed.sql
-- FLEET MANAGEMENT SYSTEM
-- ============================================

-- Nettoyage des données existantes
TRUNCATE TABLE historique_entretiens CASCADE;
TRUNCATE TABLE entretiens CASCADE;
TRUNCATE TABLE suivis_carburant CASCADE;
TRUNCATE TABLE demandes_voiture CASCADE;
TRUNCATE TABLE demandes_carburant CASCADE;
TRUNCATE TABLE affectations CASCADE;
TRUNCATE TABLE vehicules CASCADE;
TRUNCATE TABLE chauffeurs CASCADE;
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE utilisateurs CASCADE;

-- Réinitialisation des séquences
ALTER SEQUENCE utilisateurs_id_seq RESTART WITH 1;
ALTER SEQUENCE services_id_seq RESTART WITH 1;
ALTER SEQUENCE chauffeurs_id_seq RESTART WITH 1;
ALTER SEQUENCE vehicules_id_seq RESTART WITH 1;
ALTER SEQUENCE affectations_id_seq RESTART WITH 1;
ALTER SEQUENCE demandes_carburant_id_seq RESTART WITH 1;
ALTER SEQUENCE demandes_voiture_id_seq RESTART WITH 1;
ALTER SEQUENCE suivis_carburant_id_seq RESTART WITH 1;
ALTER SEQUENCE entretiens_id_seq RESTART WITH 1;
ALTER SEQUENCE historique_entretiens_id_seq RESTART WITH 1;

-- ============================================
-- UTILISATEURS
-- ============================================
-- Mot de passe: "Password123!" pour tous (haché avec bcrypt)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, actif) VALUES
('RAKOTONIANA', 'Mamynavalon', 'admin@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'admin', '+261 34 12 345 67', true),
('RANDRIA', 'Jean', 'jean.randria@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'gestionnaire', '+261 34 12 345 68', true),
('RAKOTO', 'Marie', 'marie.rakoto@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'gestionnaire', '+261 34 12 345 69', true),
('ANDRIANINA', 'Paul', 'paul.andrianina@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'chauffeur', '+261 34 12 345 70', true),
('RASOLOFO', 'Pierre', 'pierre.rasolofo@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'chauffeur', '+261 34 12 345 71', true),
('RAKOTONIRINA', 'Hery', 'hery.rakotonirina@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'chauffeur', '+261 34 12 345 72', true),
('RAZAFY', 'Miora', 'miora.razafy@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'chauffeur', '+261 34 12 345 73', true),
('RABE', 'Tantely', 'tantely.rabe@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'demandeur', '+261 34 12 345 74', true),
('RAVELOSON', 'Fidy', 'fidy.raveloson@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'demandeur', '+261 34 12 345 75', true),
('ANDRIAMAHARO', 'Lova', 'lova.andriamaharo@prirtem.mg', '$2b$10$YourHashedPasswordHere', 'demandeur', '+261 34 12 345 76', true);

-- ============================================
-- SERVICES
-- ============================================
INSERT INTO services (nom, description, responsable_id, actif) VALUES
('Direction Générale', 'Service de la direction générale', 1, true),
('Ressources Humaines', 'Gestion du personnel et recrutement', 2, true),
('Finance et Comptabilité', 'Gestion financière et comptable', 3, true),
('Logistique', 'Gestion du parc automobile et approvisionnements', 2, true),
('Informatique', 'Services informatiques et support technique', 1, true),
('Commercial', 'Relations clients et ventes', 3, true),
('Production', 'Gestion de la production', 2, true),
('Maintenance', 'Entretien des équipements', 1, true);

-- ============================================
-- CHAUFFEURS
-- ============================================
INSERT INTO chauffeurs (
    utilisateur_id, numero_permis, date_obtention_permis, date_expiration_permis,
    categories_permis, telephone, adresse, disponible, note_moyenne, date_embauche
) VALUES
(4, 'PM-2020-12345', '2020-01-15', '2030-01-15', ARRAY['B', 'C'], '+261 34 12 345 70', 
 'Lot II Y 45 Antananarivo', true, 4.8, '2020-02-01'),
 
(5, 'PM-2019-23456', '2019-03-20', '2029-03-20', ARRAY['B', 'C', 'D'], '+261 34 12 345 71',
 'Lot III K 23 Antananarivo', true, 4.5, '2019-04-01'),
 
(6, 'PM-2021-34567', '2021-06-10', '2031-06-10', ARRAY['B'], '+261 34 12 345 72',
 'Lot IV M 67 Antananarivo', true, 4.9, '2021-07-01'),
 
(7, 'PM-2018-45678', '2018-09-05', '2028-09-05', ARRAY['B', 'C'], '+261 34 12 345 73',
 'Lot V N 89 Antananarivo', true, 4.7, '2018-10-01');

-- ============================================
-- VÉHICULES
-- ============================================
INSERT INTO vehicules (
    immatriculation, marque, modele, annee, couleur, numero_chassis,
    type_carburant, capacite_reservoir, kilometrage, statut,
    date_acquisition, date_derniere_revision, prochaine_revision_km,
    prochaine_revision_date, assurance_numero, assurance_expiration,
    nombre_places, actif
) VALUES
-- Véhicules légers
('1234 TAD', 'Toyota', 'Hilux', 2022, 'Blanc', 'TOY-HILUX-2022-001', 'diesel', 80.00, 45000, 'disponible',
 '2022-01-15', '2024-10-15', 50000, '2025-04-15', 'ASS-2022-001', '2025-12-31', 5, true),

('2345 TAE', 'Mitsubishi', 'L200', 2021, 'Gris', 'MIT-L200-2021-001', 'diesel', 75.00, 62000, 'disponible',
 '2021-03-20', '2024-09-20', 65000, '2025-03-20', 'ASS-2021-002', '2025-11-30', 5, true),

('3456 TAF', 'Nissan', 'Navara', 2023, 'Bleu', 'NIS-NAV-2023-001', 'diesel', 80.00, 28000, 'disponible',
 '2023-06-10', '2024-11-10', 30000, '2025-05-10', 'ASS-2023-003', '2026-06-30', 5, true),

('4567 TAG', 'Toyota', 'Land Cruiser', 2020, 'Noir', 'TOY-LC-2020-001', 'diesel', 90.00, 85000, 'en_mission',
 '2020-09-05', '2024-08-05', 90000, '2025-02-05', 'ASS-2020-004', '2025-10-31', 7, true),

('5678 TAH', 'Isuzu', 'D-Max', 2022, 'Rouge', 'ISU-DMAX-2022-001', 'diesel', 76.00, 38000, 'disponible',
 '2022-11-12', '2024-10-12', 40000, '2025-04-12', 'ASS-2022-005', '2025-11-30', 5, true),

-- Véhicules utilitaires
('6789 TAI', 'Mercedes-Benz', 'Sprinter', 2021, 'Blanc', 'MB-SPR-2021-001', 'diesel', 100.00, 72000, 'disponible',
 '2021-02-18', '2024-09-18', 75000, '2025-03-18', 'ASS-2021-006', '2025-12-31', 12, true),

('7890 TAJ', 'Renault', 'Master', 2020, 'Gris', 'REN-MAS-2020-001', 'diesel', 105.00, 95000, 'en_entretien',
 '2020-04-22', '2024-07-22', 100000, '2025-01-22', 'ASS-2020-007', '2025-09-30', 9, true),

-- Véhicules légers urbains
('8901 TAK', 'Toyota', 'Corolla', 2023, 'Argent', 'TOY-COR-2023-001', 'essence', 50.00, 15000, 'disponible',
 '2023-08-15', '2024-11-15', 20000, '2025-08-15', 'ASS-2023-008', '2026-08-31', 5, true),

('9012 TAL', 'Honda', 'Civic', 2022, 'Bleu', 'HON-CIV-2022-001', 'essence', 47.00, 32000, 'disponible',
 '2022-05-10', '2024-10-10', 35000, '2025-05-10', 'ASS-2022-009', '2025-12-31', 5, true),

('0123 TAM', 'Hyundai', 'Tucson', 2021, 'Blanc', 'HYU-TUC-2021-001', 'essence', 62.00, 48000, 'disponible',
 '2021-07-25', '2024-09-25', 50000, '2025-01-25', 'ASS-2021-010', '2025-11-30', 5, true);

-- ============================================
-- AFFECTATIONS CHAUFFEUR-VÉHICULE
-- ============================================
INSERT INTO affectations (vehicule_id, chauffeur_id, date_debut, date_fin, actif) VALUES
(1, 1, '2024-01-01', NULL, true),  -- Paul avec Toyota Hilux
(4, 2, '2024-01-01', NULL, true),  -- Pierre avec Land Cruiser (en mission)
(3, 3, '2024-02-01', NULL, true),  -- Hery avec Nissan Navara
(5, 4, '2024-03-01', NULL, true);  -- Miora avec Isuzu D-Max

-- ============================================
-- DEMANDES CARBURANT
-- ============================================
INSERT INTO demandes_carburant (
    numero_demande, vehicule_id, chauffeur_id, demandeur_id,
    quantite_demandee, quantite_approuvee, type_carburant,
    motif, kilometrage_actuel, statut,
    date_demande, date_approbation, approuveur_id, bon_commande
) VALUES
-- Approuvées
('CARB-2024-000001', 1, 1, 8, 60.00, 60.00, 'diesel',
 'Mission vers Antsirabe', 45000, 'approuvee',
 '2024-12-01 08:00:00', '2024-12-01 09:30:00', 2, 'BC-2024-001'),

('CARB-2024-000002', 4, 2, 9, 80.00, 70.00, 'diesel',
 'Tournée inspection sites', 85000, 'approuvee',
 '2024-12-02 10:00:00', '2024-12-02 14:00:00', 2, 'BC-2024-002'),

('CARB-2024-000003', 3, 3, 10, 50.00, 50.00, 'diesel',
 'Déplacement Mahajanga', 28000, 'approuvee',
 '2024-12-03 07:30:00', '2024-12-03 11:00:00', 3, 'BC-2024-003'),

-- En attente
('CARB-2024-000004', 5, 4, 8, 65.00, NULL, 'diesel',
 'Mission transport matériel', 38000, 'en_attente',
 '2024-12-05 14:00:00', NULL, NULL, NULL),

('CARB-2024-000005', 2, NULL, 9, 75.00, NULL, 'diesel',
 'Préparation mission hebdomadaire', 62000, 'en_attente',
 '2024-12-06 09:00:00', NULL, NULL, NULL);

-- À SUIVRE DANS LA PARTIE 2...
-- ============================================
-- DONNÉES INITIALES (SEED) - PARTIE 2/2
-- Fichier: database/seed.sql (SUITE)
-- FLEET MANAGEMENT SYSTEM
-- ============================================

-- ============================================
-- SUIVIS CARBURANT
-- ============================================
INSERT INTO suivis_carburant (
    vehicule_id, demande_carburant_id, quantite, type_carburant,
    prix_unitaire, montant_total, kilometrage,
    date_ravitaillement, lieu, bon_commande, fournisseur
) VALUES
-- Novembre 2024
(1, NULL, 65.00, 'diesel', 5200.00, 338000.00, 42000,
 '2024-11-05 08:30:00', 'Station Total Analakely', 'BC-2024-N001', 'Total Madagascar'),

(4, NULL, 85.00, 'diesel', 5200.00, 442000.00, 82000,
 '2024-11-08 10:15:00', 'Station Total Analakely', 'BC-2024-N002', 'Total Madagascar'),

(3, NULL, 55.00, 'diesel', 5150.00, 283250.00, 26000,
 '2024-11-12 14:20:00', 'Station Jovenna Ankorondrano', 'BC-2024-N003', 'Jovenna'),

(2, NULL, 70.00, 'diesel', 5200.00, 364000.00, 60000,
 '2024-11-15 09:45:00', 'Station Total Analakely', 'BC-2024-N004', 'Total Madagascar'),

(5, NULL, 60.00, 'diesel', 5150.00, 309000.00, 36000,
 '2024-11-20 11:30:00', 'Station Jovenna Ankorondrano', 'BC-2024-N005', 'Jovenna'),

-- Décembre 2024
(1, 1, 60.00, 'diesel', 5300.00, 318000.00, 45000,
 '2024-12-01 15:00:00', 'Station Total Analakely', 'BC-2024-001', 'Total Madagascar'),

(4, 2, 70.00, 'diesel', 5300.00, 371000.00, 85000,
 '2024-12-02 16:30:00', 'Station Total Analakely', 'BC-2024-002', 'Total Madagascar'),

(3, 3, 50.00, 'diesel', 5250.00, 262500.00, 28000,
 '2024-12-03 13:45:00', 'Station Jovenna Ankorondrano', 'BC-2024-003', 'Jovenna');

-- ============================================
-- DEMANDES VOITURE
-- ============================================
INSERT INTO demandes_voiture (
    numero_demande, demandeur_id, service_id, vehicule_id, chauffeur_id,
    destination, motif, date_debut, date_fin, nombre_passagers,
    statut, date_demande, date_approbation, approuveur_id,
    kilometrage_depart, kilometrage_retour, carburant_utilise,
    date_depart_reel, date_retour_reel
) VALUES
-- Missions terminées
('VEH-2024-000001', 8, 1, 1, 1,
 'Antsirabe', 'Réunion avec partenaires', 
 '2024-11-15 07:00:00', '2024-11-15 18:00:00', 3,
 'terminee', '2024-11-10 10:00:00', '2024-11-11 14:00:00', 2,
 42000, 42320, 28.50,
 '2024-11-15 07:15:00', '2024-11-15 17:45:00'),

('VEH-2024-000002', 9, 2, 4, 2,
 'Mahajanga', 'Inspection sites projet', 
 '2024-11-20 06:00:00', '2024-11-22 20:00:00', 4,
 'terminee', '2024-11-12 08:00:00', '2024-11-13 10:00:00', 2,
 82000, 82850, 75.00,
 '2024-11-20 06:30:00', '2024-11-22 19:30:00'),

('VEH-2024-000003', 10, 3, 3, 3,
 'Toamasina', 'Visite clients', 
 '2024-11-25 05:00:00', '2024-11-26 21:00:00', 2,
 'terminee', '2024-11-18 09:00:00', '2024-11-19 11:00:00', 3,
 26000, 26450, 42.00,
 '2024-11-25 05:20:00', '2024-11-26 20:45:00'),

-- Mission en cours
('VEH-2024-000004', 8, 1, 4, 2,
 'Fianarantsoa', 'Formation personnel', 
 '2024-12-06 07:00:00', '2024-12-08 18:00:00', 5,
 'en_cours', '2024-12-01 10:00:00', '2024-12-02 15:00:00', 2,
 85000, NULL, NULL,
 '2024-12-06 07:30:00', NULL),

-- Missions approuvées
('VEH-2024-000005', 9, 4, 5, 4,
 'Antsiranana', 'Livraison équipements', 
 '2024-12-10 06:00:00', '2024-12-12 20:00:00', 2,
 'approuvee', '2024-12-03 08:00:00', '2024-12-04 10:00:00', 3,
 NULL, NULL, NULL, NULL, NULL),

-- Demandes en attente
('VEH-2024-000006', 10, 5, NULL, NULL,
 'Toliara', 'Mission technique', 
 '2024-12-15 07:00:00', '2024-12-17 18:00:00', 3,
 'en_attente', '2024-12-05 14:00:00', NULL, NULL,
 NULL, NULL, NULL, NULL, NULL),

('VEH-2024-000007', 8, 2, NULL, NULL,
 'Morondava', 'Audit terrain', 
 '2024-12-20 06:00:00', '2024-12-22 19:00:00', 4,
 'en_attente', '2024-12-06 09:00:00', NULL, NULL,
 NULL, NULL, NULL, NULL, NULL);

-- ============================================
-- ENTRETIENS
-- ============================================
INSERT INTO entretiens (
    vehicule_id, type_entretien, description, date_debut, date_fin,
    kilometrage, cout, garage, responsable,
    pieces_changees, prochain_entretien_km, statut
) VALUES
(1, 'vidange', 'Vidange moteur + filtre à huile', 
 '2024-10-15', '2024-10-15', 42000, 180000.00, 
 'Garage Toyota Antanimena', 'M. Rakoto', 
 ARRAY['Huile moteur', 'Filtre à huile'], 47000, 'termine'),

(4, 'revision', 'Révision complète 80000 km', 
 '2024-08-05', '2024-08-06', 82000, 850000.00, 
 'Garage Toyota Antanimena', 'M. Rakoto', 
 ARRAY['Huile moteur', 'Filtre à huile', 'Filtre à air', 'Bougies'], 
 92000, 'termine'),

(3, 'pneus', 'Changement des 4 pneus', 
 '2024-11-10', '2024-11-10', 26000, 520000.00, 
 'Ets Pneus Andraharo', 'M. Jean', 
 ARRAY['4 pneus Michelin'], NULL, 'termine'),

(7, 'reparation', 'Réparation système de freinage', 
 '2024-12-01', NULL, 95000, NULL, 
 'Garage Renault Andrefan''Ambohijatovo', 'M. Pierre', 
 ARRAY['Plaquettes de frein'], NULL, 'en_cours'),

(2, 'vidange', 'Vidange + contrôle général', 
 '2024-09-20', '2024-09-20', 60000, 195000.00, 
 'Garage Mitsubishi Ankorondrano', 'M. Hery', 
 ARRAY['Huile moteur', 'Filtre à huile', 'Filtre à air'], 65000, 'termine');

-- ============================================
-- HISTORIQUE ENTRETIENS
-- ============================================
INSERT INTO historique_entretiens (entretien_id, utilisateur_id, action, details) VALUES
(1, 2, 'CREATION', 'Entretien créé: vidange'),
(1, 2, 'CLOTURE', 'Entretien terminé le 2024-10-15'),
(2, 2, 'CREATION', 'Entretien créé: revision'),
(2, 2, 'CLOTURE', 'Entretien terminé le 2024-08-06'),
(3, 3, 'CREATION', 'Entretien créé: pneus'),
(3, 3, 'CLOTURE', 'Entretien terminé le 2024-11-10'),
(4, 2, 'CREATION', 'Entretien créé: reparation'),
(5, 2, 'CREATION', 'Entretien créé: vidange'),
(5, 2, 'CLOTURE', 'Entretien terminé le 2024-09-20');

-- ============================================
-- VÉRIFICATIONS ET STATISTIQUES
-- ============================================

-- Afficher un résumé des données insérées
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RÉSUMÉ DES DONNÉES INSÉRÉES';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Utilisateurs: % insérés', (SELECT COUNT(*) FROM utilisateurs);
    RAISE NOTICE 'Services: % insérés', (SELECT COUNT(*) FROM services);
    RAISE NOTICE 'Chauffeurs: % insérés', (SELECT COUNT(*) FROM chauffeurs);
    RAISE NOTICE 'Véhicules: % insérés', (SELECT COUNT(*) FROM vehicules);
    RAISE NOTICE 'Affectations: % insérées', (SELECT COUNT(*) FROM affectations);
    RAISE NOTICE 'Demandes carburant: % insérées', (SELECT COUNT(*) FROM demandes_carburant);
    RAISE NOTICE 'Demandes voiture: % insérées', (SELECT COUNT(*) FROM demandes_voiture);
    RAISE NOTICE 'Suivis carburant: % insérés', (SELECT COUNT(*) FROM suivis_carburant);
    RAISE NOTICE 'Entretiens: % insérés', (SELECT COUNT(*) FROM entretiens);
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 STATISTIQUES RAPIDES:';
    RAISE NOTICE '  • Véhicules disponibles: %', (SELECT COUNT(*) FROM vehicules WHERE statut = 'disponible');
    RAISE NOTICE '  • Véhicules en mission: %', (SELECT COUNT(*) FROM vehicules WHERE statut = 'en_mission');
    RAISE NOTICE '  • Chauffeurs disponibles: %', (SELECT COUNT(*) FROM chauffeurs WHERE disponible = true);
    RAISE NOTICE '  • Demandes en attente: %', (SELECT COUNT(*) FROM demandes_carburant WHERE statut = 'en_attente') + (SELECT COUNT(*) FROM demandes_voiture WHERE statut = 'en_attente');
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '👤 COMPTES DE TEST:';
    RAISE NOTICE '  Admin: admin@prirtem.mg / Password123!';
    RAISE NOTICE '  Gestionnaire: jean.randria@prirtem.mg / Password123!';
    RAISE NOTICE '  Chauffeur: paul.andrianina@prirtem.mg / Password123!';
    RAISE NOTICE '  Demandeur: tantely.rabe@prirtem.mg / Password123!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ DONNÉES SEED INSÉRÉES AVEC SUCCÈS!';
    RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- FIN DU SEED
-- ============================================