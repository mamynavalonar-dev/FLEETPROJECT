// fleet-management-backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authentifier = (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Token non fourni',
        message: 'Veuillez vous connecter pour accéder à cette ressource'
      });
    }

    // Format attendu: "Bearer TOKEN"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Format de token invalide',
        message: 'Le token doit être au format: Bearer TOKEN'
      });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ajouter les informations de l'utilisateur à la requête
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expiré',
        message: 'Votre session a expiré, veuillez vous reconnecter'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token invalide',
        message: 'Le token fourni est invalide'
      });
    }
    
    return res.status(500).json({ 
      error: 'Erreur d\'authentification',
      message: error.message 
    });
  }
};

// Middleware de vérification de rôle
const verifierRole = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Non authentifié',
        message: 'Veuillez vous connecter'
      });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès non autorisé',
        message: `Cette action nécessite le rôle: ${rolesAutorises.join(' ou ')}`,
        votreRole: req.user.role
      });
    }

    next();
  };
};

// Middleware optionnel - n'échoue pas si pas de token
const authentifierOptional = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email
        };
      }
    }
  } catch (error) {
    // Ne pas bloquer si le token est invalide
    console.log('Token optionnel invalide:', error.message);
  }
  
  next();
};

// Fonction pour générer un token
const genererToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Fonction pour vérifier un token
const verifierToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authentifier,
  verifierRole,
  authentifierOptional,
  genererToken,
  verifierToken
};