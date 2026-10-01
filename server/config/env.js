import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES modules have no __dirname, so we rebuild it
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env lives in the project root, one level above /server
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const required = ['PG_USER', 'PG_HOST', 'PG_DATABASE'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET,
  db: {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: Number(process.env.PG_PORT) || 5432,
    // SSL only for hosted databases; local PostgreSQL normally has none
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
};

export default env;