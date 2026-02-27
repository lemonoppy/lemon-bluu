import LZString from 'lz-string';

export interface GameDataFiles {
  pbpData: any[];
  boxData: any[];
  playerData: any[];
}

/**
 * Fetch and decompress DSFL game data for a specific file number
 * DSFL uses Season 58 with the same compressed file format as ISFL
 */
export const fetchAndDecompressGameDataDSFL = async (
  fileNumber: number
): Promise<GameDataFiles | null> => {
  try {
    // DSFL Season 58 base URL
    const baseUrl = 'https://index.sim-football.com/DSFLS58';

    // Construct URLs for the three data files
    const pbpUrl = `${baseUrl}/Logs/pbpData${fileNumber}.txt`;
    const boxUrl = `${baseUrl}/Boxscores/boxscoreData${fileNumber}.txt`;
    const playerUrl = `${baseUrl}/Players/playerData${fileNumber}.txt`;

    const fetchWithTimeout = (url: string, timeoutMs: number = 30000) => {
      return Promise.race([
        fetch(url, {
          headers: { 'User-Agent': 'Chrome/47.0.2526.111' }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
        )
      ]);
    };

    const [pbpResponse, boxResponse, playerResponse] = await Promise.all([
      fetchWithTimeout(pbpUrl),
      fetchWithTimeout(boxUrl),
      fetchWithTimeout(playerUrl)
    ]);

    // Check if all responses are successful
    if (!pbpResponse.ok || !boxResponse.ok || !playerResponse.ok) {
      const errors = [];
      if (!pbpResponse.ok) errors.push(`PBP: ${pbpResponse.status} ${pbpResponse.statusText}`);
      if (!boxResponse.ok) errors.push(`Box: ${boxResponse.status} ${boxResponse.statusText}`);
      if (!playerResponse.ok) errors.push(`Player: ${playerResponse.status} ${playerResponse.statusText}`);
      throw new Error(`Failed to fetch DSFL data files: ${errors.join(', ')}`);
    }

    // Get the compressed text content
    const [pbpCompressed, boxCompressed, playerCompressed] = await Promise.all([
      pbpResponse.text(),
      boxResponse.text(),
      playerResponse.text()
    ]);

    // Decompress using LZString
    const pbpDecompressed = LZString.decompressFromEncodedURIComponent(pbpCompressed);
    const boxDecompressed = LZString.decompressFromEncodedURIComponent(boxCompressed);
    const playerDecompressed = LZString.decompressFromEncodedURIComponent(playerCompressed);

    // Check for decompression errors
    if (!pbpDecompressed || !boxDecompressed || !playerDecompressed) {
      throw new Error('Failed to decompress one or more DSFL data files');
    }

    // Parse JSON data
    let pbpData, boxData, playerData;
    try {
      pbpData = JSON.parse(pbpDecompressed);
      boxData = JSON.parse(boxDecompressed);
      playerData = JSON.parse(playerDecompressed);
    } catch (parseError) {
      throw new Error(`Failed to parse DSFL JSON data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    return {
      pbpData: Array.isArray(pbpData) ? pbpData : [pbpData],
      boxData: Array.isArray(boxData) ? boxData : [boxData],
      playerData: Array.isArray(playerData) ? playerData : [playerData]
    };

  } catch (error) {
    // Only log in development to avoid console statement linting errors
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(`Error fetching/decompressing DSFL data for file ${fileNumber}:`, error);
    }
    return null;
  }
};

/**
 * Fetch all DSFL game data files for Season 58 (typically files 1-10)
 */
export const fetchAllSeasonGameDataDSFL = async (): Promise<GameDataFiles> => {
  const allPbpData: any[] = [];
  const allBoxData: any[] = [];
  const allPlayerData: any[] = [];

  // Fetch files 1 through 10 (standard for most seasons)
  for (let fileNumber = 1; fileNumber <= 10; fileNumber++) {
    const gameData = await fetchAndDecompressGameDataDSFL(fileNumber);

    if (gameData) {
      allPbpData.push(...gameData.pbpData);
      allBoxData.push(...gameData.boxData);
      allPlayerData.push(...gameData.playerData);

      // Add a small delay between requests to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    pbpData: allPbpData,
    boxData: allBoxData,
    playerData: allPlayerData
  };
};

export const validateGameDataStructure = (gameData: GameDataFiles): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if data exists
  if (!gameData.pbpData || !Array.isArray(gameData.pbpData)) {
    errors.push('PBP data is missing or not an array');
  }

  if (!gameData.boxData || !Array.isArray(gameData.boxData)) {
    errors.push('Box score data is missing or not an array');
  }

  if (!gameData.playerData || !Array.isArray(gameData.playerData)) {
    errors.push('Player data is missing or not an array');
  }

  // Check basic structure of data
  if (gameData.pbpData.length > 0) {
    const pbpSample = gameData.pbpData[0];
    if (!pbpSample.id || (!pbpSample.Q1 && !pbpSample.Q2 && !pbpSample.Q3 && !pbpSample.Q4)) {
      errors.push('PBP data structure appears invalid (missing id or quarter data)');
    }
  }

  if (gameData.boxData.length > 0) {
    const boxSample = gameData.boxData[0];
    if (!boxSample.id || !boxSample.hAbb || !boxSample.aAbb) {
      errors.push('Box score data structure appears invalid (missing id, hAbb, or aAbb)');
    }
  }

  if (gameData.playerData.length > 0) {
    const playerSample = gameData.playerData[0];
    if (!playerSample.id || !playerSample.name) {
      errors.push('Player data structure appears invalid (missing id or name)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
