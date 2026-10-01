import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import env from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());

// credentials: true is required later so the session cookie is sent
app.use(cors({ origin: env.clientUrl, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;