import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Smazat existující data
  await prisma.route.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('amaty2019', 10);

  // Vytvoření dispečera
  const dispatcher = await prisma.user.create({
    data: {
      email: 'dispecer@aza.cz',
      name: 'Dispečer',
      password: hashedPassword,
      role: 'DISPATCHER',
    },
  });
  console.log('Created dispatcher:', dispatcher.name);

  // Vytvoření řidičů (pouze jako entity, nepřihlašují se)
  const driversData = [
    { name: 'Hára', color: '#3B82F6' },    // blue
    { name: 'Folíňo', color: '#10B981' },  // green
    { name: 'Jarda', color: '#F59E0B' },   // amber
    { name: 'Dan', color: '#EF4444' },     // red
  ];

  for (const driver of driversData) {
    const slug = driver.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const user = await prisma.user.create({
      data: {
        email: `${slug}@ridic.aza.cz`,
        name: driver.name,
        password: '', // Řidiči se nepřihlašují
        role: 'DRIVER',
        color: driver.color,
      },
    });
    console.log('Created driver:', user.name, '- color:', driver.color);
  }

  // Vytvoření vozidel
  const vehicles = [
    { spz: '1AB 2345', name: 'Škoda Octavia' },
    { spz: '2CD 6789', name: 'VW Transporter' },
    { spz: '3EF 0123', name: 'Mercedes Sprinter' },
  ];

  for (const vehicle of vehicles) {
    const v = await prisma.vehicle.create({
      data: vehicle,
    });
    console.log('Created vehicle:', v.name, '-', v.spz);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
