import { useEffect, useState } from 'react';
import { getApiHeaders } from '../../config/apiConfig';
import './LevelCompletion.css';

interface LevelCompletionProps {
  level: number;
  onNextLevel: () => void;
}

function LevelCompletion({ level, onNextLevel }: LevelCompletionProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const fetchImage = async (retries = 3) => {
      setLoading(true);
      setError(false);
      setImageLoaded(false);
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const levelStr = level.toString().padStart(2, '0');
          
          // Wait longer for backend to be ready, with exponential backoff
          const delay = 500 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const response = await fetch(`/api/images/liv/${levelStr}`, {
            headers: getApiHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              // Set the signed URL - the image will load asynchronously
              setImageUrl(data.url);
              setLoading(false);
              return; // Success, exit retry loop
            } else {
              console.warn('No URL in response:', data);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`Attempt ${attempt + 1} failed:`, response.status, errorData);
            if (attempt === retries - 1) {
              // Last attempt failed
              setError(true);
              setLoading(false);
              return;
            }
            // Continue to next retry
            continue;
          }
        } catch (err) {
          console.warn(`Attempt ${attempt + 1} error:`, err);
          if (attempt === retries - 1) {
            // Last attempt failed
            console.error('Failed to fetch image after retries:', err);
            setError(true);
            setLoading(false);
            return;
          }
          // Continue to next retry
          continue;
        }
      }
      
      // If we get here, all retries failed
      setError(true);
      setLoading(false);
    };

    fetchImage();
  }, [level]);

  return (
    <div className="level-completion">
      <h2>Level {level} finished!</h2>
      {loading && <p className="loading">Loading image...</p>}
      {error && <p className="error">Image not available</p>}
      {imageUrl && !loading && (
        <div className="image-container">
          {!imageLoaded && <p className="loading">Loading image from cloud...</p>}
          <img 
            src={imageUrl} 
            alt={`Level ${level} completion`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              console.error('Failed to load image from URL:', imageUrl);
              setError(true);
              setImageLoaded(false);
            }}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        </div>
      )}
      <button className="next-level-btn" onClick={onNextLevel}>
        Next Level
      </button>
    </div>
  );
}

export default LevelCompletion;

