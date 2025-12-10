-- ============================================
-- TRIGGERS ET FONCTIONS AUTOMATIQUES
-- Fichier: database/triggers.sql
-- FLEET MANAGEMENT SYSTEM
-- ============================================

-- ============================================
-- FONCTION: Générer numéro de demande unique
-- ============================================
CREATE OR REPLACE FUNCTION generer_numero_demande(prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    nouveau_numero VARCHAR;
    compteur INTEGER;
    annee VARCHAR;
BEGIN
    annee := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COUNT(*) + 1 INTO compteur
    FROM (
        SELECT numero_demande FROM demandes_carburant WHERE numero_demande LIKE prefix || annee || '%'
        UNION ALL
        SELECT numero_demande FROM demandes_voiture WHERE numero_demande LIKE prefix || annee || '%'
    ) AS demandes;
    
    nouveau_numero := prefix || annee || LPAD(compteur::TEXT, 6, '0');
    RETURN nouveau_numero;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-génération numéro demande carburant
-- ============================================
CREATE OR REPLACE FUNCTION trigger_numero_demande_carburant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_demande IS NULL OR NEW.numero_demande = '' THEN
        NEW.numero_demande := generer_numero_demande('CARB-');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_numero_demande_carburant ON demandes_carburant;
CREATE TRIGGER auto_numero_demande_carburant
    BEFORE INSERT ON demandes_carburant
    FOR EACH ROW
    EXECUTE FUNCTION trigger_numero_demande_carburant();

-- ============================================
-- TRIGGER: Auto-génération numéro demande voiture
-- ============================================
CREATE OR REPLACE FUNCTION trigger_numero_demande_voiture()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_demande IS NULL OR NEW.numero_demande = '' THEN
        NEW.numero_demande := generer_numero_demande('VEH-');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_numero_demande_voiture ON demandes_voiture;
CREATE TRIGGER auto_numero_demande_voiture
    BEFORE INSERT ON demandes_voiture
    FOR EACH ROW
    EXECUTE FUNCTION trigger_numero_demande_voiture();

-- ============================================
-- TRIGGER: Mise à jour statut véhicule lors d'affectation
-- ============================================
CREATE OR REPLACE FUNCTION trigger_statut_vehicule_affectation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.actif = true) THEN
        UPDATE vehicules 
        SET statut = 'en_mission'
        WHERE id = NEW.vehicule_id AND statut = 'disponible';
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.actif = false) THEN
        UPDATE vehicules 
        SET statut = 'disponible'
        WHERE id = COALESCE(NEW.vehicule_id, OLD.vehicule_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_statut_vehicule_affectation ON affectations;
CREATE TRIGGER update_statut_vehicule_affectation
    AFTER INSERT OR UPDATE OR DELETE ON affectations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_statut_vehicule_affectation();

-- ============================================
-- TRIGGER: Calcul consommation carburant
-- ============================================
CREATE OR REPLACE FUNCTION trigger_calcul_consommation()
RETURNS TRIGGER AS $$
DECLARE
    km_precedent INTEGER;
    distance INTEGER;
BEGIN
    IF NEW.kilometrage IS NOT NULL THEN
        SELECT kilometrage INTO km_precedent
        FROM suivis_carburant
        WHERE vehicule_id = NEW.vehicule_id 
        AND id < NEW.id
        AND kilometrage IS NOT NULL
        ORDER BY date_ravitaillement DESC
        LIMIT 1;
        
        IF km_precedent IS NOT NULL AND km_precedent > 0 THEN
            distance := NEW.kilometrage - km_precedent;
            IF distance > 0 AND NEW.quantite > 0 THEN
                NEW.consommation_theorique := (NEW.quantite / distance) * 100;
            END IF;
        END IF;
    END IF;
    
    IF NEW.prix_unitaire IS NOT NULL AND NEW.quantite IS NOT NULL THEN
        NEW.montant_total := NEW.prix_unitaire * NEW.quantite;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calcul_consommation ON suivis_carburant;
CREATE TRIGGER calcul_consommation
    BEFORE INSERT OR UPDATE ON suivis_carburant
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calcul_consommation();

-- ============================================
-- TRIGGER: Mise à jour kilométrage véhicule
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_kilometrage_vehicule()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kilometrage IS NOT NULL THEN
        UPDATE vehicules 
        SET kilometrage = GREATEST(kilometrage, NEW.kilometrage)
        WHERE id = NEW.vehicule_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kilometrage_vehicule ON suivis_carburant;
CREATE TRIGGER update_kilometrage_vehicule
    AFTER INSERT OR UPDATE ON suivis_carburant
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_kilometrage_vehicule();

-- ============================================
-- TRIGGER: Validation permis chauffeur
-- ============================================
CREATE OR REPLACE FUNCTION trigger_validation_permis()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_expiration_permis < CURRENT_DATE THEN
        NEW.disponible := false;
        RAISE NOTICE 'Permis expiré pour le chauffeur %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validation_permis_chauffeur ON chauffeurs;
CREATE TRIGGER validation_permis_chauffeur
    BEFORE INSERT OR UPDATE ON chauffeurs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validation_permis();

-- ============================================
-- TRIGGER: Historique changements entretien
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_entretien()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historique_entretiens (entretien_id, action, details)
        VALUES (NEW.id, 'CREATION', 'Entretien créé: ' || NEW.type_entretien);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.statut != NEW.statut THEN
            INSERT INTO historique_entretiens (entretien_id, action, details)
            VALUES (NEW.id, 'CHANGEMENT_STATUT', 
                    'Statut modifié: ' || OLD.statut || ' → ' || NEW.statut);
        END IF;
        
        IF OLD.date_fin IS NULL AND NEW.date_fin IS NOT NULL THEN
            INSERT INTO historique_entretiens (entretien_id, action, details)
            VALUES (NEW.id, 'CLOTURE', 'Entretien terminé le ' || NEW.date_fin);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_historique_entretien ON entretiens;
CREATE TRIGGER log_historique_entretien
    AFTER INSERT OR UPDATE ON entretiens
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_entretien();

-- ============================================
-- TRIGGER: Mise à jour dernière connexion
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_derniere_connexion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.derniere_connexion := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_derniere_connexion ON utilisateurs;
CREATE TRIGGER update_derniere_connexion
    BEFORE UPDATE ON utilisateurs
    FOR EACH ROW
    WHEN (OLD.derniere_connexion IS DISTINCT FROM NEW.derniere_connexion)
    EXECUTE FUNCTION trigger_update_derniere_connexion();

-- ============================================
-- TRIGGER: Validation dates demande voiture
-- ============================================
CREATE OR REPLACE FUNCTION trigger_validation_demande_voiture()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_debut < CURRENT_TIMESTAMP - INTERVAL '1 day' THEN
        RAISE EXCEPTION 'La date de début ne peut pas être dans le passé (plus de 24h)';
    END IF;
    
    IF NEW.date_fin <= NEW.date_debut THEN
        RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
    END IF;
    
    IF NEW.vehicule_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM demandes_voiture
            WHERE vehicule_id = NEW.vehicule_id
            AND statut IN ('approuvee', 'en_cours')
            AND id != COALESCE(NEW.id, 0)
            AND (
                (NEW.date_debut BETWEEN date_debut AND date_fin)
                OR (NEW.date_fin BETWEEN date_debut AND date_fin)
                OR (date_debut BETWEEN NEW.date_debut AND NEW.date_fin)
            )
        ) THEN
            RAISE EXCEPTION 'Le véhicule est déjà réservé pour cette période';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validation_demande_voiture ON demandes_voiture;
