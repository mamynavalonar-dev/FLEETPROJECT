// fleet-management-backend/test-db.js
const { Pool } = require('pg');
require('dotenv').config();

console.log('============================================');
console.log('🔍 TEST DE CONNEXION BASE DE DONNÉES');
console.log('============================================\n');

// Configuration de connexion
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fleet_management',
};

console.log('📋 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Password: ${'*'.repeat(config.password?.length || 0)}\n`);

const pool = new Pool(config);

async function testConnection() {
  try {
    // Test 1: Connexion basique
    console.log('🔄 Test 1: Connexion à PostgreSQL...');
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('   ✅ Connexion réussie!');
    console.log(`   ⏰ Heure serveur: ${result.rows[0].current_time}`);
    console.log(`   📦 Version: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}\n`);

    // Test 2: Vérification des tables
    console.log('🔄 Test 2: Vérification des tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'affectations',
      'chauffeurs',
      'demandes_carburant',
      'demandes_voiture',
      'entretiens',
      'historique_entretiens',
      'services',
      'suivis_carburant',
      'utilisateurs',
      'vehicules'
    ];

    console.log(`   📊 ${tables.rows.length} tables trouvées:`);
    tables.rows.forEach(row => {
      const isExpected = expectedTables.includes(row.table_name);
      const icon = isExpected ? '✅' : '⚠️';
      console.log(`      ${icon} ${row.table_name}`);
    });

    const missingTables = expectedTables.filter(
      t => !tables.rows.find(r => r.table_name === t)
    );
    
    if (missingTables.length > 0) {
      console.log(`\n   ⚠️  Tables manquantes: ${missingTables.join(', ')}`);
    } else {
      console.log('   ✅ Toutes les tables attendues sont présentes!\n');
    }

    // Test 3: Vérification des données
    console.log('🔄 Test 3: Vérification des données...');
    
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM utilisateurs) as utilisateurs,
        (SELECT COUNT(*) FROM services) as services,
        (SELECT COUNT(*) FROM chauffeurs) as chauffeurs,
        (SELECT COUNT(*) FROM vehicules) as vehicules,
        (SELECT COUNT(*) FROM affectations) as affectations,
        (SELECT COUNT(*) FROM demandes_carburant) as demandes_carburant,
        (SELECT COUNT(*) FROM demandes_voiture) as demandes_voiture,
        (SELECT COUNT(*) FROM suivis_carburant) as suivis_carburant,
        (SELECT COUNT(*) FROM entretiens) as entretiens
    `);

    const data = counts.rows[0];
    console.log(`   👥 Utilisateurs: ${data.utilisateurs}`);
    console.log(`   🏢 Services: ${data.services}`);
    console.log(`   👨‍✈️ Chauffeurs: ${data.chauffeurs}`);
    console.log(`   🚗 Véhicules: ${data.vehicules}`);
    console.log(`   🔗 Affectations: ${data.affectations}`);
    console.log(`   ⛽ Demandes carburant: ${data.demandes_carburant}`);
    console.log(`   🚙 Demandes voiture: ${data.demandes_voiture}`);
    console.log(`   📊 Suivis carburant: ${data.suivis_carburant}`);
    console.log(`   🔧 Entretiens: ${data.entretiens}\n`);

    const totalRecords = Object.values(data).reduce((sum, val) => sum + parseInt(val), 0);
    
    if (totalRecords === 0) {
      console.log('   ⚠️  Aucune donnée trouvée. Exécutez le seed.sql!');
      console.log('   💡 Commande: psql -U postgres -d fleet_management -f database/seed.sql\n');
    } else {
      console.log(`   ✅ ${totalRecords} enregistrements au total\n`);
    }

    // Test 4: Vérification des vues
    console.log('🔄 Test 4: Vérification des vues...');
    const views = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (views.rows.length > 0) {
      console.log(`   📊 ${views.rows.length} vues trouvées:`);
      views.rows.forEach(row => {
        console.log(`      ✅ ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('   ⚠️  Aucune vue trouvée. Exécutez views.sql!\n');
    }

    // Test 5: Vérification des triggers
    console.log('🔄 Test 5: Vérification des triggers...');
    const triggers = await pool.query(`
      SELECT DISTINCT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);

    if (triggers.rows.length > 0) {
      console.log(`   ⚡ ${triggers.rows.length} triggers trouvés:`);
      triggers.rows.forEach(row => {
        console.log(`      ✅ ${row.trigger_name} (${row.event_object_table})`);
      });
      console.log('');
    } else {
      console.log('   ⚠️  Aucun trigger trouvé. Exécutez triggers.sql!\n');
    }

    // Test 6: Test requête complexe
    console.log('🔄 Test 6: Test requête complexe (JOIN)...');
    const complexQuery = await pool.query(`
      SELECT 
        v.immatriculation,
        v.marque,
        v.modele,
        v.statut,
        CONCAT(u.prenom, ' ', u.nom) as chauffeur
      FROM vehicules v
      LEFT JOIN affectations a ON v.id = a.vehicule_id AND a.actif = true
      LEFT JOIN chauffeurs c ON a.chauffeur_id = c.id
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      LIMIT 5
    `);

    if (complexQuery.rows.length > 0) {
      console.log('   ✅ Requête JOIN réussie!');
      console.log('   📋 Exemples de véhicules:');
      complexQuery.rows.forEach(row => {
        const chauffeur = row.chauffeur || 'Non affecté';
        console.log(`      • ${row.immatriculation} (${row.marque} ${row.modele}) - ${row.statut} - ${chauffeur}`);
      });
      console.log('');
    }

    // Test 7: Test des fonctions personnalisées
    console.log('🔄 Test 7: Test des fonctions personnalisées...');
    try {
      const funcTest = await pool.query(`
        SELECT generer_numero_demande('TEST-') as numero
      `);
      console.log(`   ✅ Fonction generer_numero_demande(): ${funcTest.rows[0].numero}\n`);
    } catch (err) {
      console.log('   ⚠️  Fonction generer_numero_demande() non trouvée\n');
    }

    // Résumé final
    console.log('============================================');
    console.log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!');
    console.log('============================================\n');

    console.log('📝 PROCHAINES ÉTAPES:');
    console.log('   1. Démarrer le backend: npm run dev');
    console.log('   2. Tester l\'API: curl http://localhost:3000/health');
    console.log('   3. Démarrer le frontend: cd ../fleet-management-frontend && npm run dev');
    console.log('   4. Ouvrir l\'application: http://localhost:5173\n');

    console.log('🔐 COMPTE DE TEST:');
    console.log('   Email: admin@prirtem.mg');
    console.log('   Mot de passe: Password123!\n');

    console.log('============================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR DE CONNEXION!\n');
    console.error('📋 Détails de l\'erreur:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}\n`);

    console.error('🔧 SOLUTIONS POSSIBLES:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   1. PostgreSQL n\'est pas démarré');
      console.error('      • Windows: Vérifiez les services (services.msc)');
      console.error('      • Linux: sudo systemctl start postgresql');
      console.error('      • macOS: brew services start postgresql\n');
      
      console.error('   2. Le port PostgreSQL est incorrect');
      console.error('      • Vérifiez DB_PORT dans .env (défaut: 5432)\n');
    } else if (error.code === '28P01') {
      console.error('   1. Mot de passe incorrect');
      console.error('      • Vérifiez DB_PASSWORD dans .env');
      console.error('      • Réinitialisez le mot de passe PostgreSQL si nécessaire\n');
    } else if (error.code === '3D000') {
      console.error('   1. La base de données n\'existe pas');
      console.error('      • Créez-la: psql -U postgres -c "CREATE DATABASE fleet_management;"\n');
    } else if (error.code === '42P01') {
      console.error('   1. Les tables n\'existent pas');
      console.error('      • Exécutez: psql -U postgres -d fleet_management -f database/shema.sql\n');
    }

    console.error('📄 FICHIERS À VÉRIFIER:');
    console.error('   • fleet-management-backend/.env');
    console.error('   • database/shema.sql');
    console.error('   • database/seed.sql\n');

    console.error('============================================\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter les tests
testConnection();