import swaggerJsdoc from 'swagger-jsdoc';

export function createOpenApiSpec(apiPrefix = '/api/v1', refreshCookieName = 'mediflow_refresh') {
  return swaggerJsdoc({
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'MediFlow API',
        version: '1.0.0',
        description: 'MediFlow modular monolith API.',
      },
      servers: [{ url: '/' }],
      paths: {
        [`${apiPrefix}/health`]: {
          get: {
            tags: ['Health'],
            summary: 'Check API and PostgreSQL availability',
            operationId: 'getHealth',
            responses: {
              200: {
                description: 'API and database are available.',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/HealthResponse' },
                  },
                },
              },
              503: {
                description: 'Database is unavailable.',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                  },
                },
              },
            },
          },
        },
        [`${apiPrefix}/auth/register`]: authPost(
          'Register a patient account',
          'RegisterRequest',
          true,
        ),
        [`${apiPrefix}/auth/login`]: authPost(
          'Sign in and create a refresh session',
          'LoginRequest',
          false,
        ),
        [`${apiPrefix}/auth/refresh`]: {
          post: {
            tags: ['Authentication'],
            summary: 'Rotate the refresh session',
            security: [{ refreshCookie: [] }],
            responses: authResponses(),
          },
        },
        [`${apiPrefix}/auth/logout`]: {
          post: {
            tags: ['Authentication'],
            summary: 'Revoke the refresh-token family',
            security: [{ refreshCookie: [] }],
            responses: authResponses(),
          },
        },
        [`${apiPrefix}/auth/me`]: {
          get: {
            tags: ['Authentication'],
            summary: 'Get the authenticated user profile',
            security: [{ bearerAuth: [] }],
            responses: authResponses(),
          },
        },
        [`${apiPrefix}/auth/change-password`]: {
          patch: {
            tags: ['Authentication'],
            summary: 'Change the authenticated user password',
            security: [{ bearerAuth: [] }],
            requestBody: jsonBody('ChangePasswordRequest'),
            responses: authResponses(),
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          refreshCookie: { type: 'apiKey', in: 'cookie', name: refreshCookieName },
        },
        schemas: {
          RegisterRequest: {
            type: 'object',
            required: ['name', 'email', 'password'],
            additionalProperties: false,
            properties: {
              name: { type: 'string', maxLength: 160 },
              email: { type: 'string', format: 'email' },
              password: {
                type: 'string',
                minLength: 12,
                maxLength: 72,
                description: 'Up to 72 UTF-8 bytes. Public registration always assigns PATIENT.',
              },
            },
          },
          LoginRequest: {
            type: 'object',
            required: ['email', 'password'],
            additionalProperties: false,
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', maxLength: 72 },
            },
          },
          ChangePasswordRequest: {
            type: 'object',
            required: ['currentPassword', 'newPassword'],
            additionalProperties: false,
            properties: {
              currentPassword: { type: 'string' },
              newPassword: { type: 'string', minLength: 12, maxLength: 72 },
            },
          },
          HealthResponse: {
            type: 'object',
            required: ['success', 'message', 'data', 'meta'],
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'MediFlow API is healthy' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'UP' },
                  database: { type: 'string', example: 'connected' },
                },
              },
              meta: { $ref: '#/components/schemas/ResponseMeta' },
            },
          },
          ErrorResponse: {
            type: 'object',
            required: ['success', 'message', 'errors', 'meta'],
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: 'Service is temporarily unavailable' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'SERVICE_UNAVAILABLE' },
                    message: { type: 'string' },
                  },
                },
              },
              meta: { $ref: '#/components/schemas/ResponseMeta' },
            },
          },
          ResponseMeta: {
            type: 'object',
            nullable: true,
            properties: {
              requestId: { type: 'string', example: 'f2efc477-0a50-44f2-9d25-47b31ba3ba61' },
            },
          },
        },
      },
    },
    apis: [],
  });
}

function jsonBody(schemaName) {
  return {
    required: true,
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } },
  };
}

function authPost(summary, schemaName, created) {
  return {
    post: {
      tags: ['Authentication'],
      summary,
      ...(schemaName ? { requestBody: jsonBody(schemaName) } : {}),
      responses: {
        ...(created
          ? { 201: { description: 'Account created.' } }
          : { 200: { description: 'Authentication succeeded.' } }),
        401: { description: 'Credentials or session are invalid.' },
        409: { description: 'Account already exists.' },
        422: { description: 'Request validation failed.' },
        429: { description: 'Authentication rate limit exceeded.' },
      },
    },
  };
}

function authResponses() {
  return {
    200: { description: 'Request completed.' },
    401: { description: 'Authentication or session is invalid.' },
    403: { description: 'The authenticated actor is not authorized.' },
    422: { description: 'Request validation failed.' },
    429: { description: 'Authentication rate limit exceeded.' },
  };
}
