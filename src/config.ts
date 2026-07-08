function requireEnv(name: string): string {
  const val = process.env[name]
  if (val === undefined) throw new Error(`Missing required environment variable: ${name}`)
  return val
}

export const config = {
  get jwtSecret() { return requireEnv('JWT_SECRET') },
  jwtAlgorithm: 'HS256' as const,
  get jwtExpiryHours() { return parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10) },
  get mysqlHost() { return requireEnv('MYSQL_HOST') },
  get mysqlPort() { return parseInt(process.env.MYSQL_PORT || '3306', 10) },
  get mysqlUser() { return requireEnv('MYSQL_USER') },
  get mysqlPassword() { return requireEnv('MYSQL_PASSWORD') },
  get mysqlDatabase() { return requireEnv('MYSQL_DATABASE') },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
}
