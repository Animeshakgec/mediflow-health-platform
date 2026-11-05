import { randomUUID } from 'node:crypto';

const roles = [
  ['SUPER_ADMIN', 'Super administrator', 'PLATFORM'],
  ['HOSPITAL_ADMIN', 'Hospital administrator', 'TENANT'],
  ['DOCTOR', 'Doctor', 'TENANT'],
  ['NURSE', 'Nurse', 'TENANT'],
  ['RECEPTIONIST', 'Receptionist', 'TENANT'],
  ['PATIENT', 'Patient', 'GLOBAL'],
];

export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('users', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    email: { type: DataTypes.STRING(320), allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ACTIVE' },
    email_verified_at: { type: DataTypes.DATE, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addConstraint('users', {
    fields: ['email'],
    type: 'unique',
    name: 'users_email_normalized_key',
  });
  await queryInterface.addConstraint('users', {
    fields: ['email'],
    type: 'check',
    name: 'users_email_lowercase_check',
    where: Sequelize.literal('email = lower(email)'),
  });
  await queryInterface.addConstraint('users', {
    fields: ['status'],
    type: 'check',
    name: 'users_status_check',
    where: { status: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
  });

  await queryInterface.createTable('hospitals', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING(180), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addConstraint('hospitals', {
    fields: ['status'],
    type: 'check',
    name: 'hospitals_status_check',
    where: { status: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
  });

  await queryInterface.createTable('roles', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    scope_type: { type: DataTypes.STRING(16), allowNull: false },
  });
  await queryInterface.addConstraint('roles', {
    fields: ['scope_type'],
    type: 'check',
    name: 'roles_scope_type_check',
    where: { scope_type: ['PLATFORM', 'GLOBAL', 'TENANT'] },
  });

  await queryInterface.createTable('permissions', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
  });
  await queryInterface.createTable('role_permissions', {
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'permissions', key: 'id' },
      onDelete: 'CASCADE',
    },
  });

  await queryInterface.createTable('memberships', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'hospitals', key: 'id' },
      onDelete: 'RESTRICT',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'RESTRICT',
    },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addConstraint('memberships', {
    fields: ['tenant_id', 'user_id'],
    type: 'unique',
    name: 'memberships_tenant_user_key',
  });
  await queryInterface.addConstraint('memberships', {
    fields: ['status'],
    type: 'check',
    name: 'memberships_status_check',
    where: { status: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
  });
  await queryInterface.addIndex('memberships', ['user_id', 'status'], {
    name: 'memberships_user_status_idx',
  });

  await queryInterface.createTable('membership_roles', {
    membership_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'memberships', key: 'id' },
      onDelete: 'CASCADE',
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    },
  });
  //A user could also have more than one role at the same hospital if your authorization rules permit it.

  await queryInterface.createTable('platform_user_roles', {
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'roles', key: 'id' },
      onDelete: 'RESTRICT',
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.createTable('auth_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    refresh_token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    token_family_id: { type: DataTypes.UUID, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    replaced_by_session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'auth_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });
  await queryInterface.addIndex('auth_sessions', ['user_id', 'expires_at'], {
    name: 'auth_sessions_user_expiry_idx',
  });
  await queryInterface.addIndex('auth_sessions', ['token_family_id'], {
    name: 'auth_sessions_family_idx',
  });

  await queryInterface.bulkInsert(
    'roles',
    roles.map(([code, name, scope_type]) => ({ id: randomUUID(), code, name, scope_type })),
  );
}

export async function down(queryInterface) {
  for (const table of [
    'auth_sessions',
    'platform_user_roles',
    'membership_roles',
    'memberships',
    'role_permissions',
    'permissions',
    'roles',
    'hospitals',
    'users',
  ]) {
    await queryInterface.dropTable(table);
  }
}
