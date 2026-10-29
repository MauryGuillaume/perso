import { PrismaClient } from '../../node_modules/.prisma/livora-client';

// Client Prisma unique pour toute l'API : les providers d'auth et de rôles le partagent au lieu
// d'ouvrir chacun leur propre pool de connexions.
export const prisma = new PrismaClient();
