import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { AppError } from '../../common/errors/AppError.js';

const PASSWORD_COST = 12;
const DUMMY_PASSWORD_HASH = bcrypt.hash('mediflow-dummy-password', PASSWORD_COST);
const opaqueToken = () => randomBytes(32).toString('base64url');
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const jwtKey = (secret) => new TextEncoder().encode(secret);

export function createAuthService({ sequelize, config, logger = null }) {
  const { User, AuthSession, Role, Membership, Permission } = sequelize.models;

  function sessionExpiry() {
    return new Date(Date.now() + config.refreshTtlSeconds * 1000);
  }

  async function createAccessToken(userId, sessionId) {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setJti(randomUUID())
      .setIssuer(config.jwtIssuer)
      .setAudience(config.jwtAudience)
      .setIssuedAt()
      .setExpirationTime(`${config.accessTtlSeconds}s`)
      .sign(jwtKey(config.jwtAccessSecret));
  }

  async function createSession(
    userId,
    transaction,
    familyId = randomUUID(),
    expiresAt = sessionExpiry(),
  ) {
    const rawRefreshToken = opaqueToken();
    const session = await AuthSession.create(
      {
        userId,
        refreshTokenHash: tokenHash(rawRefreshToken),
        tokenFamilyId: familyId,
        expiresAt,
      },
      { transaction },
    );
    return { session, rawRefreshToken };
  }

  async function issueTokens(userId, transaction) {
    const { session, rawRefreshToken } = await createSession(userId, transaction);
    return {
      accessToken: await createAccessToken(userId, session.id),
      refreshToken: rawRefreshToken,
      session,
    };
  }

  async function publicUser(user) {
    const [globalRoles, memberships] = await Promise.all([
      user.getPlatformRoles({
        where: { scopeType: ['PLATFORM', 'GLOBAL'] },
        attributes: ['code', 'scopeType'],
        joinTableAttributes: [],
      }),
      Membership.findAll({
        where: { userId: user.id, status: 'ACTIVE' },
        include: [
          {
            model: Role,
            as: 'roles',
            where: { scopeType: 'TENANT' },
            attributes: ['code'],
            through: { attributes: [] },
          },
        ],
      }),
    ]);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      roles: [...new Set(globalRoles.map((role) => role.code))],
      memberships: memberships.map((membership) => ({
        tenantId: membership.tenantId,
        roles: membership.roles.map((role) => role.code),
      })),
    };
  }

  async function register(input) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_COST);
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.create({ name: input.name, email, passwordHash }, { transaction });
      const patientRole = await Role.findOne({
        where: { code: 'PATIENT', scopeType: 'GLOBAL' },
        transaction,
      });
      if (!patientRole) throw new Error('PATIENT role seed is missing');
      await user.addPlatformRole(patientRole, { transaction });
      const tokens = await issueTokens(user.id, transaction);
      return { user, tokens };
    });
    logger?.info(
      { event: 'auth.register', outcome: 'success', actorId: result.user.id },
      'Authentication event',
    );
    return {
      user: await publicUser(result.user),
      ...result.tokens,
      refreshExpiresAt: result.tokens.session.expiresAt,
    };
  }

  async function login(input) {
    const email = input.email.trim().toLowerCase();
    const user = await User.findOne({ where: { email } });
    const storedHash = user?.passwordHash ?? (await DUMMY_PASSWORD_HASH);
    const passwordMatches = await bcrypt.compare(input.password, storedHash).catch(() => false);
    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      logger?.warn({ event: 'auth.login', outcome: 'failure' }, 'Authentication event');
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    const result = await sequelize.transaction(async (transaction) => {
      await user.update({ lastLoginAt: new Date() }, { transaction });
      return issueTokens(user.id, transaction);
    });
    logger?.info(
      { event: 'auth.login', outcome: 'success', actorId: user.id },
      'Authentication event',
    );
    return { user: await publicUser(user), ...result, refreshExpiresAt: result.session.expiresAt };
  }

  async function verifyAccessToken(token) {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, jwtKey(config.jwtAccessSecret), {
        algorithms: ['HS256'],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      }));
    } catch {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required');
    }
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required');
    }
    const [session, user] = await Promise.all([
      AuthSession.findByPk(payload.sid),
      User.findByPk(payload.sub),
    ]);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !user ||
      user.status !== 'ACTIVE'
    ) {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required');
    }
    return { user, session, claims: payload };
  }

  async function refresh(rawToken) {
    if (!rawToken)
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'A valid refresh session is required');
    const hash = tokenHash(rawToken);
    const result = await sequelize.transaction(async (transaction) => {
      const oldSession = await AuthSession.findOne({
        where: { refreshTokenHash: hash },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!oldSession)
        throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'A valid refresh session is required');

      if (oldSession.revokedAt) {
        if (oldSession.replacedBySessionId) {
          logger?.warn(
            { event: 'auth.refresh', outcome: 'token_reuse', actorId: oldSession.userId },
            'Authentication event',
          );
          await AuthSession.update(
            { revokedAt: new Date() },
            {
              where: { tokenFamilyId: oldSession.tokenFamilyId, revokedAt: null },
              transaction,
            },
          );
          return {
            error: new AppError(
              401,
              'REFRESH_TOKEN_REUSED',
              'The refresh session is no longer valid',
            ),
          };
        }
        return {
          error: new AppError(401, 'INVALID_REFRESH_TOKEN', 'A valid refresh session is required'),
        };
      }
      if (oldSession.expiresAt <= new Date()) {
        await oldSession.update({ revokedAt: new Date() }, { transaction });
        return {
          error: new AppError(401, 'EXPIRED_REFRESH_TOKEN', 'The refresh session has expired'),
        };
      }

      const user = await User.findByPk(oldSession.userId, { transaction });
      if (!user || user.status !== 'ACTIVE') {
        await AuthSession.update(
          { revokedAt: new Date() },
          { where: { tokenFamilyId: oldSession.tokenFamilyId, revokedAt: null }, transaction },
        );
        return {
          error: new AppError(401, 'INVALID_REFRESH_TOKEN', 'A valid refresh session is required'),
        };
      }
      const { session, rawRefreshToken } = await createSession(
        user.id,
        transaction,
        oldSession.tokenFamilyId,
        oldSession.expiresAt,
      );
      await oldSession.update(
        { revokedAt: new Date(), replacedBySessionId: session.id },
        { transaction },
      );
      logger?.info(
        { event: 'auth.refresh', outcome: 'success', actorId: user.id },
        'Authentication event',
      );
      return {
        value: {
          accessToken: await createAccessToken(user.id, session.id),
          refreshToken: rawRefreshToken,
          refreshExpiresAt: session.expiresAt,
        },
      };
    });
    if (result?.error) throw result.error;
    return result.value;
  }

  async function revokeRefreshToken(rawToken) {
    if (!rawToken) return;
    await sequelize.transaction(async (transaction) => {
      const session = await AuthSession.findOne({
        where: { refreshTokenHash: tokenHash(rawToken) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!session) return;
      await AuthSession.update(
        { revokedAt: new Date() },
        { where: { tokenFamilyId: session.tokenFamilyId, revokedAt: null }, transaction },
      );
      logger?.info(
        { event: 'auth.logout', outcome: 'success', actorId: session.userId },
        'Authentication event',
      );
    });
  }

  async function changePassword(user, currentPassword, newPassword) {
    const matches = await bcrypt.compare(currentPassword, user.passwordHash).catch(() => false);
    if (!matches)
      throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_COST);
    await sequelize.transaction(async (transaction) => {
      await user.update({ passwordHash }, { transaction });
      await AuthSession.update(
        { revokedAt: new Date() },
        { where: { userId: user.id, revokedAt: null }, transaction },
      );
    });
    logger?.info(
      { event: 'auth.password_change', outcome: 'success', actorId: user.id },
      'Authentication event',
    );
  }

  async function hasRole(userId, roleCodes, tenantId = null) {
    if (tenantId) {
      const membership = await Membership.findOne({
        where: { userId, tenantId, status: 'ACTIVE' },
        include: [
          {
            model: Role,
            as: 'roles',
            where: { code: roleCodes, scopeType: 'TENANT' },
            through: { attributes: [] },
          },
        ],
      });
      return Boolean(membership);
    }
    const user = await User.findByPk(userId);
    if (!user) return false;
    const roles = await user.getPlatformRoles({
      where: { code: roleCodes, scopeType: ['PLATFORM', 'GLOBAL'] },
      joinTableAttributes: [],
    });
    return roles.length > 0;
  }

  async function hasPermission(userId, permissionCode, tenantId = null) {
    if (tenantId) {
      return Boolean(
        await Membership.findOne({
          where: { userId, tenantId, status: 'ACTIVE' },
          include: [
            {
              model: Role,
              as: 'roles',
              where: { scopeType: 'TENANT' },
              include: [
                {
                  model: Permission,
                  as: 'permissions',
                  attributes: [],
                  through: { attributes: [] },
                },
              ],
              through: { attributes: [] },
            },
          ],
        }),
      );
    }
    const user = await User.findByPk(userId);
    if (!user) return false;
    const roles = await user.getPlatformRoles({
      include: [
        {
          model: Permission,
          as: 'permissions',
          where: { code: permissionCode },
          through: { attributes: [] },
        },
      ],
      joinTableAttributes: [],
    });
    return roles.length > 0;
  }

  return {
    register,
    login,
    refresh,
    revokeRefreshToken,
    verifyAccessToken,
    publicUser,
    changePassword,
    hasRole,
    hasPermission,
  };
}
