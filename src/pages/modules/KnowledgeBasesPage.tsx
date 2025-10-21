import React, { useState } from 'react';
import { KnowledgeBaseManager } from '@/components/business/knowledge-base/KnowledgeBaseManager';
import { KnowledgeBaseCreator } from '@/components/business/knowledge-base/KnowledgeBaseCreator';
import { KnowledgeBaseViewer } from '@/components/business/knowledge-base/KnowledgeBaseViewer';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'list' | 'create' | 'view';

export const KnowledgeBasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null);

  const handleBack = () => {
    navigate('/modules/business');
  };

  const handleCreateNew = () => {
    setCurrentView('create');
  };

  const handleView = (id: string) => {
    setSelectedKnowledgeBaseId(id);
    setCurrentView('view');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedKnowledgeBaseId(null);
  };

  if (currentView === 'create') {
    return <KnowledgeBaseCreator onBack={handleBackToList} />;
  }

  if (currentView === 'view' && selectedKnowledgeBaseId) {
    return (
      <KnowledgeBaseViewer 
        knowledgeBaseId={selectedKnowledgeBaseId}
        onBack={handleBackToList} 
      />
    );
  }

  // Default list view
  return (
    <KnowledgeBaseManager 
      onBack={handleBack}
      onCreateNew={handleCreateNew}
      onView={handleView}
    />
  );
};
