import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DataTypes, QueryTypes } from 'sequelize';
import { createDatabaseConnection, closeDatabaseConnection } from './database.js';
import { loadEnv } from './env.js';
import { createLogger } from './logger.js';

export async function runMigrations({
  sequelize,
  direction = 'up',
  directory = resolve('migrations'),
}) {
  const queryInterface = sequelize.getQueryInterface();
  const tableNames = await queryInterface.showAllTables();
  if (!tableNames.some((name) => String(name).toLowerCase() === 'sequelizemeta')) {
    await queryInterface.createTable('SequelizeMeta', {
      name: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    });
  }

  const files = (await readdir(directory)).filter((file) => file.endsWith('.js')).sort();
  const completed = await sequelize.query('SELECT name FROM "SequelizeMeta"', {
    type: QueryTypes.SELECT,
  });
  const appliedNames = new Set(completed.map((row) => row.name));

  if (direction === 'down') {
    const last = files.filter((file) => appliedNames.has(file)).at(-1);
    if (!last) return { applied: [], reverted: [] };
    const migration = await import(pathToFileURL(resolve(directory, last)).href);
    await sequelize.transaction(async (transaction) => {
      await migration.down(withTransaction(queryInterface, transaction), sequelize.constructor, {
        transaction,
      });
      await queryInterface.bulkDelete('SequelizeMeta', { name: last }, { transaction });
    });
    return { applied: [], reverted: [last] };
  }

  const pending = files.filter((file) => !appliedNames.has(file));
  const applied = [];
  for (const file of pending) {
    const migration = await import(pathToFileURL(resolve(directory, file)).href);
    await sequelize.transaction(async (transaction) => {
      await migration.up(withTransaction(queryInterface, transaction), sequelize.constructor, {
        transaction,
      });
      await queryInterface.bulkInsert('SequelizeMeta', [{ name: file }], { transaction });
    });
    applied.push(file);
  }
  return { applied, reverted: [] };
}

function withTransaction(queryInterface, transaction) {
  const transactionOptions = new Set([
    'addConstraint',
    'addIndex',
    'bulkDelete',
    'bulkInsert',
    'dropTable',
  ]);
  return new Proxy(queryInterface, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => {
        if (property === 'createTable') args[2] = { ...(args[2] ?? {}), transaction };
        else if (transactionOptions.has(property)) {
          const last = args.at(-1);
          if (last && typeof last === 'object' && !Array.isArray(last))
            args[args.length - 1] = { ...last, transaction };
          else args.push({ transaction });
        }
        return value.apply(target, args);
      };
    },
  });
}

async function main() {
  const env = loadEnv();
  const logger = createLogger({ env: env.NODE_ENV, level: env.LOG_LEVEL });
  const sequelize = createDatabaseConnection(env, logger);
  try {
    const result = await runMigrations({
      sequelize,
      direction: process.argv.includes('--undo') ? 'down' : 'up',
    });
    logger.info(result, 'Database migrations completed');
  } finally {
    await closeDatabaseConnection(sequelize);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Database migration failed: ${error?.message ?? 'Unknown error'}\n`);
    process.exitCode = 1;
  });
}
