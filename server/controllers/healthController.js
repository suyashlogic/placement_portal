import { query } from '../config/db.js';

export const checkHealth = async (req, res) => {
  const result = await query('SELECT NOW() AS server_time');

  res.status(200).json({
    success: true,
    message: 'API is running',
    data: {
      api: 'running',
      database: 'connected',
      serverTime: result.rows[0].server_time,
    },
  });
};