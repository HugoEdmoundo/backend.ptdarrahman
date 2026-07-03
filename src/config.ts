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
