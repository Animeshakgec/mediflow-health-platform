import { expect } from 'chai';
import bcrypt from 'bcryptjs';
import { decodeJwt } from 'jose';
import { Sequelize } from 'sequelize';
import { initializeModels } from '../src/models/index.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { createFakeAuthDatabase } from './support/fakeAuthDatabase.js';

const config = {
  jwtAccessSecret: 'test-only-secret-with-at-least-32-characters',
  jwtIssuer: 'mediflow-test',
  jwtAudience: 'mediflow-test-clients',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 3600,
};

describe('authentication service', function () {
  let database;
  let auth;

  beforeEach(() => {
    database = createFakeAuthDatabase();
    auth = createAuthService({ sequelize: database.sequelize, config });
  });

  it('hides password hashes from Sequelize JSON serialization', async function () {
    const sequelize = new Sequelize('postgres://user:password@localhost/mediflow_test', {
      logging: false,
    });
    try {
      const { User, AuthSession } = initializeModels(sequelize);
      const user = User.build({
        name: 'Example Patient',
        email: 'patient@example.test',
        passwordHash: 'private-hash',
      });
      expect(user.toJSON()).not.to.have.property('passwordHash');
      const session = AuthSession.build({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'private-refresh-hash',
        tokenFamilyId: 'family-1',
        expiresAt: new Date(Date.now() + 60_000),
      });
      expect(session.toJSON()).not.to.have.property('refreshTokenHash');
      expect(sequelize.models.AuthSession.associations.user).to.exist;
    } finally {
      await sequelize.close();
    }
  });

  it('hashes registration passwords and assigns only the patient role', async function () {
    const result = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    const storedUser = database.users.get(result.user.id);
    expect(storedUser.passwordHash).not.to.equal('long-example-password');
    expect(await bcrypt.compare('long-example-password', storedUser.passwordHash)).to.equal(true);
    expect(result.user.roles).to.deep.equal(['PATIENT']);
    expect(result.user).not.to.have.property('passwordHash');
    expect(result).not.to.have.property('refreshTokenHash');
    expect([...database.sessions.values()][0].refreshTokenHash).to.match(/^[a-f0-9]{64}$/);
  });

  it('authenticates matching credentials and rejects invalid credentials without account disclosure', async function () {
    const registration = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    const login = await auth.login({
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    expect(login.user.id).to.equal(registration.user.id);
    try {
      await auth.login({ email: 'missing@example.test', password: 'long-example-password' });
      expect.fail('expected invalid credentials');
    } catch (error) {
      expect(error.code).to.equal('INVALID_CREDENTIALS');
      expect(error.statusCode).to.equal(401);
    }
  });

  it('issues minimal access-token claims and validates the persisted session', async function () {
    const registration = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    const authenticated = await auth.verifyAccessToken(registration.accessToken);
    const claims = decodeJwt(registration.accessToken);
    expect(authenticated.user.id).to.equal(registration.user.id);
    expect(claims.sub).to.equal(registration.user.id);
    expect(claims.sid).to.be.a('string');
    expect(claims.jti).to.be.a('string');
    expect(claims).not.to.have.property('roles');
    try {
      await auth.verifyAccessToken('malformed-token');
      expect.fail('expected invalid token rejection');
    } catch (error) {
      expect(error.code).to.equal('INVALID_ACCESS_TOKEN');
    }
  });

  it('rejects duplicate normalized emails at the database constraint boundary', async function () {
    await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    try {
      await auth.register({
        name: 'Duplicate Patient',
        email: 'patient@example.test',
        password: 'another-long-password',
      });
      expect.fail('expected duplicate email rejection');
    } catch (error) {
      expect(error.name).to.equal('SequelizeUniqueConstraintError');
    }
  });

  it('rotates refresh tokens and revokes the family when a rotated token is reused', async function () {
    const registration = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    const first = [...database.sessions.values()][0];
    const rotated = await auth.refresh(registration.refreshToken);
    expect(first.revokedAt).to.be.instanceOf(Date);
    expect(first.replacedBySessionId).to.be.a('string');
    expect(rotated.refreshToken).not.to.equal(registration.refreshToken);
    expect([...database.sessions.values()][1].tokenFamilyId).to.equal(first.tokenFamilyId);

    try {
      await auth.refresh(registration.refreshToken);
      expect.fail('expected reuse rejection');
    } catch (error) {
      expect(error.code).to.equal('REFRESH_TOKEN_REUSED');
    }
    expect(
      [...database.sessions.values()].every((session) => session.revokedAt instanceof Date),
    ).to.equal(true);
  });

  it('rejects and revokes expired refresh sessions', async function () {
    const registration = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    const session = [...database.sessions.values()][0];
    session.expiresAt = new Date(Date.now() - 1000);
    try {
      await auth.refresh(registration.refreshToken);
      expect.fail('expected expired refresh token');
    } catch (error) {
      expect(error.code).to.equal('EXPIRED_REFRESH_TOKEN');
    }
    expect(session.revokedAt).to.be.instanceOf(Date);
  });

  it('invalidates active access sessions after logout', async function () {
    const registration = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    await auth.revokeRefreshToken(registration.refreshToken);
    const session = [...database.sessions.values()][0];
    expect(session.revokedAt).to.be.instanceOf(Date);
    try {
      await auth.verifyAccessToken(registration.accessToken);
      expect.fail('expected revoked access session');
    } catch (error) {
      expect(error.statusCode).to.equal(401);
    }
  });

  it('changes the password and revokes every active session', async function () {
    const registration = await auth.register({
      name: 'Example Patient',
      email: 'patient@example.test',
      password: 'long-example-password',
    });
    const user = database.users.get(registration.user.id);
    await auth.changePassword(user, 'long-example-password', 'another-long-password');
    expect(
      [...database.sessions.values()].every((session) => session.revokedAt instanceof Date),
    ).to.equal(true);
    const login = await auth.login({ email: user.email, password: 'another-long-password' });
    expect(login.user.id).to.equal(user.id);
  });
});
