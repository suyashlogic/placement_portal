import env from '../config/env.js';

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Express recognizes error middleware by its four arguments
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      status === 500 && env.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
  });
};