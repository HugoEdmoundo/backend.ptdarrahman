export const openapiSpec = {
    openapi: '3.0.0',
    info: {
        title: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
        description: "Backend API for Pesantren Tahfidz Qur'an dan Digital Ar-Rahman",
        version: '1.0.0',
    },
    servers: [{ url: '/', description: 'Current server' }],
    paths: {
        '/': {
            get: { summary: 'Health Check', tags: ['Root'], responses: { '200': { description: 'OK' } } },
        },
        '/scalar': {
            get: { summary: 'API Documentation', tags: ['Root'], responses: { '200': { description: 'Scalar UI' } } },
        },
        '/auth/login': {
            post: {
                summary: 'Login',
                tags: ['Auth'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { username: { type: 'string' }, password: { type: 'string' } },
                                required: ['username', 'password'],
                            },
                        },
                    },
                },
                responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } },
            },
        },
        '/auth/register': {
            post: {
                summary: 'Register',
                tags: ['Auth'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } },
                                required: ['username', 'email', 'password'],
                            },
                        },
                    },
                },
                responses: { '201': { description: 'User created' } },
            },
        },
        '/auth/refresh': {
            post: { summary: 'Refresh Token', tags: ['Auth'], responses: { '200': { description: 'Token refreshed' } } },
        },
        '/auth/logout': {
            post: {
                summary: 'Logout',
                tags: ['Auth'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Logged out' } },
            },
        },
        '/auth/me': {
            get: {
                summary: 'Get Current User',
                tags: ['Auth'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Current user data' } },
            },
        },
        '/auth/profile': {
            put: {
                summary: 'Update Profile',
                tags: ['Auth'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Profile updated' } },
            },
        },
        '/auth/upload': {
            post: {
                summary: 'Upload Image',
                tags: ['Auth'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Image uploaded' } },
            },
        },
        '/companyprofile/{table}': {
            get: {
                summary: 'List Company Profile Data',
                tags: ['Company Profile'],
                parameters: [{ name: 'table', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'List of items' } },
            },
            post: {
                summary: 'Create Company Profile Entry',
                tags: ['Company Profile'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'table', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '201': { description: 'Created' } },
            },
        },
        '/companyprofile/{table}/{id}': {
            get: {
                summary: 'Get Company Profile Entry',
                tags: ['Company Profile'],
                parameters: [
                    { name: 'table', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Item data' } },
            },
            put: {
                summary: 'Update Company Profile Entry',
                tags: ['Company Profile'],
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'table', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Updated' } },
            },
            delete: {
                summary: 'Delete Company Profile Entry',
                tags: ['Company Profile'],
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'table', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Deleted' } },
            },
        },
        '/users': {
            get: {
                summary: 'List Users',
                tags: ['Users'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'User list' } },
            },
            post: {
                summary: 'Create User',
                tags: ['Users'],
                security: [{ bearerAuth: [] }],
                responses: { '201': { description: 'User created' } },
            },
        },
        '/users/{id}': {
            get: {
                summary: 'Get User',
                tags: ['Users'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'User data' } },
            },
            put: {
                summary: 'Update User',
                tags: ['Users'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'User updated' } },
            },
            delete: {
                summary: 'Delete User',
                tags: ['Users'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'User deleted' } },
            },
        },
        '/roles': {
            get: {
                summary: 'List Roles',
                tags: ['Roles'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Role list' } },
            },
            post: {
                summary: 'Create Role',
                tags: ['Roles'],
                security: [{ bearerAuth: [] }],
                responses: { '201': { description: 'Role created' } },
            },
        },
        '/roles/{id}': {
            get: {
                summary: 'Get Role',
                tags: ['Roles'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'Role data' } },
            },
            put: {
                summary: 'Update Role',
                tags: ['Roles'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'Role updated' } },
            },
            delete: {
                summary: 'Delete Role',
                tags: ['Roles'],
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'Role deleted' } },
            },
        },
        '/superadmin/dashboard': {
            get: {
                summary: 'Dashboard Stats',
                tags: ['Superadmin'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Dashboard statistics' } },
            },
        },
        '/spp': {
            get: {
                summary: 'List SPP',
                tags: ['SPP'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'SPP list' } },
            },
        },
        '/students': {
            get: {
                summary: 'List Students',
                tags: ['Students'],
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Student list' } },
            },
        },
        '/teachers': {
            get: { summary: 'Teachers Root', tags: ['Teachers'], responses: { '200': { description: 'Coming soon' } } },
        },
        '/visits': {
            get: { summary: 'Visits Root', tags: ['Visits'], responses: { '200': { description: 'Coming soon' } } },
        },
        '/canteens': {
            get: { summary: 'Canteens Root', tags: ['Canteens'], responses: { '200': { description: 'Coming soon' } } },
        },
        '/courts': {
            get: { summary: 'Courts Root', tags: ['Courts'], responses: { '200': { description: 'Coming soon' } } },
        },
        '/inventories': {
            get: {
                summary: 'Inventories Root',
                tags: ['Inventories'],
                responses: { '200': { description: 'Coming soon' } },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
};
