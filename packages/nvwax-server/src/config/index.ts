import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  skillhubApiUrl: process.env.SKILLHUB_API_URL || 'https://skillhub.proclaw.cc/api',
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: './data/nvwax.db'
};
