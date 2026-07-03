export const config = {
  jwtSecret: process.env.JWT_SECRET || '',
  jwtAlgorithm: 'HS256' as const,
  jwtExpiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
  mysqlHost: process.env.MYSQL_HOST || '',
  mysqlPort: parseInt(process.env.MYSQL_PORT || '3306', 10),
  mysqlUser: process.env.MYSQL_USER || '',
  mysqlPassword: process.env.MYSQL_PASSWORD || '',
  mysqlDatabase: process.env.MYSQL_DATABASE || '',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
}

if (!config.jwtSecret) {
  console.error('JWT_SECRET is not set!')
}
if (config.jwtSecret === 'change-me-in-production') {
  console.error('JWT_SECRET is still the default value!')
}
if (!config.mysqlHost || !config.mysqlUser || !config.mysqlPassword || !config.mysqlDatabase) {
  console.warn('MySQL credentials are not fully configured!')
}
