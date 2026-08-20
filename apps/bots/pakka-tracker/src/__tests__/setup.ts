// Test setup file
// Load environment variables for testing
import * as dotenv from 'dotenv';

dotenv.config();

jest.setTimeout(10000);

// Dummy test to avoid "Your test suite must contain at least one test"
describe('setup', () => {
  it('should be a valid test environment', () => {
    expect(true).toBe(true);
  });
});
