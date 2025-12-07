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
    // Simuler un utilisateur connecté pour le développement
    // En production, utiliser authAPI.getCurrentUser()
    const mockUser = {
      id: 1,
      nom: 'Admin',
      prenom: 'Système',
      email: 'admin@prirtem.mg',
      role: 'admin' // demandeur, logistique, raf, admin
    };
    setUser(mockUser);
  }, []);

  const handleRoleChange = (newRole) => {
    setUser({ ...user, role: newRole });
  };

  const renderContent = () => {
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
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['demandeur', 'logistique', 'raf', 'admin'] },
    { id: 'demandes_carburant', label: 'Demandes Carburant', icon: Fuel, roles: ['demandeur', 'logistique', 'raf', 'admin'] },
    { id: 'demandes_voiture', label: 'Demandes Voiture', icon: FileText, roles: ['demandeur', 'logistique', 'raf', 'admin'] },
    { id: 'suivi_carburant', label: 'Suivi Carburant', icon: DollarSign, roles: ['logistique', 'admin'] },
    { id: 'vehicules', label: 'Véhicules', icon: Car, roles: ['logistique', 'admin'] },
    { id: 'chauffeurs', label: 'Chauffeurs', icon: Users, roles: ['logistique', 'admin'] }
  ];

  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="app">
      {/* Navbar */}
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
              value={user?.role || 'demandeur'}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="role-selector"
            >
              <option value="demandeur">Demandeur</option>
              <option value="logistique">Logistique</option>
              <option value="raf">RAF</option>
              <option value="admin">Admin</option>
            </select>
            
            <div className="user-info">
              <span>{user?.nom} {user?.prenom}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Menu de navigation */}
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

      {/* Contenu principal */}
      <main className="main-content">
        <div className="content-wrapper">
          {user ? renderContent() : (
            <div className="loading">Chargement...</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;