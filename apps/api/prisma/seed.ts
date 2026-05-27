import { PrismaClient, UserRole, UnitType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed não deve rodar em produção.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.sector.deleteMany();

  // ============ SETORES ============
  const [setorMed, setorCorr] = await Promise.all([
    prisma.sector.create({
      data: {
        name: 'Medicamentos',
        code: 'MED',
        responsible: 'Marylyn Macedo',
        description: 'Setor responsável pelo controle e dispensação de medicamentos.',
      },
    }),
    prisma.sector.create({
      data: {
        name: 'Correlatos',
        code: 'COR',
        responsible: 'Ricardo Mendes',
        description: 'Setor responsável por materiais correlatos e insumos hospitalares.',
      },
    }),
  ]);

  console.log('✓ 2 setores criados (Medicamentos, Correlatos)');

  // ============ UNIDADES DE SAÚDE ============
  const unidades = await Promise.all([
    prisma.unit.create({
      data: {
        name: 'UBS Jardim Primavera',
        type: UnitType.UBS,
        address: 'Rua das Acácias, 145 — Jardim Primavera, Duque de Caxias/RJ',
        responsible: 'Ana Paula Ribeiro',
        contact: '(21) 2671-1100',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UBS Imbariê',
        type: UnitType.UBS,
        address: 'Av. Brasil, 2890 — Imbariê, Duque de Caxias/RJ',
        responsible: 'Roberto Carlos Souza',
        contact: '(21) 2671-1200',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UBS Pilar',
        type: UnitType.UBS,
        address: 'Rua Beira-Mar, 78 — Pilar, Duque de Caxias/RJ',
        responsible: 'Maria Aparecida Santos',
        contact: '(21) 2671-1300',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UPA Centro',
        type: UnitType.UPA,
        address: 'Praça Dom Pedro II, s/n — Centro, Duque de Caxias/RJ',
        responsible: 'Dr. Fernando Almeida',
        contact: '(21) 2671-2000',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'UPA Saracuruna',
        type: UnitType.UPA,
        address: 'Rua João Mendes, 540 — Saracuruna, Duque de Caxias/RJ',
        responsible: 'Dra. Cristina Pereira',
        contact: '(21) 2671-2100',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'Hospital Municipal Moacyr do Carmo',
        type: UnitType.HOSPITAL,
        address: 'Av. Presidente Vargas, 1100 — Centro, Duque de Caxias/RJ',
        responsible: 'Dr. Eduardo Nogueira',
        contact: '(21) 2671-3000',
      },
    }),
    prisma.unit.create({
      data: {
        name: 'CAPS II Caxias',
        type: UnitType.CAPS,
        address: 'Rua Ipiranga, 232 — Centro, Duque de Caxias/RJ',
        responsible: 'Patrícia Vieira',
        contact: '(21) 2671-4000',
      },
    }),
  ]);

  console.log(`✓ ${unidades.length} unidades criadas`);

  // ============ USUÁRIOS ============
  const passwordHash = await bcrypt.hash('FarmaGest@2026', 10);

  // Coordenação — setor Medicamentos
  await prisma.user.create({
    data: {
      name: 'Marylyn Macedo',
      email: 'marylyn@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.COORDINATION,
      sectorId: setorMed.id,
    },
  });

  // Coordenação — setor Correlatos
  await prisma.user.create({
    data: {
      name: 'Ricardo Mendes',
      email: 'ricardo.coordenacao@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.COORDINATION,
      sectorId: setorCorr.id,
    },
  });

  // Admin — setor Medicamentos
  await prisma.user.create({
    data: {
      name: 'Lucia Ferreira',
      email: 'lucia.admin@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.ADMIN,
      sectorId: setorMed.id,
    },
  });

  // Auxiliar — setor Medicamentos
  await prisma.user.create({
    data: {
      name: 'Carlos Silva',
      email: 'carlos.aux@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.ASSISTANT,
      sectorId: setorMed.id,
    },
  });

  // Auxiliar — setor Correlatos
  await prisma.user.create({
    data: {
      name: 'Joana Oliveira',
      email: 'joana.aux@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.ASSISTANT,
      sectorId: setorCorr.id,
    },
  });

  // Usuários de unidade (sem setor)
  for (const unidade of unidades) {
    const slug = unidade.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');

    await prisma.user.create({
      data: {
        name: `Responsável ${unidade.name}`,
        email: `${slug}@duquedecaxias.rj.gov.br`,
        passwordHash,
        role: UserRole.UNIT,
        unitId: unidade.id,
      },
    });
  }

  console.log('✓ Usuários criados');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('Logins disponíveis (senha: FarmaGest@2026):');
  console.log('  marylyn@duquedecaxias.rj.gov.br     → COORDINATION / Medicamentos');
  console.log('  ricardo.coordenacao@...              → COORDINATION / Correlatos');
  console.log('  lucia.admin@...                      → ADMIN / Medicamentos');
  console.log('  carlos.aux@...                       → ASSISTANT / Medicamentos');
  console.log('  joana.aux@...                        → ASSISTANT / Correlatos');
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
