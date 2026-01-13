import '@testing-library/jest-dom/vitest';
import { config } from 'dotenv';

// Load environment variables from .env for tests
config();

// Override DATABASE_URL to use test database for integration tests
// This ensures all code (including tenantPool) uses the test database
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://openinsights:openinsights_dev@localhost:5433/openinsights_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
