-- ============================================
-- SCHÉMA COMPLET BASE DE DONNÉES FLEET MANAGEMENT
-- ============================================

-- Suppression des tables existantes (ordre inversé des dépendances)
DROP TABLE IF EXISTS historique_entretiens CASCADE;
DROP TABLE IF EXISTS entretiens CASCADE;
DROP TABLE IF EXISTS suivis_carburant CASCADE;
DROP TABLE IF EXISTS demandes_voiture CASCADE;
DROP TABLE IF EXISTS demandes_carburant CASCADE;
DROP TABLE IF EXISTS affectations CASCADE;
DROP TABLE IF EXISTS vehicules CASCADE;
DROP TABLE IF EXISTS chauffeurs CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;

-- Suppression des types ENUM existants
DROP TYPE IF EXISTS statut_demande CASCADE;
DROP TYPE IF EXISTS statut_vehicule CASCADE;
DROP TYPE IF EXISTS role_utilisateur CASCADE;
DROP TYPE IF EXISTS type_carburant CASCADE;
DROP TYPE IF EXISTS type_entretien CASCADE;

-- ============================================
-- CRÉATION DES TYPES ENUM
-- ============================================

CREATE TYPE role_utilisateur AS ENUM ('admin', 'gestionnaire', 'chauffeur', 'demandeur');
CREATE TYPE statut_demande AS ENUM ('en_attente', 'approuvee', 'rejetee', 'en_cours', 'terminee');
CREATE TYPE statut_vehicule AS ENUM ('disponible', 'en_mission', 'en_entretien', 'hors_service');
CREATE TYPE type_carburant AS ENUM ('essence', 'diesel', 'hybride', 'electrique');
CREATE TYPE type_entretien AS ENUM ('revision', 'reparation', 'vidange', 'pneus', 'autre');

-- ============================================
-- TABLE: utilisateurs
-- ============================================
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role role_utilisateur DEFAULT 'demandeur',
    telephone VARCHAR(20),
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP,
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX idx_utilisateurs_role ON utilisateurs(role);

-- ============================================
-- TABLE: services
-- ============================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    responsable_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_nom ON services(nom);

-- ============================================
-- TABLE: chauffeurs
-- ============================================
CREATE TABLE chauffeurs (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
    numero_permis VARCHAR(50) UNIQUE NOT NULL,
    date_obtention_permis DATE NOT NULL,
    date_expiration_permis DATE NOT NULL,
    categories_permis VARCHAR(20)[] DEFAULT ARRAY['B'],
    telephone VARCHAR(20),
    adresse TEXT,
    disponible BOOLEAN DEFAULT true,
    photo_url VARCHAR(500),
    note_moyenne DECIMAL(3,2) DEFAULT 5.00,
    nombre_missions INTEGER DEFAULT 0,
    date_embauche DATE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT permis_valide CHECK (date_expiration_permis > date_obtention_permis),
    CONSTRAINT note_valide CHECK (note_moyenne >= 0 AND note_moyenne <= 5)
);

CREATE INDEX idx_chauffeurs_disponible ON chauffeurs(disponible);
CREATE INDEX idx_chauffeurs_permis ON chauffeurs(numero_permis);

