import { DataTypes } from 'sequelize';

export function initializeModels(sequelize) {
  if (
    sequelize.models.User &&
    sequelize.models.AuthSession &&
    sequelize.models.Role &&
    sequelize.models.Membership
  ) {
    return sequelize.models;
  }

  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(160), allowNull: false },
      email: {
        type: DataTypes.STRING(320),
        allowNull: false,
        unique: 'users_email_normalized_key',
      },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE', 'SUSPENDED']] },
      },
      emailVerifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'email_verified_at' },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    },
    { tableName: 'users', underscored: true },
  );

  const AuthSession = sequelize.define(
    'AuthSession',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
      refreshTokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        field: 'refresh_token_hash',
      },
      tokenFamilyId: { type: DataTypes.UUID, allowNull: false, field: 'token_family_id' },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
      replacedBySessionId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'replaced_by_session_id',
      },
    },
    { tableName: 'auth_sessions', underscored: true, updatedAt: false },
  );

  const Role = sequelize.define(
    'Role',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      scopeType: {
        type: DataTypes.STRING(16),
        allowNull: false,
        field: 'scope_type',
        validate: { isIn: [['PLATFORM', 'GLOBAL', 'TENANT']] },
      },
    },
    { tableName: 'roles', underscored: true, timestamps: false },
  );

  const Permission = sequelize.define(
    'Permission',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'permissions', underscored: true, timestamps: false },
  );

  const Membership = sequelize.define(
    'Membership',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
      status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'ACTIVE',
        validate: { isIn: [['ACTIVE', 'INACTIVE', 'SUSPENDED']] },
      },
    },
    { tableName: 'memberships', underscored: true },
  );

  const MembershipRole = sequelize.define(
    'MembershipRole',
    {
      membershipId: { type: DataTypes.UUID, primaryKey: true, field: 'membership_id' },
      roleId: { type: DataTypes.UUID, primaryKey: true, field: 'role_id' },
    },
    { tableName: 'membership_roles', underscored: true, timestamps: false },
  );

  const PlatformUserRole = sequelize.define(
    'PlatformUserRole',
    {
      userId: { type: DataTypes.UUID, primaryKey: true, field: 'user_id' },
      roleId: { type: DataTypes.UUID, primaryKey: true, field: 'role_id' },
      assignedBy: { type: DataTypes.UUID, allowNull: true, field: 'assigned_by' },
    },
    { tableName: 'platform_user_roles', underscored: true, updatedAt: false },
  );

  const RolePermission = sequelize.define(
    'RolePermission',
    {
      roleId: { type: DataTypes.UUID, primaryKey: true, field: 'role_id' },
      permissionId: { type: DataTypes.UUID, primaryKey: true, field: 'permission_id' },
    },
    { tableName: 'role_permissions', underscored: true, timestamps: false },
  );

  User.prototype.toJSON = function toJSON() {
    const values = this.get({ plain: true });
    delete values.passwordHash;
    return values;
  };

  AuthSession.prototype.toJSON = function toJSON() {
    const values = this.get({ plain: true });
    delete values.refreshTokenHash;
    return values;
  };

  User.hasMany(AuthSession, { as: 'sessions', foreignKey: 'userId' });
  AuthSession.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  AuthSession.belongsTo(AuthSession, { as: 'replacement', foreignKey: 'replacedBySessionId' });
  User.hasMany(Membership, { as: 'memberships', foreignKey: 'userId' });
  Membership.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Membership.belongsToMany(Role, {
    through: MembershipRole,
    as: 'roles',
    foreignKey: 'membershipId',
    otherKey: 'roleId',
  });
  Role.belongsToMany(Membership, {
    through: MembershipRole,
    as: 'memberships',
    foreignKey: 'roleId',
    otherKey: 'membershipId',
  });
  User.belongsToMany(Role, {
    through: PlatformUserRole,
    as: 'platformRoles',
    foreignKey: 'userId',
    otherKey: 'roleId',
  });
  Role.belongsToMany(User, {
    through: PlatformUserRole,
    as: 'platformUsers',
    foreignKey: 'roleId',
    otherKey: 'userId',
  });
  Role.belongsToMany(Permission, {
    through: RolePermission,
    as: 'permissions',
    foreignKey: 'roleId',
    otherKey: 'permissionId',
  });
  Permission.belongsToMany(Role, {
    through: RolePermission,
    as: 'roles',
    foreignKey: 'permissionId',
    otherKey: 'roleId',
  });

  return {
    User,
    AuthSession,
    Role,
    Permission,
    Membership,
    MembershipRole,
    PlatformUserRole,
    RolePermission,
  };
}
