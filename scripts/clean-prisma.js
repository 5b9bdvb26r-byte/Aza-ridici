const fs = require('fs');
const path = require('path');

// Smaže cachovaného Prisma klienta aby se vynutila čistá regenerace ze schema
// Na Vercelu se cachuje node_modules a .prisma/client může obsahovat starého klienta
const prismaDir = path.join(__dirname, '..', 'node_modules', '.prisma');

try {
  if (fs.existsSync(prismaDir)) {
    fs.rmSync(prismaDir, { recursive: true, force: true });
    console.log('Smazán cachovaný Prisma client: ' + prismaDir);
  } else {
    console.log('Žádný cachovaný Prisma client k smazání');
  }
} catch (e) {
  console.log('Nelze smazat ' + prismaDir + ': ' + e.message);
}

console.log('Prisma cache vyčištěna, bude se generovat nový klient...');
