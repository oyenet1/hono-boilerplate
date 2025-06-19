import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  bcryptRounds: 10,
  database: {
    url: process.env.DATABASE_URL || 'file:./local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  },
};