-- ============================================
-- TABLE: vehicules
-- ============================================
CREATE TABLE vehicules (
    id SERIAL PRIMARY KEY,
    immatriculation VARCHAR(20) UNIQUE NOT NULL,
    marque VARCHAR(100) NOT NULL,
    modele VARCHAR(100) NOT NULL,
    annee INTEGER NOT NULL,
    couleur VARCHAR(50),
    numero_chassis VARCHAR(100) UNIQUE,
    type_carburant type_carburant NOT NULL,
    capacite_reservoir DECIMAL(6,2),
    kilometrage INTEGER DEFAULT 0,
    statut statut_vehicule DEFAULT 'disponible',
    date_acquisition DATE,
    date_derniere_revision DATE,
    prochaine_revision_km INTEGER,
    prochaine_revision_date DATE,
    assurance_numero VARCHAR(100),
    assurance_expiration DATE,
    photo_url VARCHAR(500),
    nombre_places INTEGER DEFAULT 5,
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT annee_valide CHECK (annee >= 1900 AND annee <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    CONSTRAINT kilometrage_positif CHECK (kilometrage >= 0),
    CONSTRAINT capacite_positive CHECK (capacite_reservoir > 0),
    CONSTRAINT places_valide CHECK (nombre_places > 0 AND nombre_places <= 50)
);

CREATE INDEX idx_vehicules_immatriculation ON vehicules(immatriculation);
CREATE INDEX idx_vehicules_statut ON vehicules(statut);
CREATE INDEX idx_vehicules_type_carburant ON vehicules(type_carburant);

-- ============================================
-- TABLE: affectations
-- ============================================
CREATE TABLE affectations (
    id SERIAL PRIMARY KEY,
    vehicule_id INTEGER NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin DATE,
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT dates_coherentes CHECK (date_fin IS NULL OR date_fin >= date_debut),
    CONSTRAINT affectation_unique UNIQUE (vehicule_id, chauffeur_id, date_debut)
);

CREATE INDEX idx_affectations_vehicule ON affectations(vehicule_id);
CREATE INDEX idx_affectations_chauffeur ON affectations(chauffeur_id);
CREATE INDEX idx_affectations_actif ON affectations(actif);

-- ============================================
-- TABLE: demandes_carburant
-- ============================================
CREATE TABLE demandes_carburant (
    id SERIAL PRIMARY KEY,
    numero_demande VARCHAR(50) UNIQUE NOT NULL,
    vehicule_id INTEGER NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
    chauffeur_id INTEGER REFERENCES chauffeurs(id) ON DELETE SET NULL,
    demandeur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    quantite_demandee DECIMAL(8,2) NOT NULL,
    quantite_approuvee DECIMAL(8,2),
    type_carburant type_carburant NOT NULL,
    motif TEXT NOT NULL,
    kilometrage_actuel INTEGER,
    statut statut_demande DEFAULT 'en_attente',
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_approbation TIMESTAMP,
    approuveur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    commentaire_approbation TEXT,
    date_livraison TIMESTAMP,
    bon_commande VARCHAR(100),
    
    CONSTRAINT quantite_positive CHECK (quantite_demandee > 0),
    CONSTRAINT quantite_approuvee_valide CHECK (quantite_approuvee IS NULL OR quantite_approuvee > 0)
);

CREATE INDEX idx_demandes_carburant_numero ON demandes_carburant(numero_demande);
CREATE INDEX idx_demandes_carburant_vehicule ON demandes_carburant(vehicule_id);
CREATE INDEX idx_demandes_carburant_statut ON demandes_carburant(statut);
CREATE INDEX idx_demandes_carburant_date ON demandes_carburant(date_demande);

-- ============================================
-- TABLE: demandes_voiture
-- ============================================
CREATE TABLE demandes_voiture (
    id SERIAL PRIMARY KEY,
    numero_demande VARCHAR(50) UNIQUE NOT NULL,
    demandeur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    vehicule_id INTEGER REFERENCES vehicules(id) ON DELETE SET NULL,
    chauffeur_id INTEGER REFERENCES chauffeurs(id) ON DELETE SET NULL,
    destination TEXT NOT NULL,
    motif TEXT NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP NOT NULL,
    nombre_passagers INTEGER DEFAULT 1,
    besoins_specifiques TEXT,
    statut statut_demande DEFAULT 'en_attente',
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_approbation TIMESTAMP,
    approuveur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    commentaire_approbation TEXT,
    kilometrage_depart INTEGER,
    kilometrage_retour INTEGER,
    carburant_utilise DECIMAL(8,2),
    date_depart_reel TIMESTAMP,
    date_retour_reel TIMESTAMP,
    
    CONSTRAINT dates_mission_coherentes CHECK (date_fin >= date_debut),
    CONSTRAINT passagers_valide CHECK (nombre_passagers > 0),
    CONSTRAINT kilometrage_coherent CHECK (kilometrage_retour IS NULL OR kilometrage_retour >= kilometrage_depart)
);

CREATE INDEX idx_demandes_voiture_numero ON demandes_voiture(numero_demande);
CREATE INDEX idx_demandes_voiture_demandeur ON demandes_voiture(demandeur_id);
CREATE INDEX idx_demandes_voiture_statut ON demandes_voiture(statut);
CREATE INDEX idx_demandes_voiture_date ON demandes_voiture(date_demande);
CREATE INDEX idx_demandes_voiture_vehicule ON demandes_voiture(vehicule_id);

-- ============================================
-- TABLE: suivis_carburant
-- ============================================
CREATE TABLE suivis_carburant (
    id SERIAL PRIMARY KEY,
    vehicule_id INTEGER NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
    demande_carburant_id INTEGER REFERENCES demandes_carburant(id) ON DELETE SET NULL,
    demande_voiture_id INTEGER REFERENCES demandes_voiture(id) ON DELETE SET NULL,
    quantite DECIMAL(8,2) NOT NULL,
    type_carburant type_carburant NOT NULL,
    prix_unitaire DECIMAL(10,2),
    montant_total DECIMAL(12,2),
    kilometrage INTEGER,
    consommation_theorique DECIMAL(6,2),
    date_ravitaillement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lieu VARCHAR(255),
    bon_commande VARCHAR(100),
    fournisseur VARCHAR(255),
    notes TEXT,
    
    CONSTRAINT quantite_positive CHECK (quantite > 0),
    CONSTRAINT prix_positif CHECK (prix_unitaire IS NULL OR prix_unitaire >= 0),
    CONSTRAINT montant_positif CHECK (montant_total IS NULL OR montant_total >= 0)
);

CREATE INDEX idx_suivis_carburant_vehicule ON suivis_carburant(vehicule_id);
CREATE INDEX idx_suivis_carburant_date ON suivis_carburant(date_ravitaillement);
CREATE INDEX idx_suivis_carburant_demande_carburant ON suivis_carburant(demande_carburant_id);

-- ============================================
-- TABLE: entretiens
-- ============================================
CREATE TABLE entretiens (
    id SERIAL PRIMARY KEY,
    vehicule_id INTEGER NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
    type_entretien type_entretien NOT NULL,
    description TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    kilometrage INTEGER NOT NULL,
    cout DECIMAL(12,2),
    garage VARCHAR(255),
    responsable VARCHAR(255),
    pieces_changees TEXT[],
    prochain_entretien_km INTEGER,
    prochain_entretien_date DATE,
    statut VARCHAR(50) DEFAULT 'termine',
    notes TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT dates_entretien_coherentes CHECK (date_fin IS NULL OR date_fin >= date_debut),
    CONSTRAINT cout_positif CHECK (cout IS NULL OR cout >= 0),
    CONSTRAINT kilometrage_positif CHECK (kilometrage >= 0)
);

CREATE INDEX idx_entretiens_vehicule ON entretiens(vehicule_id);
CREATE INDEX idx_entretiens_type ON entretiens(type_entretien);
CREATE INDEX idx_entretiens_date ON entretiens(date_debut);

-- ============================================
-- TABLE: historique_entretiens
-- ============================================
CREATE TABLE historique_entretiens (
    id SERIAL PRIMARY KEY,
    entretien_id INTEGER NOT NULL REFERENCES entretiens(id) ON DELETE CASCADE,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historique_entretiens_entretien ON historique_entretiens(entretien_id);
CREATE INDEX idx_historique_entretiens_date ON historique_entretiens(date_action);

-- ============================================
-- COMMENTAIRES SUR LES TABLES
-- ============================================

COMMENT ON TABLE utilisateurs IS 'Utilisateurs du système avec leurs rôles et permissions';
COMMENT ON TABLE services IS 'Services/départements de l''organisation';
COMMENT ON TABLE chauffeurs IS 'Informations détaillées sur les chauffeurs';
COMMENT ON TABLE vehicules IS 'Parc automobile avec caractéristiques techniques';
COMMENT ON TABLE affectations IS 'Affectations chauffeur-véhicule';
COMMENT ON TABLE demandes_carburant IS 'Demandes de ravitaillement en carburant';
COMMENT ON TABLE demandes_voiture IS 'Demandes d''utilisation de véhicules';
COMMENT ON TABLE suivis_carburant IS 'Historique des ravitaillements';
COMMENT ON TABLE entretiens IS 'Opérations de maintenance des véhicules';
COMMENT ON TABLE historique_entretiens IS 'Historique des modifications d''entretien';

-- ============================================
-- FIN DU SCHÉMA
-- ============================================