CREATE TRIGGER validation_demande_voiture
    BEFORE INSERT OR UPDATE ON demandes_voiture
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validation_demande_voiture();

-- ============================================
-- TRIGGER: Auto-création suivi carburant
-- ============================================
CREATE OR REPLACE FUNCTION trigger_auto_suivi_carburant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.statut = 'approuvee' AND OLD.statut != 'approuvee' THEN
        INSERT INTO suivis_carburant (
            vehicule_id,
            demande_carburant_id,
            quantite,
            type_carburant,
            kilometrage,
            date_ravitaillement,
            bon_commande
        ) VALUES (
            NEW.vehicule_id,
            NEW.id,
            COALESCE(NEW.quantite_approuvee, NEW.quantite_demandee),
            NEW.type_carburant,
            NEW.kilometrage_actuel,
            CURRENT_TIMESTAMP,
            NEW.bon_commande
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_suivi_carburant ON demandes_carburant;
CREATE TRIGGER auto_suivi_carburant
    AFTER UPDATE ON demandes_carburant
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_suivi_carburant();

-- ============================================
-- TRIGGER: Mise à jour compteur missions chauffeur
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_missions_chauffeur()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.statut = 'terminee' AND OLD.statut != 'terminee') THEN
        UPDATE chauffeurs
        SET nombre_missions = nombre_missions + 1
        WHERE id = NEW.chauffeur_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_missions_chauffeur ON demandes_voiture;
