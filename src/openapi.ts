import type { OpenAPIObject } from 'openapi3-ts/oas30'

export const openapiSpec: OpenAPIObject = {
  openapi: '3.0.0',
  info: {
    title: "Pesantren Tahfidz Qur'an dan Digital Arrahman API",
    description: `Backend API for Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Company Profile Endpoints
Public endpoints for fetching news, programs, facilities, staff, achievements, gallery, testimonials, and settings.

## Authentication
Most admin endpoints require a JWT Bearer token. Obtain one via \`POST /companyprofile/auth/login\`.

## Rate Limiting
Login attempts are rate-limited to prevent brute-force attacks.`,
    version: '1.0.0',
    contact: {
      name: 'PT Darrahman',
      url: 'https://ptdarrahman-sch-id.vercel.app',
    },
  },
  servers: [
    { url: 'https://backend-ptdarrahman.vercel.app', description: 'Production' },
    { url: 'http://localhost:8000', description: 'Local Development' },
  ],
  paths: {
    // ── Root ──────────────────────────────────────────────
    '/': {
      get: {
        summary: 'Health Check',
        tags: ['Root'],
        responses: { '200': { description: 'API status and documentation links' } },
      },
    },
    '/openapi.json': {
      get: {
        summary: 'OpenAPI Spec',
        tags: ['Root'],
        responses: { '200': { description: 'OpenAPI JSON specification' } },
      },
    },
    '/ui': {
      get: {
        summary: 'Swagger UI',
        tags: ['Root'],
        responses: { '200': { description: 'Swagger UI documentation' } },
      },
    },
    '/scalar': {
      get: {
        summary: 'Scalar API Reference',
        tags: ['Root'],
        responses: { '200': { description: 'Scalar interactive documentation' } },
      },
    },

    // ── Company Profile: Auth ──────────────────────────────
    '/companyprofile/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Company Profile - Auth'],
        description: 'Authenticate user and receive access + refresh tokens. Accounts lock after 5 failed attempts for 15 minutes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', description: 'Username or email' },
                  password: { type: 'string' },
                },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    access_token: { type: 'string' },
                    refresh_token: { type: 'string' },
                    token_type: { type: 'string', example: 'bearer' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        full_name: { type: 'string' },
                        avatar_url: { type: 'string' },
                        role_id: { type: 'string' },
                        role_name: { type: 'string' },
                        permissions: { type: 'object' },
                        user_type: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Account locked (too many failed attempts)' },
        },
      },
    },
    '/companyprofile/auth/refresh': {
      post: {
        summary: 'Refresh Token',
        tags: ['Company Profile - Auth'],
        description: 'Exchange a refresh token for a new access token. Old refresh token is revoked.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refresh_token: { type: 'string' } },
                required: ['refresh_token'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    access_token: { type: 'string' },
                    refresh_token: { type: 'string' },
                    token_type: { type: 'string', example: 'bearer' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/companyprofile/auth/logout': {
      post: {
        summary: 'Logout',
        tags: ['Company Profile - Auth'],
        security: [{ bearerAuth: [] }],
        description: 'Revoke all refresh tokens for the current user.',
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/companyprofile/auth/me': {
      get: {
        summary: 'Get Current User',
        tags: ['Company Profile - Auth'],
        security: [{ bearerAuth: [] }],
        description: 'Returns the authenticated user profile with role and permissions.',
        responses: {
          '200': {
            description: 'Current user data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    full_name: { type: 'string' },
                    avatar_url: { type: 'string' },
                    user_type: { type: 'string' },
                    is_active: { type: 'boolean' },
                    role_id: { type: 'string' },
                    role_name: { type: 'string' },
                    permissions: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/companyprofile/auth/profile': {
      put: {
        summary: 'Update Profile',
        tags: ['Company Profile - Auth'],
        security: [{ bearerAuth: [] }],
        description: 'Update current user profile. Only superadmin can change email.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string' },
                  full_name: { type: 'string' },
                  avatar_url: { type: 'string' },
                  old_password: { type: 'string', description: 'Required if changing password' },
                  new_password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated' },
          '400': { description: 'Invalid old password or username/email already in use' },
          '403': { description: 'Only superadmin can change email' },
        },
      },
    },

    // ── Company Profile: Upload ────────────────────────────
    '/companyprofile/upload': {
      post: {
        summary: 'Upload Image',
        tags: ['Company Profile - Upload'],
        security: [{ bearerAuth: [] }],
        description: 'Upload an image file (JPEG, PNG, WebP, GIF). Max 5MB. Returns public URL.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Image file' },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Image uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { url: { type: 'string', format: 'uri' } },
                },
              },
            },
          },
          '400': { description: 'Invalid file type or too large' },
        },
      },
    },
    '/companyprofile/uploads/{filename}': {
      delete: {
        summary: 'Delete Uploaded File',
        tags: ['Company Profile - Upload'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'filename', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'File deleted' },
          '400': { description: 'Invalid filename' },
        },
      },
    },

    // ── Company Profile: Settings (Public) ─────────────────
    '/companyprofile/settings': {
      get: {
        summary: 'List Site Settings',
        tags: ['Company Profile - Settings'],
        description: 'Public. Returns all site settings (logo, site name, whatsapp, etc).',
        responses: {
          '200': {
            description: 'List of key-value settings',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/companyprofile/settings/{key}': {
      get: {
        summary: 'Get Site Setting by Key',
        tags: ['Company Profile - Settings'],
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' }, description: 'One of: favicon, site_name, site_description, logo, to_email, whatsapp, whatsapp_number, whatsapp_message, whatsapp_message_en, whatsapp_message_id' },
        ],
        responses: {
          '200': { description: 'Setting value' },
          '400': { description: 'Unknown key' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update Site Setting',
        tags: ['Company Profile - Settings'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { value: { type: 'string' } },
                required: ['value'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Setting updated' },
          '400': { description: 'Unknown key' },
        },
      },
    },

    // ── Company Profile: Contact Info ──────────────────────
    '/companyprofile/contact-info': {
      get: {
        summary: 'Get Contact Info',
        tags: ['Company Profile - Contact'],
        description: 'Public. Returns address, phone, email, and office hours.',
        responses: {
          '200': {
            description: 'Contact info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    address: { type: 'string' },
                    phone_primary: { type: 'string' },
                    phone_secondary: { type: 'string' },
                    whatsapp: { type: 'string' },
                    email_primary: { type: 'string' },
                    email_admission: { type: 'string' },
                    office_hours: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        summary: 'Update Contact Info',
        tags: ['Company Profile - Contact'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  map_url: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Contact info updated' } },
      },
    },

    // ── Company Profile: News ──────────────────────────────
    '/companyprofile/news': {
      get: {
        summary: 'List News Articles',
        tags: ['Company Profile - News'],
        description: 'Public. Returns all news articles, ordered by date descending.',
        parameters: [
          { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
        ],
        responses: {
          '200': {
            description: 'List of news articles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create News Article',
        tags: ['Company Profile - News'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'News article created' } },
      },
    },
    '/companyprofile/news/{slug}': {
      get: {
        summary: 'Get News by Slug',
        tags: ['Company Profile - News'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'News article' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update News Article',
        tags: ['Company Profile - News'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete News Article',
        tags: ['Company Profile - News'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Programs ──────────────────────────
    '/companyprofile/programs': {
      get: {
        summary: 'List Programs',
        tags: ['Company Profile - Programs'],
        description: 'Public. Returns all academic programs.',
        responses: {
          '200': {
            description: 'List of programs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Program',
        tags: ['Company Profile - Programs'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Program created' } },
      },
    },
    '/companyprofile/programs/{slug}': {
      get: {
        summary: 'Get Program by Slug',
        tags: ['Company Profile - Programs'],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Program details' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update Program',
        tags: ['Company Profile - Programs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Program',
        tags: ['Company Profile - Programs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Facilities ────────────────────────
    '/companyprofile/facilities': {
      get: {
        summary: 'List Facilities',
        tags: ['Company Profile - Facilities'],
        description: 'Public. Returns all campus facilities.',
        responses: {
          '200': {
            description: 'List of facilities',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Facility',
        tags: ['Company Profile - Facilities'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Facility created' } },
      },
    },
    '/companyprofile/facilities/{id}': {
      get: {
        summary: 'Get Facility by ID',
        tags: ['Company Profile - Facilities'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Facility details' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update Facility',
        tags: ['Company Profile - Facilities'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Facility',
        tags: ['Company Profile - Facilities'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Staff ─────────────────────────────
    '/companyprofile/staff': {
      get: {
        summary: 'List Staff',
        tags: ['Company Profile - Staff'],
        description: 'Public. Returns all staff members.',
        responses: {
          '200': {
            description: 'List of staff',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Staff',
        tags: ['Company Profile - Staff'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Staff created' } },
      },
    },
    '/companyprofile/staff/{id}': {
      get: {
        summary: 'Get Staff by ID',
        tags: ['Company Profile - Staff'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Staff details' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update Staff',
        tags: ['Company Profile - Staff'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Staff',
        tags: ['Company Profile - Staff'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Achievements ──────────────────────
    '/companyprofile/achievements': {
      get: {
        summary: 'List Achievements',
        tags: ['Company Profile - Achievements'],
        description: 'Public. Returns all achievements, ordered by year descending.',
        responses: {
          '200': {
            description: 'List of achievements',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Achievement',
        tags: ['Company Profile - Achievements'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Achievement created' } },
      },
    },
    '/companyprofile/achievements/{id}': {
      put: {
        summary: 'Update Achievement',
        tags: ['Company Profile - Achievements'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Achievement',
        tags: ['Company Profile - Achievements'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Gallery ───────────────────────────
    '/companyprofile/gallery': {
      get: {
        summary: 'List Gallery Items',
        tags: ['Company Profile - Gallery'],
        description: 'Public. Returns all gallery items.',
        responses: {
          '200': {
            description: 'List of gallery items',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Gallery Item',
        tags: ['Company Profile - Gallery'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Gallery item created' } },
      },
    },
    '/companyprofile/gallery/{id}': {
      put: {
        summary: 'Update Gallery Item',
        tags: ['Company Profile - Gallery'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Gallery Item',
        tags: ['Company Profile - Gallery'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Social Links ──────────────────────
    '/companyprofile/social-links': {
      get: {
        summary: 'List Social Links',
        tags: ['Company Profile - Social'],
        description: 'Public. Returns all social media links.',
        responses: {
          '200': {
            description: 'List of social links',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Social Link',
        tags: ['Company Profile - Social'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Social link created' } },
      },
    },
    '/companyprofile/social-links/{id}': {
      put: {
        summary: 'Update Social Link',
        tags: ['Company Profile - Social'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Social Link',
        tags: ['Company Profile - Social'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Company Profile: Testimonials ──────────────────────
    '/companyprofile/testimonials': {
      get: {
        summary: 'List Testimonials',
        tags: ['Company Profile - Testimonials'],
        description: 'Public. Returns all testimonials.',
        responses: {
          '200': {
            description: 'List of testimonials',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Testimonial',
        tags: ['Company Profile - Testimonials'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Testimonial created' } },
      },
    },
    '/companyprofile/testimonials/{id}': {
      put: {
        summary: 'Update Testimonial',
        tags: ['Company Profile - Testimonials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        summary: 'Delete Testimonial',
        tags: ['Company Profile - Testimonials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Users ──────────────────────────────────────────────
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

    // ── Roles ──────────────────────────────────────────────
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

    // ── Superadmin ─────────────────────────────────────────
    '/superadmin/dashboard': {
      get: {
        summary: 'Dashboard Stats',
        tags: ['Superadmin'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard statistics' } },
      },
    },

    // ── SPP ────────────────────────────────────────────────
    '/spp': {
      get: {
        summary: 'List SPP',
        tags: ['SPP'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'SPP list' } },
      },
    },

    // ── Students ───────────────────────────────────────────
    '/students': {
      get: {
        summary: 'List Students',
        tags: ['Students'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Student list' } },
      },
    },

    // ── Auth ───────────────────────────────────────────────
    '/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        description: 'Authenticate user and receive access + refresh tokens.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', description: 'Username or email' },
                  password: { type: 'string' },
                },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Account locked (too many failed attempts)' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh Token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refresh_token: { type: 'string' } },
                required: ['refresh_token'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Token refreshed' },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Current User',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Current user data' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/auth/register-applicant': {
      post: {
        summary: 'Register Applicant',
        tags: ['Auth'],
        description: 'Public. Register a new applicant account.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  full_name: { type: 'string' },
                },
                required: ['username', 'email', 'password', 'full_name'],
              },
            },
          },
        },
        responses: { '200': { description: 'Registration successful' }, '400': { description: 'Validation error' } },
      },
    },

    // ── PPDB ───────────────────────────────────────────────
    '/ppdb/periods': {
      get: {
        summary: 'List PPDB Periods',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated periods' } },
      },
      post: {
        summary: 'Create PPDB Period',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Period created' } },
      },
    },
    '/ppdb/waves': {
      get: {
        summary: 'List PPDB Waves',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'period_id', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'Paginated waves' } },
      },
      post: {
        summary: 'Create PPDB Wave',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Wave created' } },
      },
    },
    '/ppdb/levels': {
      get: {
        summary: 'List Education Levels',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of levels' } },
      },
      post: {
        summary: 'Create Education Level',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Level created' } },
      },
    },
    '/ppdb/categories': {
      get: {
        summary: 'List Registration Categories',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of categories' } },
      },
      post: {
        summary: 'Create Registration Category',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Category created' } },
      },
    },
    '/ppdb/flows': {
      get: {
        summary: 'List Selection Flows',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of flows' } },
      },
      post: {
        summary: 'Create Selection Flow',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Flow created' } },
      },
    },
    '/ppdb/wave-configs': {
      get: {
        summary: 'List Wave Configurations',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated wave configurations' } },
      },
      post: {
        summary: 'Create Wave Configuration',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Wave config created' } },
      },
    },
    '/ppdb/applicants': {
      get: {
        summary: 'List Applicants (Admin)',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'perPage', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated applicants' } },
      },
    },
    '/ppdb/applicants/register': {
      post: {
        summary: 'Register as Applicant',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Registration successful' } },
      },
    },
    '/ppdb/applicants/me': {
      get: {
        summary: 'Get My Application',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Applicant data with profile' } },
      },
    },
    '/ppdb/public/wave-configs': {
      get: {
        summary: 'List Active Wave Configs (Public)',
        tags: ['PPDB'],
        description: 'Public endpoint. No authentication required.',
        responses: { '200': { description: 'Active wave configurations' } },
      },
    },
    '/ppdb/document-requirements': {
      get: {
        summary: 'List Document Requirements',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of document requirements' } },
      },
      post: {
        summary: 'Create Document Requirement',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Requirement created' } },
      },
    },
    '/ppdb/admin/documents/review': {
      get: {
        summary: 'Document Review Queue',
        tags: ['PPDB'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', default: 'uploaded' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { '200': { description: 'Paginated document review queue' } },
      },
    },

    // ── Payment ────────────────────────────────────────────
    '/payment/stages': {
      get: {
        summary: 'List Payment Stages',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of payment stages' } },
      },
      post: {
        summary: 'Create Payment Stage',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Stage created' } },
      },
    },
    '/payment/invoices': {
      get: {
        summary: 'List Invoices (Admin)',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated invoices' } },
      },
    },
    '/payment/invoices/mine': {
      get: {
        summary: 'Get My Invoices',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Applicant invoices with transactions' } },
      },
    },
    '/payment/transactions': {
      get: {
        summary: 'List Transactions (Admin)',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Paginated transactions' } },
      },
      post: {
        summary: 'Submit Payment Transaction',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        description: 'Submit a payment proof with invoice ID, amount, and file.',
        responses: { '201': { description: 'Transaction created' } },
      },
    },
    '/payment/discounts': {
      get: {
        summary: 'List Discounts',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of discounts' } },
      },
      post: {
        summary: 'Create Discount',
        tags: ['Payment'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Discount created' } },
      },
    },

    // ── Selection ──────────────────────────────────────────
    '/selection/test-types': {
      get: {
        summary: 'List Test Types',
        tags: ['Selection'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of test types' } },
      },
      post: {
        summary: 'Create Test Type',
        tags: ['Selection'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Test type created' } },
      },
    },
    '/selection/parameters': {
      get: {
        summary: 'List Selection Parameters',
        tags: ['Selection'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of parameters' } },
      },
      post: {
        summary: 'Create Selection Parameter',
        tags: ['Selection'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Parameter created' } },
      },
    },
    '/selection/scores': {
      get: {
        summary: 'List Selection Scores',
        tags: ['Selection'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of scores' } },
      },
      post: {
        summary: 'Submit Selection Score',
        tags: ['Selection'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Score submitted' } },
      },
    },

    // ── Notifications ──────────────────────────────────────
    '/notif/templates': {
      get: {
        summary: 'List Notification Templates',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of templates' } },
      },
      post: {
        summary: 'Create Notification Template',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Template created' } },
      },
    },

    // ── Post ───────────────────────────────────────────────
    '/post/mou-templates': {
      get: {
        summary: 'List MOU Templates',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of MOU templates' } },
      },
      post: {
        summary: 'Create MOU Template',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'MOU template created' } },
      },
    },
    '/post/mou': {
      get: {
        summary: 'List MOUs',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of MOUs' } },
      },
      post: {
        summary: 'Create MOU',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'MOU created' } },
      },
    },
    '/post/re-registrations': {
      get: {
        summary: 'List Re-registrations',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of re-registrations' } },
      },
      post: {
        summary: 'Create Re-registration',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Re-registration created' } },
      },
    },
    '/post/mpls': {
      get: {
        summary: 'List MPLS Schedules',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of MPLS schedules' } },
      },
      post: {
        summary: 'Create MPLS Schedule',
        tags: ['Post'],
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'MPLS schedule created' } },
      },
    },

    // ── Dashboard ──────────────────────────────────────────
    '/dashboard/stats': {
      get: {
        summary: 'Dashboard Statistics',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Dashboard stats' } },
      },
    },


  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /companyprofile/auth/login',
      },
    },
  },
  tags: [
    { name: 'Root', description: 'Health check and documentation endpoints' },
    { name: 'Auth', description: 'Authentication and user profile management' },
    { name: 'Company Profile - Auth', description: 'Company profile authentication' },
    { name: 'Company Profile - Upload', description: 'File upload and management' },
    { name: 'Company Profile - Settings', description: 'Site settings management' },
    { name: 'Company Profile - Contact', description: 'Contact information' },
    { name: 'Company Profile - News', description: 'News articles management' },
    { name: 'Company Profile - Programs', description: 'Academic programs' },
    { name: 'Company Profile - Facilities', description: 'Campus facilities' },
    { name: 'Company Profile - Staff', description: 'Staff and faculty members' },
    { name: 'Company Profile - Achievements', description: 'Awards and achievements' },
    { name: 'Company Profile - Gallery', description: 'Photo gallery' },
    { name: 'Company Profile - Social', description: 'Social media links' },
    { name: 'Company Profile - Testimonials', description: 'Parent and student testimonials' },
    { name: 'Users', description: 'User management' },
    { name: 'Roles', description: 'Role management' },
    { name: 'Superadmin', description: 'Superadmin dashboard' },
    { name: 'PPDB', description: 'PPDB admission management (periods, waves, applicants, documents)' },
    { name: 'Payment', description: 'Payment stages, invoices, transactions, and discounts' },
    { name: 'Selection', description: 'Selection test types, parameters, and scores' },
    { name: 'Notifications', description: 'Notification templates and calendar events' },
    { name: 'Post', description: 'MOU, re-registrations, MPLS schedules' },
    { name: 'Dashboard', description: 'Dashboard statistics' },
    { name: 'SPP', description: 'School fee management' },
    { name: 'Students', description: 'Student management' },
  ],
}
