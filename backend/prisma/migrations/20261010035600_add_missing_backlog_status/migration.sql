-- The BACKLOG status exists in schema.prisma but was never added by a migration.
-- IF NOT EXISTS keeps this safe for databases where it was added manually.
ALTER TYPE "Status" ADD VALUE IF NOT EXISTS 'BACKLOG';