CREATE TRIGGER update_missions_chauffeur
    AFTER INSERT OR UPDATE ON demandes_voiture
    FOR EACH ROW
    WHEN (NEW.chauffeur_id IS NOT NULL AND NEW.statut = 'terminee')
    EXECUTE FUNCTION trigger_update_missions_chauffeur();

-- ============================================
-- FONCTION: Vérifier disponibilité véhicule
-- ============================================
CREATE OR REPLACE FUNCTION verifier_disponibilite_vehicule(
    p_vehicule_id INTEGER,
    p_date_debut TIMESTAMP,
    p_date_fin TIMESTAMP,
    p_demande_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM demandes_voiture
        WHERE vehicule_id = p_vehicule_id
        AND statut IN ('approuvee', 'en_cours')
        AND id != COALESCE(p_demande_id, 0)
        AND (
            (p_date_debut BETWEEN date_debut AND date_fin)
            OR (p_date_fin BETWEEN date_debut AND date_fin)
            OR (date_debut BETWEEN p_date_debut AND p_date_fin)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION: Calculer consommation moyenne
-- ============================================
CREATE OR REPLACE FUNCTION calculer_consommation_moyenne(p_vehicule_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    consommation_moy DECIMAL;
BEGIN
    SELECT AVG(consommation_theorique) INTO consommation_moy
    FROM suivis_carburant
    WHERE vehicule_id = p_vehicule_id
    AND consommation_theorique IS NOT NULL
    AND consommation_theorique > 0
    AND consommation_theorique < 50;
    
    RETURN COALESCE(consommation_moy, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VÉRIFICATION DES TRIGGERS
-- ============================================

-- Afficher tous les triggers créés
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TRIGGERS CRÉÉS AVEC SUCCÈS';
    RAISE NOTICE '==========================================';
END $$;

SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing || ' ' || string_agg(event_manipulation, ' OR ') as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY trigger_name, event_object_table, action_timing
ORDER BY event_object_table, trigger_name;

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Triggers disponibles:';
    RAISE NOTICE '  ✓ auto_numero_demande_carburant';
    RAISE NOTICE '  ✓ auto_numero_demande_voiture';
    RAISE NOTICE '  ✓ update_statut_vehicule_affectation';
    RAISE NOTICE '  ✓ calcul_consommation';
    RAISE NOTICE '  ✓ update_kilometrage_vehicule';
    RAISE NOTICE '  ✓ validation_permis_chauffeur';
    RAISE NOTICE '  ✓ log_historique_entretien';
    RAISE NOTICE '  ✓ update_derniere_connexion';
    RAISE NOTICE '  ✓ validation_demande_voiture';
    RAISE NOTICE '  ✓ auto_suivi_carburant';
    RAISE NOTICE '  ✓ update_missions_chauffeur';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Fonctions utilitaires:';
    RAISE NOTICE '  ✓ verifier_disponibilite_vehicule()';
    RAISE NOTICE '  ✓ calculer_consommation_moyenne()';
    RAISE NOTICE '  ✓ generer_numero_demande()';
    RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- FIN DES TRIGGERS
-- ============================================