// Special charity reward group names for this season
const SPECIAL_GROUP_NAMES: Record<number, string> = {
  1: 'S56 Degens',
  2: 'League Of Champions',
  3: 'Icebear Stinks',
};

/**
 * Helper function to get the display name for a fantasy group
 * Handles special charity reward group names for this season
 * Groups 1-3 have special names, other groups display as "Group X"
 * @param group - The group identifier (number or string)
 * @returns Formatted display string for the group
 */
export const getGroupDisplayName = (group: number | string): string => {
  // If it's already a string (from the sheet), return as-is
  if (typeof group === 'string') {
    return group;
  }

  // Check if this number maps to a special name
  if (group in SPECIAL_GROUP_NAMES) {
    return SPECIAL_GROUP_NAMES[group];
  }

  // Otherwise, use standard "Group X" format
  return `Group ${group}`;
};

/**
 * Helper function to normalize group search key
 * When user searches for group 1, 2, or 3, return the special name from the sheet
 * Otherwise, return the number as-is
 * @param searchKey - The group number to search for
 * @returns The actual group value to search for in the data
 */
export const normalizeGroupSearchKey = (searchKey: number): number | string => {
  if (searchKey in SPECIAL_GROUP_NAMES) {
    return SPECIAL_GROUP_NAMES[searchKey];
  }
  return searchKey;
};

/**
 * Helper function to format group information for display
 * @param group - The group identifier (number or string)
 * @returns The group value as a string for display purposes
 */
export const formatGroupValue = (group: number | string): string => {
  return String(group);
};
