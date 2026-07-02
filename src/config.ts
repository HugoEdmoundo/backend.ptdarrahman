export const config = {
  jwtSecret: process.env.JWT_SECRET || '',
  jwtAlgorithm: 'HS256' as const,
  jwtExpiryHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24', 10),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
}

if (!config.jwtSecret) throw new Error('JWT_SECRET is not set!')
if (config.jwtSecret === 'change-me-in-production') throw new Error('JWT_SECRET is still the default value!')
if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY is empty!')
}
