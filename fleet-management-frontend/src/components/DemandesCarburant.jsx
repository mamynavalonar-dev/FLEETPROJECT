// fleet-management-frontend/src/components/DemandesCarburant.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Eye, CheckCircle, XCircle, Clock, Send, 
  Download, Filter, Search, AlertCircle 
} from 'lucide-react';
import { demandesCarburantAPI, handleAPIError } from '../services/api';

const DemandesCarburant = ({ userRole, userId }) => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [filtres, setFiltres] = useState({
    statut: '',
    date_debut: '',
    date_fin: ''
  });

  // État du formulaire
  const [formData, setFormData] = useState({
    type_demande: 'service',
    objet: '',
    montant_previsionnel: '',
    montant_en_lettre: ''
  });

  useEffect(() => {
    chargerDemandes();
  }, [filtres]);

  const chargerDemandes = async () => {
    setLoading(true);
    try {
      const response = await demandesCarburantAPI.getAll(filtres);
      if (response.data.success) {
        setDemandes(response.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      const errorInfo = handleAPIError(error);
      alert(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.objet || !formData.montant_previsionnel) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const response = await demandesCarburantAPI.create(formData);
      if (response.data.success) {
        alert('Demande créée avec succès !');
        setShowModal(false);
        setFormData({
          type_demande: 'service',
          objet: '',
          montant_previsionnel: '',
          montant_en_lettre: ''
        });
        chargerDemandes();
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      alert('Erreur: ' + errorInfo.message);
    }
  };

  const handleVerifier = async (id, approuve) => {
    const commentaire = prompt('Commentaire (optionnel):');
    
    try {
      const response = await demandesCarburantAPI.verifier(id, {
        approuve,
        commentaire
      });
      
      if (response.data.success) {
        alert(response.data.message);
        chargerDemandes();
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      alert('Erreur: ' + errorInfo.message);
    }
  };

  const handleViser = async (id, approuve) => {
    const commentaire = prompt('Commentaire (optionnel):');
    
    try {
      const response = await demandesCarburantAPI.viser(id, {
        approuve,
        commentaire
      });
      
      if (response.data.success) {
        alert(response.data.message);
        chargerDemandes();
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      alert('Erreur: ' + errorInfo.message);
    }
  };

  const getStatutBadge = (statut) => {
    const styles = {
      'en_attente_logistique': 'badge-warning',
      'approuve_logistique': 'badge-info',
      'en_attente_raf': 'badge-warning',
      'approuve_raf': 'badge-info',
      'valide': 'badge-success',
      'rejete_logistique': 'badge-error',
      'rejete_raf': 'badge-error'
    };
    
    const labels = {
      'en_attente_logistique': 'En attente Logistique',
      'approuve_logistique': 'Approuvé Logistique',
      'en_attente_raf': 'En attente RAF',
      'approuve_raf': 'Approuvé RAF',
      'valide': 'Validé',
      'rejete_logistique': 'Rejeté Logistique',
      'rejete_raf': 'Rejeté RAF'
    };

    return (
      <span className={`badge ${styles[statut] || 'badge-info'}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  const WorkflowVisuel = ({ demande }) => {
    const etapes = [
      { key: 'demandeur', label: 'Demandeur', statuts: ['all'] },
      { key: 'logistique', label: 'Logistique', statuts: ['en_attente_logistique', 'approuve_logistique', 'rejete_logistique', 'en_attente_raf', 'approuve_raf', 'valide'] },
      { key: 'raf', label: 'RAF', statuts: ['en_attente_raf', 'approuve_raf', 'rejete_raf', 'valide'] }
    ];

    const getEtapeStatut = (etapeKey, demandeStatut) => {
      if (etapeKey === 'demandeur') return 'valide';
      if (etapeKey === 'logistique') {
        if (demandeStatut === 'en_attente_logistique') return 'en_cours';
        if (demandeStatut === 'rejete_logistique') return 'rejete';
        if (['approuve_logistique', 'en_attente_raf', 'approuve_raf', 'valide'].includes(demandeStatut)) return 'valide';
      }
      if (etapeKey === 'raf') {
        if (demandeStatut === 'en_attente_raf') return 'en_cours';
        if (demandeStatut === 'rejete_raf') return 'rejete';
        if (demandeStatut === 'valide') return 'valide';
      }
      return 'attente';
    };

    return (
      <div className="flex items-center justify-center gap-2 py-2">
        {etapes.map((etape, index) => {
          const statutEtape = getEtapeStatut(etape.key, demande.statut);
          
          return (
            <React.Fragment key={etape.key}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  statutEtape === 'valide' ? 'bg-green-500' :
                  statutEtape === 'en_cours' ? 'bg-yellow-500' :
                  statutEtape === 'rejete' ? 'bg-red-500' :
                  'bg-gray-300'
                }`}>
                  {statutEtape === 'valide' && <CheckCircle size={18} className="text-white" />}
                  {statutEtape === 'en_cours' && <Clock size={18} className="text-white" />}
                  {statutEtape === 'rejete' && <XCircle size={18} className="text-white" />}
                </div>
                <span className="text-xs text-gray-600">{etape.label}</span>
              </div>
              
              {index < etapes.length - 1 && (
                <div className={`w-12 h-1 ${
                  statutEtape === 'valide' ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demandes de Carburant</h1>
          <p className="text-gray-600 mt-1">Gestion des demandes avec workflow d'approbation</p>
        </div>
        
        {userRole === 'demandeur' && (
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Nouvelle Demande
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="font-semibold">Filtres</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Statut</label>
            <select
              value={filtres.statut}
              onChange={(e) => setFiltres({...filtres, statut: e.target.value})}
              className="form-select"
            >
              <option value="">Tous</option>
              <option value="en_attente_logistique">En attente Logistique</option>
              <option value="en_attente_raf">En attente RAF</option>
              <option value="valide">Validé</option>
              <option value="rejete_logistique">Rejeté Logistique</option>
              <option value="rejete_raf">Rejeté RAF</option>
            </select>
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label">Date début</label>
            <input
              type="date"
              value={filtres.date_debut}
              onChange={(e) => setFiltres({...filtres, date_debut: e.target.value})}
              className="form-input"
            />
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label">Date fin</label>
            <input
              type="date"
              value={filtres.date_fin}
              onChange={(e) => setFiltres({...filtres, date_fin: e.target.value})}
              className="form-input"
            />
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          <strong>{demandes.length}</strong> demande(s) trouvée(s)
        </div>
      </div>

      {/* Tableau des demandes */}
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
                  <th>N° Demande</th>
                  <th>Date</th>
                  <th>Demandeur</th>
                  <th>Type</th>
                  <th>Objet</th>
                  <th className="text-right">Montant</th>
                  <th>Workflow</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-500">
                      Aucune demande trouvée
                    </td>
                  </tr>
                ) : (
                  demandes.map((demande) => (
                    <tr key={demande.id}>
                      <td className="font-medium">{demande.numero_demande}</td>
                      <td>{new Date(demande.date_demande).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div>
                          <div className="font-medium">{demande.demandeur_nom} {demande.demandeur_prenom}</div>
                          <div className="text-xs text-gray-500">{demande.service}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${demande.type_demande === 'mission' ? 'badge-info' : 'badge-success'}`}>
                          {demande.type_demande}
                        </span>
                      </td>
                      <td className="max-w-xs truncate">{demande.objet}</td>
                      <td className="text-right font-medium">
                        {parseFloat(demande.montant_previsionnel).toLocaleString('fr-FR')} Ar
                      </td>
                      <td>
                        <WorkflowVisuel demande={demande} />
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          {(userRole === 'logistique' && demande.statut === 'en_attente_logistique') && (
                            <>
                              <button
                                onClick={() => handleVerifier(demande.id, true)}
                                className="btn btn-success btn-sm"
                                title="Approuver"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleVerifier(demande.id, false)}
                                className="btn btn-secondary btn-sm"
                                title="Rejeter"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          
                          {(userRole === 'raf' && demande.statut === 'en_attente_raf') && (
                            <>
                              <button
                                onClick={() => handleViser(demande.id, true)}
                                className="btn btn-success btn-sm"
                                title="Viser"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleViser(demande.id, false)}
                                className="btn btn-secondary btn-sm"
                                title="Rejeter"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedDemande(demande);
                              setShowDetailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Voir détails"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {demande.statut === 'valide' && (
                            <button
                              onClick={() => demandesCarburantAPI.downloadPDF(demande.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Télécharger PDF"
                            >
                              <Download size={18} />
                            </button>
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

      {/* Modal Nouvelle Demande */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle Demande de Carburant</h2>
              <button onClick={() => setShowModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="service"
                    checked={formData.type_demande === 'service'}
                    onChange={(e) => setFormData({...formData, type_demande: e.target.value})}
                  />
                  <span className="font-medium">SERVICE</span>
                </label>
                
                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="mission"
                    checked={formData.type_demande === 'mission'}
                    onChange={(e) => setFormData({...formData, type_demande: e.target.value})}
                  />
                  <span className="font-medium">MISSION</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Objet *</label>
                <textarea
                  value={formData.objet}
                  onChange={(e) => setFormData({...formData, objet: e.target.value})}
                  className="form-textarea"
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Montant prévisionnel (en chiffre) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={formData.montant_previsionnel}
                    onChange={(e) => setFormData({...formData, montant_previsionnel: e.target.value})}
                    className="form-input flex-1"
                    required
                  />
                  <span className="text-gray-600">Ar</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Montant (en lettre) *</label>
                <input
                  type="text"
                  value={formData.montant_en_lettre}
                  onChange={(e) => setFormData({...formData, montant_en_lettre: e.target.value})}
                  className="form-input"
                  placeholder="Ex: Deux cent cinquante mille ariary"
                  required
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Cette demande sera envoyée pour vérification à la Logistique, puis au RAF pour validation finale.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary flex-1"
                  >
                    <Send size={18} />
                    Soumettre la Demande
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetailModal && selectedDemande && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Détails de la Demande</h2>
              <button onClick={() => setShowDetailModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">N° Demande</label>
                <p className="text-lg font-bold">{selectedDemande.numero_demande}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="font-medium">{selectedDemande.type_demande}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date</label>
                  <p className="font-medium">{new Date(selectedDemande.date_demande).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Objet</label>
                <p className="mt-1">{selectedDemande.objet}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Montant</label>
                <p className="text-xl font-bold text-blue-600">
                  {parseFloat(selectedDemande.montant_previsionnel).toLocaleString('fr-FR')} Ar
                </p>
                {selectedDemande.montant_en_lettre && (
                  <p className="text-sm text-gray-600 italic">{selectedDemande.montant_en_lettre}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Statut</label>
                <div className="mt-1">
                  {getStatutBadge(selectedDemande.statut)}
                </div>
              </div>

              {selectedDemande.commentaire_logistique && (
                <div className="border-t pt-3">
                  <label className="text-sm font-medium text-gray-600">Commentaire Logistique</label>
                  <p className="mt-1 text-sm">{selectedDemande.commentaire_logistique}</p>
                </div>
              )}

              {selectedDemande.commentaire_raf && (
                <div className="border-t pt-3">
                  <label className="text-sm font-medium text-gray-600">Commentaire RAF</label>
                  <p className="mt-1 text-sm">{selectedDemande.commentaire_raf}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandesCarburant;