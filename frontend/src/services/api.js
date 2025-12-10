// fleet-management-frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBwcmlydGVtLm1nIiwiaWF0IjoxNzMzNTY4MDAwfQ.mock';
localStorage.setItem('token', mockToken);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  // 🔴 AJOUTE ÇA
  validateStatus: function (status) {
    return status < 500; // Accepte les 401, 403, etc. sans retry
  }
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTHENTIFICATION
// ============================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setCurrentUser: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }
};

// ============================================
// DEMANDES CARBURANT
// ============================================

export const demandesCarburantAPI = {
  getAll: (params = {}) => api.get('/demandes-carburant', { params }),
  getById: (id) => api.get(`/demandes-carburant/${id}`),
  create: (data) => api.post('/demandes-carburant', data),
  verifier: (id, data) => api.put(`/demandes-carburant/${id}/verifier`, data),
  viser: (id, data) => api.put(`/demandes-carburant/${id}/viser`, data),
  downloadPDF: (id) => {
    window.open(`${API_BASE_URL}/demandes-carburant/${id}/pdf`, '_blank');
  }
};

// ============================================
// DEMANDES VOITURE
// ============================================

export const demandesVoitureAPI = {
  getAll: (params = {}) => api.get('/demandes-voiture', { params }),
  getById: (id) => api.get(`/demandes-voiture/${id}`),
  create: (data) => api.post('/demandes-voiture', data),
  affecter: (id, data) => api.put(`/demandes-voiture/${id}/affecter`, data),
  approuver: (id, data) => api.put(`/demandes-voiture/${id}/approuver`, data),
  downloadPDF: (id) => {
    window.open(`${API_BASE_URL}/demandes-voiture/${id}/pdf`, '_blank');
  }
};

// ============================================
// VÉHICULES
// ============================================

export const vehiculesAPI = {
  getAll: (params = {}) => api.get('/vehicules', { params }),
  getById: (id) => api.get(`/vehicules/${id}`),
  create: (data) => api.post('/vehicules', data),
  update: (id, data) => api.put(`/vehicules/${id}`, data),
  delete: (id) => api.delete(`/vehicules/${id}`),
  getMaintenances: (id) => api.get(`/vehicules/${id}/maintenances`),
  addMaintenance: (id, data) => api.post(`/vehicules/${id}/maintenances`, data),
  getDocuments: (id) => api.get(`/vehicules/${id}/documents`),
  addDocument: (id, data) => api.post(`/vehicules/${id}/documents`, data),
};

// ============================================
// CHAUFFEURS
// ============================================

export const chauffeursAPI = {
  getAll: (params = {}) => api.get('/chauffeurs', { params }),
  getById: (id) => api.get(`/chauffeurs/${id}`),
  create: (data) => api.post('/chauffeurs', data),
  update: (id, data) => api.put(`/chauffeurs/${id}`, data),
  desactiver: (id) => api.put(`/chauffeurs/${id}/desactiver`),
  getMissions: (id, params = {}) => api.get(`/chauffeurs/${id}/missions`, { params }),
  getDisponibles: (date) => api.get(`/chauffeurs/disponibles/${date}`),
};

// ============================================
// SUIVI CARBURANT
// ============================================

export const suiviCarburantAPI = {
  getAll: (params = {}) => api.get('/suivis', { params }),
  getById: (id) => api.get(`/suivis/${id}`),
  create: (data) => api.post('/suivis', data),
  update: (id, data) => api.put(`/suivis/${id}`, data),
  delete: (id) => api.delete(`/suivis/${id}`),
};

// ============================================
// IMPORT EXCEL
// ============================================

export const importAPI = {
  excel: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('fichier', file);
    
    return api.post('/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 120000, // 2 minutes pour les gros fichiers
    });
  },
  getHistory: () => api.get('/imports'),
  getDetails: (batchId) => api.get(`/imports/${batchId}`),
};

// ============================================
// DASHBOARDS
// ============================================

export const dashboardAPI = {
  vehicules: () => api.get('/dashboard/vehicules'),
  chauffeurs: () => api.get('/dashboard/chauffeurs'),
  alertesDocuments: () => api.get('/dashboard/alertes-documents'),
  stats: () => api.get('/dashboard/stats'),
  alertes: () => api.get('/alertes'),
};

// ============================================
// STATISTIQUES
// ============================================

export const statsAPI = {
  getGlobal: () => api.get('/stats'),
  getParVehicule: (vehiculeId) => api.get(`/stats/vehicule/${vehiculeId}`),
  getParChauffeur: (chauffeurId) => api.get(`/stats/chauffeur/${chauffeurId}`),
};

// ============================================
// UTILS
// ============================================

export const handleAPIError = (error) => {
  if (error.response) {
    // Le serveur a répondu avec un code d'erreur
    const message = error.response.data?.error || error.response.data?.message || 'Une erreur est survenue';
    return {
      message,
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // La requête a été envoyée mais pas de réponse
    return {
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
      status: 0
    };
  } else {
    // Erreur lors de la configuration de la requête
    return {
      message: error.message || 'Une erreur inattendue est survenue',
      status: -1
    };
  }
};

export default api;