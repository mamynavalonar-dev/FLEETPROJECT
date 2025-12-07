// fleet-management-frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Car, Fuel, FileText, Users, BarChart3, DollarSign } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DemandesCarburant from './components/DemandesCarburant';
import DemandesVoiture from './components/DemandesVoiture';
import SuiviCarburant from './components/SuiviCarburant';
import Vehicules from './components/Vehicules';
import Chauffeurs from './components/Chauffeurs';
import { authAPI } from './services/api';
import './App.css';

function App() {
  const [ongletActif, setOngletActif] = useState('dashboard');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // CORRECTION: Utiliser un useEffect qui ne s'exécute qu'une fois
    const mockUser = {
      id: 1,
      nom: 'Admin',
      prenom: 'Système',
      email: 'admin@prirtem.mg',
      role: 'admin'
    };
    setUser(mockUser);
  }, []); // 🔴 IMPORTANT: Tableau vide pour une seule exécution

  const handleRoleChange = (newRole) => {
    setUser(prev => ({ ...prev, role: newRole })); // 🔴 CORRECTION: Utiliser la forme fonctionnelle
  };

  // 🔴 CORRECTION: Mémoriser la fonction pour éviter les re-renders
  const renderContent = React.useMemo(() => {
    switch (ongletActif) {
      case 'dashboard':
        return <Dashboard userRole={user?.role} />;
      case 'demandes_carburant':
        return <DemandesCarburant userRole={user?.role} userId={user?.id} />;
      case 'demandes_voiture':
        return <DemandesVoiture userRole={user?.role} userId={user?.id} />;
      case 'suivi_carburant':
        return <SuiviCarburant userRole={user?.role} />;
      case 'vehicules':
        return <Vehicules userRole={user?.role} />;
      case 'chauffeurs':
        return <Chauffeurs userRole={user?.role} />;
      default:
        return <Dashboard userRole={user?.role} />;
    }
  }, [ongletActif, user?.role, user?.id]); // 🔴 Dépendances minimales

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['demandeur', 'logistique', 'raf', 'admin'] },
    { id: 'demandes_carburant', label: 'Demandes Carburant', icon: Fuel, roles: ['demandeur', 'logistique', 'raf', 'admin'] },
    { id: 'demandes_voiture', label: 'Demandes Voiture', icon: FileText, roles: ['demandeur', 'logistique', 'raf', 'admin'] },
    { id: 'suivi_carburant', label: 'Suivi Carburant', icon: DollarSign, roles: ['logistique', 'admin'] },
    { id: 'vehicules', label: 'Véhicules', icon: Car, roles: ['logistique', 'admin'] },
    { id: 'chauffeurs', label: 'Chauffeurs', icon: Users, roles: ['logistique', 'admin'] }
  ];

  const visibleMenuItems = React.useMemo(() => 
    menuItems.filter(item => item.roles.includes(user?.role)),
    [user?.role]
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <div className="logo">
              <Car size={32} />
            </div>
            <div className="brand-text">
              <h1>PRIRTEM Fleet</h1>
              <p>Système de Gestion Intégré</p>
            </div>
          </div>
          
          <div className="navbar-actions">
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="role-selector"
            >
              <option value="demandeur">Demandeur</option>
              <option value="logistique">Logistique</option>
              <option value="raf">RAF</option>
              <option value="admin">Admin</option>
            </select>
            
            <div className="user-info">
              <span>{user.nom} {user.prenom}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="nav-menu">
        <div className="nav-menu-content">
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setOngletActif(item.id)}
                className={`nav-item ${ongletActif === item.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="main-content">
        <div className="content-wrapper">
          {renderContent}
        </div>
      </main>
    </div>
  );
}

export default App;