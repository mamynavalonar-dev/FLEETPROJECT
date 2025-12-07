// fleet-management-backend/fix-auth.js
// Script pour désactiver temporairement l'authentification

const fs = require('fs');
const path = require('path');

console.log('🔧 Désactivation de l\'authentification pour le développement...\n');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = [
  'demandes.js',
  'vehicules.js',
  'chauffeurs.js',
  'import.js',
  'pdf.js'
];

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remplacer authentifier par une fonction qui fait rien
  const before = content;
  content = content.replace(
    /const { authentifier, verifierRole } = require\('\.\.\/middleware\/auth'\);/g,
    `// Auth désactivée pour DEV
const authentifier = (req, res, next) => { 
  req.user = { id: 1, role: 'admin', email: 'admin@prirtem.mg' }; 
  next(); 
};
const verifierRole = (...roles) => (req, res, next) => next();`
  );
  
  if (content !== before) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${file} - Authentification désactivée`);
  } else {
    console.log(`ℹ️  ${file} - Aucune modification nécessaire`);
  }
});

console.log('\n✨ Terminé! Redémarrez le serveur: npm run dev\n');