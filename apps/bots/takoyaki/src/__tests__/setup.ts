// Test setup file
// Load environment variables for testing
import * as dotenv from 'dotenv';

dotenv.config();

// Mock environment variables if needed
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'mock-api-key';
process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || JSON.stringify({
  client_email: 'test@test.com',
  private_key: 'mock-key',
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Dummy test to avoid "no tests" error
describe('setup', () => {
  it('should load environment variables', () => {
    expect(process.env.GOOGLE_API_KEY).toBeDefined();
  });
});
