// fleet-management-frontend/src/components/SuiviCarburant.jsx
import React, { useState, useEffect } from 'react';
import { Upload, Download, Filter, Search, AlertCircle } from 'lucide-react';
import { suiviCarburantAPI, importAPI, handleAPIError } from '../services/api';

const SuiviCarburant = ({ userRole }) => {
  const [suivis, setSuivis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

    try {
      const response = await importAPI.excel(file, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      if (response.data.success) {
        alert(`Import réussi!\nType détecté: ${response.data.typeFichier}\nSuccès: ${response.data.resultats.succes}\nAvertissements: ${response.data.resultats.avertissements}\nErreurs: ${response.data.resultats.erreurs}`);
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
      </div>

      {/* Tableau */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12">Chargement...</div>
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
                      Aucun suivi trouvé. Importez un fichier Excel pour commencer.
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
    </div>
  );
};

export default SuiviCarburant;