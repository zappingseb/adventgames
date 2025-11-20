export interface LeaderboardEntry {
  username: string;
  flakes: number;
  timestamp: string;
}

export async function getLeaderboard(gameName: string): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(`/api/scores/${gameName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }
    const data = await response.json();
    // Return top 5 scores (they're already sorted by flakes descending)
    return data.slice(0, 5);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

