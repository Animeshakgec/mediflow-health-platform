import { randomUUID } from 'node:crypto';
import { UniqueConstraintError } from 'sequelize';

export function createFakeAuthDatabase() {
  const users = new Map();
  const sessions = new Map();
  const patientRole = { id: randomUUID(), code: 'PATIENT', scopeType: 'GLOBAL' };

  class UserRecord {
    constructor(values) {
      Object.assign(this, values);
      this.id ??= randomUUID();
      this.status ??= 'ACTIVE';
      this.assignedRoles = [];
    }

    async update(values) {
      Object.assign(this, values);
      return this;
    }
    async addPlatformRole(role) {
      this.assignedRoles.push(role);
    }
    async getPlatformRoles({ where } = {}) {
      return this.assignedRoles.filter(
        (role) =>
          !where ||
          Object.entries(where).every(([key, value]) =>
            Array.isArray(value) ? value.includes(role[key]) : role[key] === value,
          ),
      );
    }
  }

  const User = {
    async create(values) {
      if ([...users.values()].some((user) => user.email === values.email))
        throw new UniqueConstraintError({ message: 'Duplicate email' });
      const user = new UserRecord(values);
      users.set(user.id, user);
      return user;
    },
    async findOne({ where }) {
      return (
        [...users.values()].find((user) =>
          Object.entries(where).every(([key, value]) => user[key] === value),
        ) ?? null
      );
    },
    async findByPk(id) {
      return users.get(id) ?? null;
    },
  };

  const AuthSession = {
    async create(values) {
      const session = {
        ...values,
        id: randomUUID(),
        createdAt: new Date(),
        revokedAt: null,
        replacedBySessionId: null,
        async update(updates) {
          Object.assign(this, updates);
          return this;
        },
      };
      sessions.set(session.id, session);
      return session;
    },
    async findOne({ where }) {
      return (
        [...sessions.values()].find((session) =>
          Object.entries(where).every(([key, value]) => session[key] === value),
        ) ?? null
      );
    },
    async findByPk(id) {
      return sessions.get(id) ?? null;
    },
    async update(values, { where }) {
      let count = 0;
      for (const session of sessions.values()) {
        if (Object.entries(where).every(([key, value]) => session[key] === value)) {
          Object.assign(session, values);
          count += 1;
        }
      }
      return [count];
    },
  };

  const Role = {
    async findOne({ where }) {
      return where.code === patientRole.code && where.scopeType === patientRole.scopeType
        ? patientRole
        : null;
    },
  };
  const Membership = {
    async findAll() {
      return [];
    },
    async findOne() {
      return null;
    },
  };
  const Permission = {};
  const sequelize = {
    models: { User, AuthSession, Role, Membership, Permission },
    async transaction(callback) {
      return callback({ LOCK: { UPDATE: 'UPDATE' } });
    },
  };

  return { sequelize, users, sessions, patientRole };
}
