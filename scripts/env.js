import { config } from 'dotenv';

if (!process.env.GITHUB_ACTIONS && !process.env.CI) {
  config();
}