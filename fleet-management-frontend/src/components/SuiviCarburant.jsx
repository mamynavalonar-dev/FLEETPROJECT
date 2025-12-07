// fleet-management-frontend/src/components/SuiviCarburant.jsx - AMÉLIORÉ
import React, { useState, useEffect } from 'react';
import { Upload, Download, Filter, Search, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { suiviCarburantAPI, importAPI, handleAPIError } from '../services/api';

const SuiviCarburant = ({ userRole }) => {
  const [suivis, setSuivis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  
  const [filtres, setFiltres] = useState({
    type_suivi: '',
    date_debut: '',
    date_fin: '',
    immatriculation: '',
    statut: ''
  });

  useEffect(() => {
    chargerSuivis();
  }, [filtres]);

  const chargerSuivis = async () => {
    setLoading(true);
    try {
      const response = await suiviCarburantAPI.getAll(filtres);
      if (response.data.success) {
        setSuivis(response.data.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const response = await importAPI.excel(file, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      if (response.data.success) {
        setUploadResult(response.data);
        setShowResultModal(true);
        chargerSuivis();
      }
    } catch (error) {
      alert('Erreur: ' + handleAPIError(error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Suivi Carburant</h1>
          <p className="text-gray-600 mt-1">Import et gestion des consommations</p>
        </div>

        <label className="btn btn-primary cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
            disabled={uploading}
          />
          <Upload size={18} />
          {uploading ? `Import... ${uploadProgress}%` : 'Importer Excel'}
        </label>
      </div>

      {/* Barre de progression */}
      {uploading && (
        <div className="card">
          <div className="mb-2 flex justify-between text-sm">
            <span>Import en cours...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} />
          <h3 className="font-semibold">Filtres</h3>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Type</label>
            <select
              value={filtres.type_suivi}
              onChange={(e) => setFiltres({...filtres, type_suivi: e.target.value})}
              className="form-select"
            >
              <option value="">Tous</option>
              <option value="suivi_carburant">Suivi Carburant</option>
              <option value="groupe_electrogene">Groupe Électrogène</option>
              <option value="autres_carburants">Autres Carburants</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Immatriculation</label>
            <input
              type="text"
              value={filtres.immatriculation}
              onChange={(e) => setFiltres({...filtres, immatriculation: e.target.value})}
              className="form-input"
              placeholder="Rechercher..."
            />
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
          <strong>{suivis.length}</strong> entrée(s) trouvée(s)
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
                  <th>Date</th>
                  <th>Type</th>
                  <th>Immat/Équipement</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Litres</th>
                  <th className="text-right">KM Jour.</th>
                  <th className="text-right">Conso.</th>
                  <th className="text-center">Replein</th>
                  <th>Anomalie</th>
                </tr>
              </thead>
              <tbody>
                {suivis.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <FileText size={48} className="text-gray-300" />
                        <p className="text-lg font-medium">Aucun suivi trouvé</p>
                        <p className="text-sm">Importez un fichier Excel pour commencer</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  suivis.map((suivi) => (
                    <tr key={suivi.id}>
                      <td>{new Date(suivi.date_operation).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span className={`badge ${
                          suivi.type_suivi === 'suivi_carburant' ? 'badge-info' :
                          suivi.type_suivi === 'groupe_electrogene' ? 'badge-success' :
                          'badge-warning'
                        }`}>
                          {suivi.type_suivi}
                        </span>
                      </td>
                      <td className="font-medium">{suivi.immatriculation || suivi.numero_equipement || '-'}</td>
                      <td className="text-right">{suivi.montant?.toLocaleString('fr-FR')} Ar</td>
                      <td className="text-right">{suivi.quantite_litres?.toFixed(1)} L</td>
                      <td className="text-right">{suivi.km_journalier || '-'}</td>
                      <td className="text-right">
                        <span className={suivi.consommation_aux_100 < 15 || suivi.consommation_aux_100 >= 16 ? 'text-red-600 font-bold' : ''}>
                          {suivi.consommation_aux_100?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="text-center">
                        {suivi.est_replein ? '✓' : '-'}
                      </td>
                      <td>
                        {suivi.anomalie ? (
                          <div className="flex items-center gap-1 text-red-600 text-sm">
                            <AlertCircle size={14} />
                            {suivi.anomalie}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Résultat d'Import */}
      {showResultModal && uploadResult && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Résultat de l'import</h2>
              <button onClick={() => setShowResultModal(false)}>
                <XCircle size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Résumé global */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📊 Fichier: {uploadResult.nomFichier}
                </h3>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{uploadResult.resultats.succes}</div>
                    <div className="text-sm text-gray-600">Succès</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{uploadResult.resultats.avertissements}</div>
                    <div className="text-sm text-gray-600">Avertissements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{uploadResult.resultats.erreurs}</div>
                    <div className="text-sm text-gray-600">Erreurs</div>
                  </div>
                </div>
              </div>

              {/* Détails par feuille */}
              <div>
                <h3 className="font-semibold mb-3">📄 Détails par feuille ({uploadResult.nombreFeuilles} feuille(s))</h3>
                <div className="space-y-3">
                  {Object.entries(uploadResult.parFeuille).map(([nomFeuille, stats]) => (
                    <div key={nomFeuille} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{nomFeuille}</h4>
                        <span className="badge badge-info">{stats.type}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium ml-2">{stats.lignes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} />
                          <span className="font-medium">{stats.succes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertCircle size={14} />
                          <span className="font-medium">{stats.avertissements}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle size={14} />
                          <span className="font-medium">{stats.erreurs}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Détails des erreurs */}
              {uploadResult.details && uploadResult.details.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">⚠️ Détails des anomalies (premières 10)</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadResult.details.slice(0, 10).map((detail, index) => (
                      <div 
                        key={index} 
                        className={`text-sm p-2 rounded ${
                          detail.statut === 'error' ? 'bg-red-50 text-red-800' :
                          'bg-orange-50 text-orange-800'
                        }`}
                      >
                        <div className="font-medium">
                          Feuille "{detail.feuille}", Ligne {detail.ligne}
                        </div>
                        <div className="text-xs mt-1">
                          {detail.erreurs?.join(', ') || detail.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  onClick={() => setShowResultModal(false)} 
                  className="btn btn-primary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviCarburant;