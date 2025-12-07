-- Migration: Ajout de la colonne nom_feuille à suivi_carburant
-- Date: 2024-12-07

-- Ajouter la colonne si elle n'existe pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'suivi_carburant' 
        AND column_name = 'nom_feuille'
    ) THEN
        ALTER TABLE suivi_carburant 
        ADD COLUMN nom_feuille VARCHAR(255);
        
        COMMENT ON COLUMN suivi_carburant.nom_feuille IS 'Nom de la feuille Excel source';
        
        RAISE NOTICE 'Colonne nom_feuille ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne nom_feuille existe déjà';
    END IF;
END $$;

-- Créer un index pour améliorer les recherches
CREATE INDEX IF NOT EXISTS idx_suivi_carburant_nom_feuille 
ON suivi_carburant(nom_feuille);

-- Afficher le résultat
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'suivi_carburant'
AND column_name = 'nom_feuille';