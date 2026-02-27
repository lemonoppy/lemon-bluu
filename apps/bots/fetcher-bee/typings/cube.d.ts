export interface Cube {
  id: string;
  setCode: string;
  description: string;
  hasDefaultLayout?: boolean; // True if cube uses 3x5 card layout (default: false)
  isSet?: boolean;
}

export interface CubeSelection {
  key: string;
  cube: Cube;
}

export interface CubeUsageStats {
  cubeKey: string;
  count: number;
  lastUsed?: Date;
}

export interface CubeSelectionHistory {
  cubeKey: string;
  userId: string;
  username: string;
  timestamp: Date;
}