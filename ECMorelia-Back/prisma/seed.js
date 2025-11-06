const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Llenar la tabla de estado_paciente
  const estadosPaciente = [
    { descripcion: 'Verde: Afección leve' },
    { descripcion: 'Amarillo: Grave y estable' },
    { descripcion: 'Rojo: Crítico recuperable' },
    { descripcion: 'Negro: Fallecido / agónico' },
  ];

  for (const estado of estadosPaciente) {
    await prisma.estadoPaciente.create({
      data: estado,
    });
  }

  // Llenar la tabla de tipo_lesion
  const tiposLesion = [
    { descripcion: 'Hemorragia' },
    { descripcion: 'Contusión' },
    { descripcion: 'Abrasión' },
    { descripcion: 'Herida' },
    { descripcion: 'Fractura' },
    { descripcion: 'Quemadura' },
    { descripcion: 'Alteración en la sensibilidad' },
    { descripcion: 'Alteración en la movilidad' },
    { descripcion: 'Dolor' },
    { descripcion: 'Otro' },
  ];

  for (const tipo of tiposLesion) {
    await prisma.tipoLesion.create({
      data: tipo,
    });
  }

  console.log('Datos de las tablas de catálogo insertados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
