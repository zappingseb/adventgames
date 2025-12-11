import { useState, useEffect } from 'react';
import { getApiHeaders } from '../../config/apiConfig';
import './PuzzleSelection.css';

export interface Puzzle {
  id: string;
  title: string;
  description?: string;
}

interface PuzzleSelectionProps {
  onSelect: (puzzle: Puzzle) => void;
}

function PuzzleSelection({ onSelect }: PuzzleSelectionProps) {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPuzzles();
  }, []);

  const loadPuzzles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/puzzles', {
        headers: getApiHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Failed to load puzzles: ${response.statusText}`);
      }
      const data = await response.json();
      setPuzzles(data.puzzles || []);
    } catch (err) {
      console.error('Error loading puzzles:', err);
      setError('Failed to load puzzles');
    } finally {
      setLoading(false);
    }
  };

  const getPreviewUrl = async (puzzleId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/preview`, {
        headers: getApiHeaders(),
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error('Error loading preview:', err);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="puzzle-selection">
        <div className="puzzle-selection-loading">Loading puzzles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="puzzle-selection">
        <div className="puzzle-selection-error">{error}</div>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="puzzle-selection">
        <div className="puzzle-selection-empty">No puzzles available</div>
      </div>
    );
  }

  return (
    <div className="puzzle-selection">
      <h1 className="puzzle-selection-title">Puzzling game</h1>
      <h2>Choose a Puzzle</h2>
      <div className="puzzle-grid">
        {puzzles.map((puzzle) => (
          <PuzzleCard
            key={puzzle.id}
            puzzle={puzzle}
            onSelect={onSelect}
            getPreviewUrl={getPreviewUrl}
          />
        ))}
      </div>
    </div>
  );
}

interface PuzzleCardProps {
  puzzle: Puzzle;
  onSelect: (puzzle: Puzzle) => void;
  getPreviewUrl: (puzzleId: string) => Promise<string | null>;
}

function PuzzleCard({ puzzle, onSelect, getPreviewUrl }: PuzzleCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreview();
  }, [puzzle.id]);

  const loadPreview = async () => {
    const url = await getPreviewUrl(puzzle.id);
    setPreviewUrl(url);
    setLoading(false);
  };

  return (
    <div
      className="puzzle-card"
      onClick={() => onSelect(puzzle)}
    >
      {loading ? (
        <div className="puzzle-card-loading">Loading...</div>
      ) : previewUrl ? (
        <img src={previewUrl} alt={puzzle.title} className="puzzle-card-image" />
      ) : (
        <div className="puzzle-card-placeholder">No preview</div>
      )}
      <div className="puzzle-card-title">{puzzle.title}</div>
      {puzzle.description && (
        <div className="puzzle-card-description">{puzzle.description}</div>
      )}
    </div>
  );
}

export default PuzzleSelection;

