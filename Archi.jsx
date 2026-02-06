import React from 'react';
import { useSceneStore } from '../store/sceneStore';
import ToolSection from './ToolSection';
import PropertiesPanel from './PropertiesPanel';
import LayersPanel from './LayersPanel';
import StatsPanel from './StatsPanel';

function BIMPanel() {
  const { stats } = useSceneStore();

  const tools = [
    { id: 'wall', icon: 'fas fa-square', label: 'Mur' },
    { id: 'window', icon: 'fas fa-square', label: 'Fenêtre' },
    { id: 'door', icon: 'fas fa-door-open', label: 'Porte' },
    { id: 'furniture', icon: 'fas fa-couch', label: 'Mobilier' }
  ];

  return (
    <aside className="sidebar left">
      <div className="panel-header">
        <i className="fas fa-drafting-compass"></i>
        <h3>Mode BIM</h3>
        <span className="badge">ArchiCAD-like</span>
      </div>

      <ToolSection title="Outils de Création" icon="fas fa-draw-polygon" tools={tools} />
      <PropertiesPanel />
      <LayersPanel />
      <StatsPanel stats={stats} />
    </aside>
  );
}

export default BIMPanel;