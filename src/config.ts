function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}

export const config = {
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtAlgorithm: 'HS256' as const,
  jwtExpiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
  mysqlHost: requireEnv('MYSQL_HOST'),
  mysqlPort: parseInt(process.env.MYSQL_PORT || '3306', 10),
  mysqlUser: requireEnv('MYSQL_USER'),
  mysqlPassword: requireEnv('MYSQL_PASSWORD'),
  mysqlDatabase: requireEnv('MYSQL_DATABASE'),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
}
