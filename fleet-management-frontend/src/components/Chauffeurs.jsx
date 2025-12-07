// fleet-management-frontend/src/components/Chauffeurs.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, UserX, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { chauffeursAPI, handleAPIError } from '../services/api';

const Chauffeurs = ({ userRole }) => {
  const [chauffeurs, setChauffeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChauffeur, setSelectedChauffeur] = useState(null);
  const [mode, setMode] = useState('create');

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    numero_permis: '',
    type_permis: 'B',
    date_expiration_permis: ''
  });

  useEffect(() => {
    chargerChauffeurs();
  }, []);

  const chargerChauffeurs = async () => {
    setLoading(true);
    try {
      const response = await chauffeursAPI.getAll();
      if (response.data.success) {
        setChauffeurs(response.data.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nom || !formData.prenom || !formData.email || !formData.numero_permis || !formData.date_expiration_permis) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const response = mode === 'create' 
        ? await chauffeursAPI.create(formData)
        : await chauffeursAPI.update(selectedChauffeur.id, formData);

      if (response.data.success) {
        alert(response.data.message);
        if (mode === 'create' && response.data.motDePasseTemporaire) {
          alert(`Mot de passe temporaire: ${response.data.motDePasseTemporaire}\n\nLe chauffeur doit changer ce mot de passe à la première connexion.`);
        }
        setShowModal(false);
        resetForm();
        chargerChauffeurs();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  const handleEdit = (chauffeur) => {
    setSelectedChauffeur(chauffeur);
    setFormData({
      nom: chauffeur.nom,
      prenom: chauffeur.prenom,
      email: chauffeur.email,
      telephone: chauffeur.telephone,
      numero_permis: chauffeur.numero_permis,
      type_permis: chauffeur.type_permis,
      date_expiration_permis: chauffeur.date_expiration_permis ? 
        new Date(chauffeur.date_expiration_permis).toISOString().split('T')[0] : ''
    });
    setMode('edit');
    setShowModal(true);
  };

  const handleDesactiver = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce chauffeur ?')) return;

    try {
      const response = await chauffeursAPI.desactiver(id);
      if (response.data.success) {
        alert('Chauffeur désactivé avec succès');
        chargerChauffeurs();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      numero_permis: '',
      type_permis: 'B',
      date_expiration_permis: ''
    });
    setMode('create');
    setSelectedChauffeur(null);
  };

  const getStatutBadge = (statut) => {
    const styles = {
      'disponible': 'badge-success',
      'en_mission': 'badge-info',
      'conge': 'badge-warning',
      'indisponible': 'badge-error'
    };

    const labels = {
      'disponible': 'Disponible',
      'en_mission': 'En Mission',
      'conge': 'En Congé',
      'indisponible': 'Indisponible'
    };

    return (
      <span className={`badge ${styles[statut] || 'badge-info'}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  const isPermisExpireSoon = (dateExpiration) => {
    if (!dateExpiration) return false;
    const date = new Date(dateExpiration);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isPermisExpire = (dateExpiration) => {
    if (!dateExpiration) return false;
    return new Date(dateExpiration) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Chauffeurs</h1>
          <p className="text-gray-600 mt-1">Équipe de {chauffeurs.length} chauffeur(s)</p>
        </div>

        {(userRole === 'logistique' || userRole === 'admin') && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Ajouter Chauffeur
          </button>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {chauffeurs.filter(c => c.statut === 'disponible').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">En Mission</p>
              <p className="text-2xl font-bold text-blue-600">
                {chauffeurs.filter(c => c.statut === 'en_mission').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertCircle className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Permis à renouveler</p>
              <p className="text-2xl font-bold text-orange-600">
                {chauffeurs.filter(c => isPermisExpireSoon(c.date_expiration_permis) || isPermisExpire(c.date_expiration_permis)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Missions</p>
              <p className="text-2xl font-bold text-purple-600">
                {chauffeurs.reduce((sum, c) => sum + (parseInt(c.nombre_missions) || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Chargement...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom / Prénom</th>
                  <th>Contact</th>
                  <th>Permis</th>
                  <th>Date Expiration</th>
                  <th>Statut</th>
                  <th className="text-right">Missions</th>
                  <th className="text-right">KM Total</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chauffeurs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-500">
                      Aucun chauffeur enregistré
                    </td>
                  </tr>
                ) : (
                  chauffeurs.map((chauffeur) => {
                    const permisExpire = isPermisExpire(chauffeur.date_expiration_permis);
                    const permisExpireSoon = isPermisExpireSoon(chauffeur.date_expiration_permis);

                    return (
                      <tr key={chauffeur.id} className={permisExpire ? 'bg-red-50' : permisExpireSoon ? 'bg-orange-50' : ''}>
                        <td>
                          <div className="font-medium">{chauffeur.nom} {chauffeur.prenom}</div>
                          {chauffeur.note_evaluation && (
                            <div className="text-xs text-gray-500">
                              ⭐ {chauffeur.note_evaluation}/5
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">{chauffeur.email}</div>
                          {chauffeur.telephone && (
                            <div className="text-xs text-gray-500">{chauffeur.telephone}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-info">
                            {chauffeur.numero_permis} (Type {chauffeur.type_permis})
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {new Date(chauffeur.date_expiration_permis).toLocaleDateString('fr-FR')}
                            {permisExpire && (
                              <AlertCircle size={16} className="text-red-600" title="Permis expiré" />
                            )}
                            {permisExpireSoon && !permisExpire && (
                              <AlertCircle size={16} className="text-orange-600" title="Expire bientôt" />
                            )}
                          </div>
                        </td>
                        <td>{getStatutBadge(chauffeur.statut)}</td>
                        <td className="text-right">{chauffeur.nombre_missions || 0}</td>
                        <td className="text-right">
                          {chauffeur.total_km_parcourus ? 
                            `${Math.round(chauffeur.total_km_parcourus).toLocaleString()} km` : 
                            '-'
                          }
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedChauffeur(chauffeur);
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir détails"
                            >
                              <Eye size={18} />
                            </button>

                            {(userRole === 'logistique' || userRole === 'admin') && (
                              <>
                                <button
                                  onClick={() => handleEdit(chauffeur)}
                                  className="text-orange-600 hover:text-orange-800"
                                  title="Modifier"
                                >
                                  <Edit size={18} />
                                </button>

                                {chauffeur.statut !== 'indisponible' && (
                                  <button
                                    onClick={() => handleDesactiver(chauffeur.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Désactiver"
                                  >
                                    <UserX size={18} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Formulaire */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {mode === 'create' ? 'Nouveau Chauffeur' : 'Modifier Chauffeur'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-input"
                    required
                    disabled={mode === 'edit'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    className="form-input"
                    placeholder="+261 XX XX XXX XX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Numéro Permis *</label>
                  <input
                    type="text"
                    value={formData.numero_permis}
                    onChange={(e) => setFormData({...formData, numero_permis: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type Permis *</label>
                  <select
                    value={formData.type_permis}
                    onChange={(e) => setFormData({...formData, type_permis: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="A">A (Moto)</option>
                    <option value="B">B (Voiture)</option>
                    <option value="C">C (Poids lourds)</option>
                    <option value="D">D (Transport public)</option>
                    <option value="E">E (Remorque)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date Expiration *</label>
                  <input
                    type="date"
                    value={formData.date_expiration_permis}
                    onChange={(e) => setFormData({...formData, date_expiration_permis: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              {mode === 'create' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ Un compte utilisateur sera créé automatiquement avec un mot de passe temporaire. 
                    Le chauffeur devra le changer à la première connexion.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button onClick={handleSubmit} className="btn btn-primary flex-1">
                  {mode === 'create' ? 'Créer' : 'Modifier'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetailModal && selectedChauffeur && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Détails du Chauffeur</h2>
              <button onClick={() => setShowDetailModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nom Complet</label>
                <p className="text-xl font-bold">{selectedChauffeur.nom} {selectedChauffeur.prenom}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p>{selectedChauffeur.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Téléphone</label>
                  <p>{selectedChauffeur.telephone || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Numéro Permis</label>
                  <p className="font-medium">{selectedChauffeur.numero_permis}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type Permis</label>
                  <p className="font-medium">{selectedChauffeur.type_permis}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Date Expiration Permis</label>
                <p className={`font-medium ${
                  isPermisExpire(selectedChauffeur.date_expiration_permis) ? 'text-red-600' :
                  isPermisExpireSoon(selectedChauffeur.date_expiration_permis) ? 'text-orange-600' :
                  'text-gray-900'
                }`}>
                  {new Date(selectedChauffeur.date_expiration_permis).toLocaleDateString('fr-FR')}
                  {isPermisExpire(selectedChauffeur.date_expiration_permis) && ' - Expiré ⚠️'}
                  {isPermisExpireSoon(selectedChauffeur.date_expiration_permis) && !isPermisExpire(selectedChauffeur.date_expiration_permis) && ' - Expire bientôt ⚠️'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Statut</label>
                <div className="mt-1">{getStatutBadge(selectedChauffeur.statut)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre de Missions</label>
                  <p className="text-2xl font-bold text-blue-600">{selectedChauffeur.nombre_missions || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">KM Total Parcourus</label>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedChauffeur.total_km_parcourus ? 
                      `${Math.round(selectedChauffeur.total_km_parcourus).toLocaleString()} km` : 
                      '0 km'
                    }
                  </p>
                </div>
              </div>

              {selectedChauffeur.note_evaluation && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Évaluation</label>
                  <p className="text-xl font-bold text-yellow-600">
                    ⭐ {selectedChauffeur.note_evaluation}/5
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chauffeurs;