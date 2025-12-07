// fleet-management-frontend/src/components/Vehicules.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Trash2, Wrench, FileText, Car, AlertCircle } from 'lucide-react';
import { vehiculesAPI, handleAPIError } from '../services/api';

const Vehicules = ({ userRole }) => {
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVehicule, setSelectedVehicule] = useState(null);
  const [mode, setMode] = useState('create'); // create ou edit

  const [formData, setFormData] = useState({
    immatriculation: '',
    marque: '',
    modele: '',
    annee: new Date().getFullYear(),
    type_vehicule: 'voiture',
    type_carburant: 'essence',
    capacite_reservoir: '',
    couleur: '',
    numero_chassis: ''
  });

  useEffect(() => {
    chargerVehicules();
  }, []);

  const chargerVehicules = async () => {
    setLoading(true);
    try {
      const response = await vehiculesAPI.getAll();
      if (response.data.success) {
        setVehicules(response.data.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.immatriculation || !formData.marque || !formData.modele) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const response = mode === 'create' 
        ? await vehiculesAPI.create(formData)
        : await vehiculesAPI.update(selectedVehicule.id, formData);

      if (response.data.success) {
        alert(response.data.message);
        setShowModal(false);
        resetForm();
        chargerVehicules();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  const handleEdit = (vehicule) => {
    setSelectedVehicule(vehicule);
    setFormData({
      immatriculation: vehicule.immatriculation,
      marque: vehicule.marque,
      modele: vehicule.modele,
      annee: vehicule.annee,
      type_vehicule: vehicule.type_vehicule,
      type_carburant: vehicule.type_carburant,
      capacite_reservoir: vehicule.capacite_reservoir,
      couleur: vehicule.couleur,
      numero_chassis: vehicule.numero_chassis
    });
    setMode('edit');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return;

    try {
      const response = await vehiculesAPI.delete(id);
      if (response.data.success) {
        alert('Véhicule supprimé avec succès');
        chargerVehicules();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      immatriculation: '',
      marque: '',
      modele: '',
      annee: new Date().getFullYear(),
      type_vehicule: 'voiture',
      type_carburant: 'essence',
      capacite_reservoir: '',
      couleur: '',
      numero_chassis: ''
    });
    setMode('create');
    setSelectedVehicule(null);
  };

  const getStatutBadge = (statut) => {
    const styles = {
      'disponible': 'badge-success',
      'en_mission': 'badge-info',
      'maintenance': 'badge-warning',
      'hors_service': 'badge-error'
    };

    const labels = {
      'disponible': 'Disponible',
      'en_mission': 'En Mission',
      'maintenance': 'Maintenance',
      'hors_service': 'Hors Service'
    };

    return (
      <span className={`badge ${styles[statut] || 'badge-info'}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Véhicules</h1>
          <p className="text-gray-600 mt-1">Flotte de {vehicules.length} véhicule(s)</p>
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
            Ajouter Véhicule
          </button>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Car className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {vehicules.filter(v => v.statut === 'disponible').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Car className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">En Mission</p>
              <p className="text-2xl font-bold text-blue-600">
                {vehicules.filter(v => v.statut === 'en_mission').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Wrench className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-orange-600">
                {vehicules.filter(v => v.statut === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Hors Service</p>
              <p className="text-2xl font-bold text-red-600">
                {vehicules.filter(v => v.statut === 'hors_service').length}
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
                  <th>Immatriculation</th>
                  <th>Marque / Modèle</th>
                  <th>Type</th>
                  <th>Carburant</th>
                  <th>Année</th>
                  <th className="text-right">KM Actuel</th>
                  <th>Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicules.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-500">
                      Aucun véhicule enregistré
                    </td>
                  </tr>
                ) : (
                  vehicules.map((vehicule) => (
                    <tr key={vehicule.id}>
                      <td className="font-bold text-blue-600">{vehicule.immatriculation}</td>
                      <td>
                        <div className="font-medium">{vehicule.marque}</div>
                        <div className="text-sm text-gray-600">{vehicule.modele}</div>
                      </td>
                      <td>
                        <span className="badge badge-info">{vehicule.type_vehicule}</span>
                      </td>
                      <td className="capitalize">{vehicule.type_carburant}</td>
                      <td>{vehicule.annee}</td>
                      <td className="text-right font-medium">
                        {vehicule.km_actuel ? vehicule.km_actuel.toLocaleString() : '-'}
                      </td>
                      <td>{getStatutBadge(vehicule.statut)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedVehicule(vehicule);
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
                                onClick={() => handleEdit(vehicule)}
                                className="text-orange-600 hover:text-orange-800"
                                title="Modifier"
                              >
                                <Edit size={18} />
                              </button>

                              {userRole === 'admin' && (
                                <button
                                  onClick={() => handleDelete(vehicule.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Supprimer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
                {mode === 'create' ? 'Nouveau Véhicule' : 'Modifier Véhicule'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Immatriculation *</label>
                <input
                  type="text"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData({...formData, immatriculation: e.target.value.toUpperCase()})}
                  className="form-input"
                  placeholder="Ex: 1234ABC"
                  required
                  disabled={mode === 'edit'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Marque *</label>
                  <input
                    type="text"
                    value={formData.marque}
                    onChange={(e) => setFormData({...formData, marque: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Modèle *</label>
                  <input
                    type="text"
                    value={formData.modele}
                    onChange={(e) => setFormData({...formData, modele: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    value={formData.type_vehicule}
                    onChange={(e) => setFormData({...formData, type_vehicule: e.target.value})}
                    className="form-select"
                  >
                    <option value="voiture">Voiture</option>
                    <option value="camion">Camion</option>
                    <option value="utilitaire">Utilitaire</option>
                    <option value="moto">Moto</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Carburant</label>
                  <select
                    value={formData.type_carburant}
                    onChange={(e) => setFormData({...formData, type_carburant: e.target.value})}
                    className="form-select"
                  >
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybride">Hybride</option>
                    <option value="electrique">Électrique</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Année</label>
                  <input
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({...formData, annee: parseInt(e.target.value)})}
                    className="form-input"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Capacité réservoir (L)</label>
                  <input
                    type="number"
                    value={formData.capacite_reservoir}
                    onChange={(e) => setFormData({...formData, capacite_reservoir: e.target.value})}
                    className="form-input"
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Couleur</label>
                  <input
                    type="text"
                    value={formData.couleur}
                    onChange={(e) => setFormData({...formData, couleur: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Numéro de Chassis</label>
                <input
                  type="text"
                  value={formData.numero_chassis}
                  onChange={(e) => setFormData({...formData, numero_chassis: e.target.value})}
                  className="form-input"
                />
              </div>

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
      {showDetailModal && selectedVehicule && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Détails du Véhicule</h2>
              <button onClick={() => setShowDetailModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Immatriculation</label>
                <p className="text-2xl font-bold text-blue-600">{selectedVehicule.immatriculation}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Marque</label>
                  <p className="font-medium">{selectedVehicule.marque}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Modèle</label>
                  <p className="font-medium">{selectedVehicule.modele}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="capitalize">{selectedVehicule.type_vehicule}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Carburant</label>
                  <p className="capitalize">{selectedVehicule.type_carburant}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Année</label>
                  <p>{selectedVehicule.annee}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Statut</label>
                <div className="mt-1">{getStatutBadge(selectedVehicule.statut)}</div>
              </div>

              {selectedVehicule.km_actuel && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Kilométrage actuel</label>
                  <p className="text-xl font-bold">{selectedVehicule.km_actuel.toLocaleString()} km</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicules;