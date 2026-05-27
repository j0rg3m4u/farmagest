/**
 * Data migration: cria setor "Geral" default e migra usuários existentes.
 * Rodar UMA vez por ambiente após o deploy da Sprint 1.5.
 * Idempotente via upsert.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const setorGeral = await prisma.sector.upsert({
    where: { code: 'GEN' },
    update: {},
    create: {
      name: 'Geral',
      code: 'GEN',
      responsible: 'A definir',
      description:
        'Setor default criado durante migração para multi-setor. Reorganize os usuários conforme necessidade.',
    },
  });

  const { count } = await prisma.user.updateMany({
    where: {
      sectorId: null,
      role: { in: ['COORDINATION', 'ADMIN', 'ASSISTANT'] },
    },
    data: { sectorId: setorGeral.id },
  });

  console.log(`✓ Setor Geral criado (id: ${setorGeral.id})`);
  console.log(`✓ ${count} usuário(s) COORDINATION/ADMIN/ASSISTANT migrados para setor Geral`);
}

main()
  .catch((e) => {
    console.error('Erro na migration de dados:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
