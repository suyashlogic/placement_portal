import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

import env from './config/env.js';
import pool from './config/db.js';
import passport from './config/passport.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import studentRoutes from './routes/studentRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import driveRoutes from './routes/driveRoutes.js';

const app = express();
const PgSession = connectPgSimple(session);

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }), // sessions live in PostgreSQL
    name: 'placement.sid',
    secret: env.sessionSecret,
    resave: false,             // don't re-save unchanged sessions
    saveUninitialized: false,  // don't create sessions for visitors who never log in
    cookie: {
      httpOnly: true,          // JavaScript cannot read the cookie (protects against XSS theft)
      sameSite: 'lax',         // not sent on cross-site POSTs (basic CSRF protection)
      secure: env.nodeEnv === 'production', // HTTPS only in production
      maxAge: 1000 * 60 * 60 * 24 * 7,      // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);

app.use('/api/students', studentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/drives', driveRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;