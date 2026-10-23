import { Sequelize } from 'sequelize';

export function createDatabaseConnection(env, logger) {
  const options = {
    dialect: 'postgres',
    logging: env.DB_LOGGING ? (sql) => logger.debug({ sql }, 'Database query') : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30_000,
      idle: 10_000,
    },
    define: {
      underscored: true,
      timestamps: true,
    },
  };

  if (env.DATABASE_URL) {
    return new Sequelize(env.DATABASE_URL, options);
  }

  return new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    ...options,
    host: env.DB_HOST,
    port: env.DB_PORT,
  });
}

export async function testDatabaseConnection(sequelize) {
  await sequelize.authenticate();
}

export async function closeDatabaseConnection(sequelize) {
  await sequelize.close();
}
