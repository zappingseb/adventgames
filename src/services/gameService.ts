import { getApiHeaders } from '../config/apiConfig';

export interface Game {
  code: string;
  name: string;
  title: string;
  description: string;
  path: string;
  activated: boolean;
}

export async function getGames(): Promise<Game[]> {
  try {
    const response = await fetch('/api/games', {
      headers: getApiHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
}

export async function activateGame(code: string): Promise<Game> {
  try {
    const response = await fetch('/api/games/activate', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to activate game');
    }
    
    const data = await response.json();
    return data.game;
  } catch (error) {
    console.error('Error activating game:', error);
    throw error;
  }
}

