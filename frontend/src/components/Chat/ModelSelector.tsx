import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface ModelInfo {
  id: string;
  name: string;
  size?: number;
  path?: string;
}

interface ModelSelectorProps {
  onModelChange: (modelId: string) => void;
  currentModel: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, currentModel }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await api.getModels();
        
        // Format the models for display
        const formattedModels = response.map((model: any) => ({
          id: typeof model === 'string' ? model : model.id || model.name || model,
          name: typeof model === 'string' ? model : model.name || model.id || model,
          path: typeof model === 'string' ? model : model.path,
        }));

        setModels(formattedModels);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError('Failed to load models. Using default model.');
        setModels([{ id: 'default', name: 'Default Model (glm-edge-1.5b-chat.Q5_K_M.gguf)', path: 'glm-edge-1.5b-chat.Q5_K_M.gguf' }]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedModelId = e.target.value;
    onModelChange(selectedModelId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
        <span className="ml-2 text-xs text-gray-500">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="model-select" className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
        Select Model
      </label>
      <select
        id="model-select"
        value={currentModel}
        onChange={handleChange}
        className="w-full bg-black/50 border border-gray-700/50 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-xs text-cyan-100"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      {error && (
        <div className="mt-1 text-xs text-red-500 font-mono">
          {error}
        </div>
      )}
    </div>
  );
};