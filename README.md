# Evidence řidičů - AZA

Webová aplikace pro evidenci dostupnosti řidičů.

## Technologie

- Next.js 14 (App Router)
- Tailwind CSS
- SQLite + Prisma ORM
- NextAuth.js pro autentizaci

## Instalace

```bash
# Instalace závislostí
npm install

# Vygenerování Prisma klienta
npm run db:generate

# Vytvoření databáze a tabulek
npm run db:push

# Naplnění databáze testovacími daty
npm run db:seed
```

## Spuštění

```bash
# Vývojový server
npm run dev

# Produkční build
npm run build
npm run start
```

Aplikace poběží na http://localhost:3000

## Testovací účty

| Role     | Email              | Heslo         |
|----------|--------------------|---------------|
| Dispečer | dispecer@aza.cz    | dispatcher123 |
| Řidič    | petr.novak@aza.cz  | ridic123      |
| Řidič    | jana.svobodova@aza.cz | ridic123   |
| Řidič    | martin.dvorak@aza.cz  | ridic123   |

## Struktura projektu

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth API
│   │   ├── availability/        # API pro dostupnost
│   │   └── drivers/             # API pro řidiče
│   ├── dispecer/                # Dashboard dispečera
│   ├── ridic/                   # Dashboard řidiče
│   ├── prihlaseni/              # Přihlašovací stránka
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── calendar/                # Kalendářové komponenty
│   ├── providers/               # Session provider
│   └── ui/                      # UI komponenty
├── lib/
│   ├── auth.ts                  # NextAuth konfigurace
│   ├── prisma.ts                # Prisma klient
│   └── utils.ts                 # Pomocné funkce
├── types/
│   └── next-auth.d.ts           # Rozšíření typů
└── middleware.ts                # Middleware pro autorizaci
```

## Funkce

### Řidič
- Zobrazení měsíčního kalendáře
- Nastavení dostupnosti pro jednotlivé dny (Dostupný / Částečně / Nedostupný)
- Přidání poznámky k dostupnosti

### Dispečer
- Týdenní přehled dostupnosti všech řidičů
- Navigace mezi týdny
- Barevné rozlišení stavů dostupnosti
