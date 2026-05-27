import { PrismaClient, UserRole, UnitType, ItemCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed não deve rodar em produção.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  await prisma.lot.deleteMany();
  await prisma.item.deleteMany();
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

  // Manager — vê todos os setores
  await prisma.user.create({
    data: {
      name: 'Marcele Rodrigues',
      email: 'marcele.manager@duquedecaxias.rj.gov.br',
      passwordHash,
      role: UserRole.MANAGER,
    },
  });

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

  // ============ ITENS — CORRELATOS ============
  const itensCorrelatos = [
    { description: 'Seringa descartável 5ml', category: ItemCategory.CORRELATE, unitOfMeasure: 'un', manufacturer: 'BD' },
    { description: 'Seringa descartável 10ml', category: ItemCategory.CORRELATE, unitOfMeasure: 'un', manufacturer: 'BD' },
    { description: 'Soro fisiológico 0,9% 500ml', category: ItemCategory.CORRELATE, unitOfMeasure: 'frasco', manufacturer: 'Eurofarma' },
    { description: 'Soro glicosado 5% 500ml', category: ItemCategory.CORRELATE, unitOfMeasure: 'frasco', manufacturer: 'Eurofarma' },
    { description: 'Esparadrapo 10cm x 4,5m', category: ItemCategory.CORRELATE, unitOfMeasure: 'un', manufacturer: 'Cremer' },
    { description: 'Algodão hidrófilo 500g', category: ItemCategory.CORRELATE, unitOfMeasure: 'pacote', manufacturer: 'Cremer' },
    { description: 'Luva de procedimento M', category: ItemCategory.CORRELATE, unitOfMeasure: 'caixa', manufacturer: 'Supermax' },
    { description: 'Máscara cirúrgica tripla', category: ItemCategory.CORRELATE, unitOfMeasure: 'caixa', manufacturer: 'Descarpack' },
  ];

  let seq = 0;
  for (const item of itensCorrelatos) {
    seq++;
    await prisma.item.create({
      data: {
        code: `COR-${String(seq).padStart(4, '0')}`,
        description: item.description,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        manufacturer: item.manufacturer,
        controlled344: false,
        sectorId: setorCorr.id,
        sequence: seq,
      },
    });
  }
  await prisma.sector.update({ where: { id: setorCorr.id }, data: { itemSequence: seq } });

  // ============ ITENS — MEDICAMENTOS ============
  const itensMedicamentos = [
    { description: 'Dipirona sódica 500mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'EMS', controlled344: false },
    { description: 'Amoxicilina 500mg cps', category: ItemCategory.MEDICATION, unitOfMeasure: 'cps', manufacturer: 'Eurofarma', controlled344: false },
    { description: 'Captopril 25mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'EMS', controlled344: false },
    { description: 'Losartana potássica 50mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'Sandoz', controlled344: false },
    { description: 'Metformina 850mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'EMS', controlled344: false },
    { description: 'Omeprazol 20mg cap', category: ItemCategory.MEDICATION, unitOfMeasure: 'cap', manufacturer: 'Medley', controlled344: false },
    { description: 'Atenolol 25mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'EMS', controlled344: false },
    { description: 'Cefalexina 500mg cps', category: ItemCategory.MEDICATION, unitOfMeasure: 'cps', manufacturer: 'Eurofarma', controlled344: false },
    { description: 'Clonazepam 2mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'EMS', controlled344: true },
    { description: 'Diazepam 10mg cp', category: ItemCategory.MEDICATION, unitOfMeasure: 'cp', manufacturer: 'EMS', controlled344: true },
  ];

  seq = 0;
  const itemMedIds: Record<string, string> = {};
  for (const item of itensMedicamentos) {
    seq++;
    const code = `MED-${String(seq).padStart(4, '0')}`;
    const created = await prisma.item.create({
      data: {
        code,
        description: item.description,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        manufacturer: item.manufacturer,
        controlled344: item.controlled344,
        sectorId: setorMed.id,
        sequence: seq,
      },
    });
    itemMedIds[code] = created.id;
  }
  await prisma.sector.update({ where: { id: setorMed.id }, data: { itemSequence: seq } });

  console.log('✓ 8 itens em Correlatos, 10 itens em Medicamentos');

  // ============ LOTES INICIAIS ============
  const dipironId = itemMedIds['MED-0001'];
  const amoxiId = itemMedIds['MED-0002'];

  await prisma.lot.create({
    data: {
      itemId: dipironId,
      lotNumber: 'LT-2024-0312',
      manufacturingDate: new Date('2024-03-15'),
      expirationDate: new Date('2026-10-31'),
      initialQuantity: 500,
      currentBalance: 90,
      supplier: 'EMS Pharma S.A.',
      invoiceNumber: 'NF 4587',
    },
  });

  await prisma.lot.create({
    data: {
      itemId: dipironId,
      lotNumber: 'LT-2025-0118',
      manufacturingDate: new Date('2025-01-20'),
      expirationDate: new Date('2027-06-30'),
      initialQuantity: 1000,
      currentBalance: 1000,
      supplier: 'EMS Pharma S.A.',
      invoiceNumber: 'NF 5890',
    },
  });

  await prisma.lot.create({
    data: {
      itemId: amoxiId,
      lotNumber: 'LT-2025-0044',
      manufacturingDate: new Date('2025-02-01'),
      expirationDate: new Date('2027-02-28'),
      initialQuantity: 300,
      currentBalance: 300,
      supplier: 'Eurofarma Laboratórios S.A.',
      invoiceNumber: 'NF 2341',
    },
  });

  console.log('✓ 3 lotes criados');

  // ============ VALIDAÇÃO DE CONSISTÊNCIA ============
  const inconsistent = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { role: { in: ['COORDINATION', 'ADMIN', 'ASSISTANT'] }, sectorId: null },
        { role: { in: ['MANAGER', 'UNIT'] }, sectorId: { not: null } },
      ],
    },
    select: { email: true, role: true, sectorId: true },
  });

  if (inconsistent.length > 0) {
    console.error('❌ Seed produziu usuários inconsistentes:', inconsistent);
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Logins disponíveis (senha: FarmaGest@2026):');
  console.log('  marcele.manager@...   → MANAGER (vê todos os setores)');
  console.log('  marylyn@...           → COORDINATION / Medicamentos');
  console.log('  ricardo.coordenacao@... → COORDINATION / Correlatos');
  console.log('  lucia.admin@...       → ADMIN / Medicamentos');
  console.log('  carlos.aux@...        → ASSISTANT / Medicamentos');
  console.log('  joana.aux@...         → ASSISTANT / Correlatos');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✓ Seed concluído com estado consistente');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
