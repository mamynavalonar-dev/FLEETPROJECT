// fleet-management-frontend/src/components/DemandesVoiture.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Eye, CheckCircle, XCircle, Download, Car, Users } from 'lucide-react';
import { demandesVoitureAPI, vehiculesAPI, chauffeursAPI, handleAPIError } from '../services/api';

const DemandesVoiture = ({ userRole, userId }) => {
  const [demandes, setDemandes] = useState([]);
  const [vehiculesDisponibles, setVehiculesDisponibles] = useState([]);
  const [chauffeursDisponibles, setChauffeursDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAffectationModal, setShowAffectationModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  
  const [formData, setFormData] = useState({
    date_proposee: '',
    objet: '',
    itineraire: '',
    personnes_transportees: '',
    heure_depart_souhaitee: '',
    heure_retour_probable: ''
  });

  const [affectationData, setAffectationData] = useState({
    vehicule_id: '',
    chauffeur_id: '',
    commentaire: ''
  });

  useEffect(() => {
    chargerDemandes();
  }, []);

  const chargerDemandes = async () => {
    setLoading(true);
    try {
      const response = await demandesVoitureAPI.getAll();
      if (response.data.success) {
        setDemandes(response.data.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const chargerRessourcesDisponibles = async (date) => {
    try {
      const [vehicules, chauffeurs] = await Promise.all([
        vehiculesAPI.getAll({ statut: 'disponible' }),
        chauffeursAPI.getDisponibles(date)
      ]);
      
      setVehiculesDisponibles(vehicules.data.data || []);
      setChauffeursDisponibles(chauffeurs.data.data || []);
    } catch (error) {
      console.error('Erreur chargement ressources:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await demandesVoitureAPI.create(formData);
      if (response.data.success) {
        alert('Demande créée avec succès !');
        setShowModal(false);
        setFormData({
          date_proposee: '',
          objet: '',
          itineraire: '',
          personnes_transportees: '',
          heure_depart_souhaitee: '',
          heure_retour_probable: ''
        });
        chargerDemandes();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  const handleAffecter = async (approuve) => {
    if (!affectationData.vehicule_id || !affectationData.chauffeur_id) {
      alert('Veuillez sélectionner un véhicule et un chauffeur');
      return;
    }

    try {
      const response = await demandesVoitureAPI.affecter(selectedDemande.id, {
        ...affectationData,
        approuve
      });
      
      if (response.data.success) {
        alert(response.data.message);
        setShowAffectationModal(false);
        chargerDemandes();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  const handleApprouver = async (id, approuve) => {
    const commentaire = prompt('Commentaire (optionnel):');
    
    try {
      const response = await demandesVoitureAPI.approuver(id, {
        approuve,
        commentaire
      });
      
      if (response.data.success) {
        alert(response.data.message);
        chargerDemandes();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Demandes de Voiture</h1>
          <p className="text-gray-600 mt-1">Gestion des réservations de véhicules</p>
        </div>
        
        {userRole === 'demandeur' && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} />
            Nouvelle Demande
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>N° Demande</th>
                <th>Date Proposée</th>
                <th>Demandeur</th>
                <th>Objet</th>
                <th>Véhicule</th>
                <th>Chauffeur</th>
                <th>Statut</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">Chargement...</td>
                </tr>
              ) : demandes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-500">
                    Aucune demande trouvée
                  </td>
                </tr>
              ) : (
                demandes.map((demande) => (
                  <tr key={demande.id}>
                    <td className="font-medium">{demande.numero_demande}</td>
                    <td>{new Date(demande.date_proposee).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <div className="font-medium">{demande.demandeur_nom} {demande.demandeur_prenom}</div>
                      <div className="text-xs text-gray-500">{demande.service}</div>
                    </td>
                    <td>{demande.objet}</td>
                    <td>{demande.immatriculation || '-'}</td>
                    <td>{demande.chauffeur_nom ? `${demande.chauffeur_nom} ${demande.chauffeur_prenom}` : '-'}</td>
                    <td>
                      <span className={`badge ${
                        demande.statut === 'valide' ? 'badge-success' :
                        demande.statut.includes('attente') ? 'badge-warning' :
                        demande.statut.includes('rejete') ? 'badge-error' :
                        'badge-info'
                      }`}>
                        {demande.statut}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {(userRole === 'logistique' && demande.statut === 'en_attente_logistique') && (
                          <button
                            onClick={() => {
                              setSelectedDemande(demande);
                              chargerRessourcesDisponibles(demande.date_proposee);
                              setShowAffectationModal(true);
                            }}
                            className="btn btn-success btn-sm"
                          >
                            Affecter
                          </button>
                        )}
                        
                        {(userRole === 'raf' && demande.statut === 'en_attente_raf') && (
                          <>
                            <button
                              onClick={() => handleApprouver(demande.id, true)}
                              className="btn btn-success btn-sm"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleApprouver(demande.id, false)}
                              className="btn btn-secondary btn-sm"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        
                        {demande.statut === 'valide' && (
                          <button
                            onClick={() => demandesVoitureAPI.downloadPDF(demande.id)}
                            className="text-green-600 hover:text-green-800"
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
      </div>

      {/* Modal Nouvelle Demande */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle Demande de Voiture</h2>
              <button onClick={() => setShowModal(false)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Date proposée *</label>
                  <input
                    type="date"
                    value={formData.date_proposee}
                    onChange={(e) => setFormData({...formData, date_proposee: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Heure de départ</label>
                  <input
                    type="time"
                    value={formData.heure_depart_souhaitee}
                    onChange={(e) => setFormData({...formData, heure_depart_souhaitee: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Objet *</label>
                <textarea
                  value={formData.objet}
                  onChange={(e) => setFormData({...formData, objet: e.target.value})}
                  className="form-textarea"
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Itinéraire</label>
                <textarea
                  value={formData.itineraire}
                  onChange={(e) => setFormData({...formData, itineraire: e.target.value})}
                  className="form-textarea"
                  rows="2"
                  placeholder="Ex: Antananarivo - Antsirabe - Antananarivo"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Personnes transportées</label>
                <input
                  type="text"
                  value={formData.personnes_transportees}
                  onChange={(e) => setFormData({...formData, personnes_transportees: e.target.value})}
                  className="form-input"
                  placeholder="Ex: Jean Rakoto, Marie Rabe"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Heure probable de retour</label>
                <input
                  type="time"
                  value={formData.heure_retour_probable}
                  onChange={(e) => setFormData({...formData, heure_retour_probable: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button onClick={handleSubmit} className="btn btn-primary flex-1">
                  Soumettre
                </button>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Affectation */}
      {showAffectationModal && selectedDemande && (
        <div className="modal-overlay" onClick={() => setShowAffectationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Affecter Véhicule et Chauffeur</h2>
              <button onClick={() => setShowAffectationModal(false)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Véhicule *</label>
                <select
                  value={affectationData.vehicule_id}
                  onChange={(e) => setAffectationData({...affectationData, vehicule_id: e.target.value})}
                  className="form-select"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {vehiculesDisponibles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} - {v.marque} {v.modele}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chauffeur *</label>
                <select
                  value={affectationData.chauffeur_id}
                  onChange={(e) => setAffectationData({...affectationData, chauffeur_id: e.target.value})}
                  className="form-select"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {chauffeursDisponibles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom} - Permis {c.type_permis}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Commentaire</label>
                <textarea
                  value={affectationData.commentaire}
                  onChange={(e) => setAffectationData({...affectationData, commentaire: e.target.value})}
                  className="form-textarea"
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button onClick={() => handleAffecter(true)} className="btn btn-success flex-1">
                  Approuver et Envoyer au RAF
                </button>
                <button onClick={() => handleAffecter(false)} className="btn btn-secondary">
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandesVoiture;