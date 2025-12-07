// fleet-management-frontend/src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Car, Clock, AlertCircle, Fuel, Plus, TrendingUp, 
  Users, FileText, Calendar, BarChart3 
} from 'lucide-react';
import { dashboardAPI, statsAPI, handleAPIError } from '../services/api';

const Dashboard = ({ userRole }) => {
  const [stats, setStats] = useState({
    vehicules_disponibles: 0,
    vehicules_en_mission: 0,
    vehicules_maintenance: 0,
    demandes_en_attente: 0,
    demandes_validees: 0,
    montant_total_mois: 0,
    litres_total_mois: 0,
    consommation_moyenne: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [alertes, setAlertes] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      // Charger les statistiques
      const statsResponse = await statsAPI.getGlobal();
      if (statsResponse.data.success && statsResponse.data.global) {
        setStats(statsResponse.data.global);
      }

      // Charger les alertes
      const alertesResponse = await dashboardAPI.alertes();
      if (alertesResponse.data.success) {
        setAlertes(alertesResponse.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      const errorInfo = handleAPIError(error);
      // Utiliser des données de démo en cas d'erreur
      setStats({
        vehicules_disponibles: 12,
        vehicules_en_mission: 5,
        vehicules_maintenance: 2,
        demandes_en_attente: 8,
        demandes_validees: 45,
        montant_total_mois: 15000000,
        litres_total_mois: 2850,
        consommation_moyenne: 15.3
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    if (!montant) return '0 Ar';
    return new Intl.NumberFormat('fr-MG', {
      style: 'decimal',
      minimumFractionDigits: 0
    }).format(montant) + ' Ar';
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`bg-${color}-50 p-4 rounded-lg`}>
          <Icon className={`text-${color}-600`} size={32} />
        </div>
      </div>
    </div>
  );

  const ActionButton = ({ title, icon: Icon, color, onClick, description }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
    >
      <div className={`bg-${color}-100 p-4 rounded-full`}>
        <Icon size={32} className={`text-${color}-600`} />
      </div>
      <div className="text-center">
        <span className="text-sm font-semibold block">{title}</span>
        {description && (
          <span className="text-xs text-gray-500 mt-1 block">{description}</span>
        )}
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600 mt-1">
            Bienvenue sur votre système de gestion Fleet
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Véhicules Disponibles"
          value={stats.vehicules_disponibles || 0}
          icon={Car}
          color="green"
          subtitle="Prêts à partir"
        />
        <StatCard
          title="En Mission"
          value={stats.vehicules_en_mission || 0}
          icon={Clock}
          color="blue"
          subtitle="Actuellement utilisés"
        />
        <StatCard
          title="Demandes en Attente"
          value={stats.demandes_en_attente || 0}
          icon={AlertCircle}
          color="orange"
          subtitle="À traiter"
        />
        <StatCard
          title="Carburant du Mois"
          value={stats.montant_total_mois ? `${(stats.montant_total_mois / 1000000).toFixed(1)}M` : '0'}
          icon={Fuel}
          color="purple"
          subtitle={stats.litres_total_mois ? `${Math.round(stats.litres_total_mois)} litres` : '0 litres'}
        />
      </div>

      {/* Statistiques secondaires */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Consommation Moyenne</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {stats.consommation_moyenne?.toFixed(1) || '0'} L/100km
          </p>
          <p className="text-xs text-gray-500 mt-1">Ce mois</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded">
              <FileText className="text-green-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Demandes Validées</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.demandes_validees || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Ce mois</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 p-2 rounded">
              <Car className="text-orange-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">En Maintenance</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {stats.vehicules_maintenance || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Véhicules</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={24} className="text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Actions Rapides</h2>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {userRole === 'demandeur' && (
            <>
              <ActionButton
                title="Demander Carburant"
                icon={Fuel}
                color="blue"
                description="Nouvelle demande"
                onClick={() => window.location.href = '#demandes-carburant'}
              />
              <ActionButton
                title="Demander Véhicule"
                icon={Car}
                color="green"
                description="Réserver un véhicule"
                onClick={() => window.location.href = '#demandes-voiture'}
              />
            </>
          )}
          
          {(userRole === 'logistique' || userRole === 'admin') && (
            <>
              <ActionButton
                title="Ajouter Véhicule"
                icon={Plus}
                color="purple"
                description="Nouveau véhicule"
                onClick={() => window.location.href = '#vehicules'}
              />
              <ActionButton
                title="Gérer Chauffeurs"
                icon={Users}
                color="indigo"
                description="Équipe de conduite"
                onClick={() => window.location.href = '#chauffeurs'}
              />
              <ActionButton
                title="Import Excel"
                icon={FileText}
                color="blue"
                description="Suivi carburant"
                onClick={() => window.location.href = '#suivi-carburant'}
              />
            </>
          )}
          
          {(userRole === 'raf' || userRole === 'admin') && (
            <ActionButton
              title="Valider Demandes"
              icon={FileText}
              color="green"
              description={`${stats.demandes_en_attente || 0} en attente`}
              onClick={() => window.location.href = '#demandes-carburant'}
            />
          )}
        </div>
      </div>

      {/* Alertes et Activités récentes */}
      <div className="grid grid-cols-2 gap-6">
        {/* Alertes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="text-orange-600" size={20} />
              Alertes Récentes
            </h3>
            {alertes.length > 0 && (
              <span className="badge badge-warning">{alertes.length}</span>
            )}
          </div>
          
          <div className="space-y-3">
            {alertes.length > 0 ? (
              alertes.map((alerte, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertCircle className="text-orange-600 flex-shrink-0 mt-1" size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alerte.message}</p>
                    {alerte.immatriculation && (
                      <p className="text-xs text-gray-600 mt-1">
                        Véhicule: {alerte.immatriculation}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune alerte</p>
              </div>
            )}
          </div>
        </div>

        {/* Activités récentes */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-blue-600" size={20} />
            Activités Récentes
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Demande de carburant approuvée</p>
                <p className="text-xs text-gray-600 mt-1">Il y a 2 heures</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Véhicule 39963WWT disponible</p>
                <p className="text-xs text-gray-600 mt-1">Il y a 4 heures</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Import Excel réussi</p>
                <p className="text-xs text-gray-600 mt-1">Hier à 15:30</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;