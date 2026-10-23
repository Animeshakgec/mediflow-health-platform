import swaggerJsdoc from 'swagger-jsdoc';

export function createOpenApiSpec(apiPrefix = '/api/v1') {
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
      },
      components: {
        schemas: {
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
