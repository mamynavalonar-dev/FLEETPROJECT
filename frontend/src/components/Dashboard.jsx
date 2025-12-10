// fleet-management-frontend/src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [error, setError] = useState(null);
  const hasFetched = useRef(false); // 🔴 Empêche les appels multiples

  useEffect(() => {
    // 🔴 Protection contre les appels multiples
    if (hasFetched.current) return;
    hasFetched.current = true;

    let isMounted = true;
    
    const chargerDonnees = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const statsResponse = await statsAPI.getGlobal();
        
        if (isMounted && statsResponse.data.success && statsResponse.data.global) {
          setStats(statsResponse.data.global);
        }

        try {
          const alertesResponse = await dashboardAPI.alertes();
          if (isMounted && alertesResponse.data.success) {
            setAlertes(alertesResponse.data.data.slice(0, 5));
          }
        } catch (alertError) {
          console.log('Alertes non disponibles');
        }
        
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        
        if (isMounted) {
          setError(handleAPIError(error).message);
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
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    chargerDonnees();
    
    return () => {
      isMounted = false;
    };
  }, []); // 🔴 Dépendances vides

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
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-yellow-800">Connexion au serveur limitée</p>
            <p className="text-sm text-yellow-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600 mt-1">Bienvenue sur votre système de gestion Fleet</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Véhicules Disponibles" value={stats.vehicules_disponibles || 0} icon={Car} color="green" subtitle="Prêts à partir" />
        <StatCard title="En Mission" value={stats.vehicules_en_mission || 0} icon={Clock} color="blue" subtitle="Actuellement utilisés" />
        <StatCard title="Demandes en Attente" value={stats.demandes_en_attente || 0} icon={AlertCircle} color="orange" subtitle="À traiter" />
        <StatCard title="Carburant du Mois" value={stats.montant_total_mois ? `${(stats.montant_total_mois / 1000000).toFixed(1)}M` : '0'} icon={Fuel} color="purple" subtitle={stats.litres_total_mois ? `${Math.round(stats.litres_total_mois)} litres` : '0 litres'} />
      </div>
    </div>
  );
};

export default React.memo(Dashboard); // 🔴 Mémoisation du composant