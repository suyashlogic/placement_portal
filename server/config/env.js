import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES modules have no __dirname, so we rebuild it
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env lives in the project root, one level above /server
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const required = ['PG_USER', 'PG_HOST', 'PG_DATABASE', 'SESSION_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const emailPort = Number(process.env.EMAIL_PORT) || 587;

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
  email: {
    // No EMAIL_HOST = dry-run mode: emails are built and logged but never sent.
    host: process.env.EMAIL_HOST || '',
    port: emailPort,
    secure: emailPort === 465,            // 465 = TLS from the start; 587/2525 = STARTTLS when offered
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'Placement Cell <no-reply@placement.local>',
  },
  remindersEnabled: process.env.REMINDERS_ENABLED !== 'false',
};

export default env;
