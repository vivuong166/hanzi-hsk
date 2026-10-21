import pg from 'pg'

const { Pool } = pg

export function databasePoolConfig(environment = process.env) {
  if (!environment.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const databaseUrl = new URL(environment.DATABASE_URL)
  databaseUrl.searchParams.delete('sslmode')
  const sslMode = environment.DATABASE_SSL_MODE ?? 'require'
  const isProduction = environment.NODE_ENV === 'production'

  if (!['require', 'disable'].includes(sslMode)) throw new Error('DATABASE_SSL_MODE must be require or disable')
  if (isProduction && sslMode === 'disable') throw new Error('DATABASE_SSL_MODE=disable is not allowed in production')

  return {
    connectionString: databaseUrl.toString(),
    ssl: sslMode === 'require' ? { rejectUnauthorized: true } : false,
  }
}

export function createDatabasePool(environment = process.env) {
  return new Pool(databasePoolConfig(environment))
}
