## Parte Lote A

Rama `capataz/lote-A` (worktree `C:/Users/guill/dev/arcana-lotes/lote-A`), base `dda10e2`. Sólo archivos nuevos en `src/lib/systems/**` y `src/__tests__/lib/systems/**` (más este parte). Sin dependencias nuevas, sin `git push`, sin `prisma`. `src/lib/zodiac.ts` y `prisma/seed.ts` sólo se leen.

### Hechas

- **F-20** `types.ts` (`Locale`, `Bilingual`, `localize`), `shared.ts` (helpers internos: `mod` positivo, `utcParts`, `todayUtc`, `digitSum`, `assertValidDate`) y `western.ts`: 12 signos con nombre (es tomado de `getZodiacSignEs`), emoji (de `getZodiacEmoji`), elemento, modalidad, regente, rasgos, descripción de 3 frases y carta (Aries 4 … Piscis 18). Envuelve `getZodiacSign` sin modificarlo: le pasa una fecha *local* armada con los campos UTC, porque `zodiac.ts` lee `getMonth/getDate` locales. Compatibilidad por elemento según la tabla del plan. · Test `src/__tests__/lib/systems/western.test.ts` (35): límites 20/21 mar, 19/20 abr, 21/22 dic, 19/20 ene, 18/19 feb, 29 feb; mismo signo a las 00:00Z y a las 23:59Z (la máquina corre en America/Mexico_City, así que sin el envoltorio UTC el caso 00:00Z da Piscis); tabla de cartas; 16 combinaciones de elementos y simetría. · Commit `ca16382`.
- **F-21** `chinese-zodiac.ts`: tabla de Año Nuevo lunar 1924–2043 en el código con comentario de la fuente; la verifiqué contra lunas nuevas astronómicas (Meeus cap. 49, hora de Beijing): las 120 fechas son día de luna nueva y en los 5 años con dos lunas nuevas en la ventana (1966, 1985, 2004, 2023, 2042) sigue el calendario oficial. Ciclo de 60 (elemento por `(año − 1924) mod 10`, polaridad por paridad), trinos, amigo secreto, choque, compatibilidad. Fuera de la tabla usa el 4 de febrero (Lichun). · Test `chinese-zodiac.test.ts` (26): los 5 vectores del plan, el propio día de Año Nuevo, 1985 (20 feb), lectura UTC, años antes de 1924 con módulo positivo, la tabla sin huecos y con saltos de 12 o 13 lunaciones, las 144 parejas simétricas. · Commit `e858eaa`.
- **F-22** `tonalpohualli.ts`: 20 signos (náhuatl, nombre, glifo, rumbo, patrono, significado, rasgos), 20 trecenas, 9 Señores de la Noche, `TONALPOHUALLI_INTRO` ("En la tradición mexica… Es un calendario vivo…"). `julianDayNumber` con Fliegel–Van Flandern sobre campos UTC; `tonalliFromJDN` exportada para fechas julianas. · Test `tonalpohualli.test.ts` (27): **13 ago 1521 juliano (JDN 2276828) → 1 Cóatl**; **4 nov 2026 (JDN 2461349) → 13 Miquiztli**; **21 dic 2012 (JDN 2456283, d = 1872000) → 4 Xóchitl** (vector adicional del coordinador); **2000-01-01 → JDN 2451545**; además 23 ago 1521 gregoriano = JDN 2276828, 1582-10-15 → 2299161, continuidad del JDN de día en día, las 260 combinaciones exactamente una vez, `cycleDay` coherente con número y signo, cada trecena empieza en 1 de su signo, JDN 0 con módulo positivo. · Commit `65877d1`.
- **F-23** `numerology.ts`: según §4.5; acentos con NFD (á→a, ñ→n, ü→u), espacios, guiones y guion bajo como separadores, símbolos ignorados, "y" vocal si no tiene vocal al lado. · Test `numerology.test.ts` (54): 1990-07-15 → 5; "John Smith" → 8 (y alma 6, personalidad 11); 1988-08-08 → 6; maestros 1990-01-09 → 11, 2000-11-09 → 22, 2009-11-11 → 33; "José Peña" = "Jose Pena" = "JOSÉ PEÑA" → 4; "Ñu" → 8; acento compuesto y descompuesto iguales; "Mary-Jane O'Neil"; Lynn/Maya/Yolanda; nombres sin letras → `null`; año/mes/día personal (5/7/2 para 1990-07-15 el 2026-11-04). · Commit `2cc1443`.
- **F-24** `birth-cards.ts`: `MAJOR_ARCANA` (22, `name`/`nameEs` idénticos al seed, palabras clave bilingües), `getBirthCards`, `getTarotYearCard`. · Test `birth-cards.test.ts`: **lee `prisma/seed.ts` y compara las 22 entradas (`number`, `name`, `nameEs`)**; vectores 1990-07-15 → 5/5, 1975-12-28 → 8, 1962-08-21 → 20/2; 19 → 10 → 1 (factor oculto 10); 22 → El Loco (0) con alma 4; suma > 22 se reduce otra vez; carta del año. · Commit `38f0547`.
- **F-25** `moon.ts`: mes sinódico 29.530588853 d desde JD 2451550.1; ocho fases bilingües con emoji y guía; `getMoonPhase` evalúa el día UTC a las 12:00 UTC; `getNextFullMoon`/`getNextNewMoon` devuelven instantes. · Test `moon.test.ts`: los 3 vectores con ±1 día (2000-01-06 nueva, 2000-01-21 llena, 2026-01-03 llena) y además acierta el día exacto; próximas lunas contra fenómenos conocidos (±1 día): llena 2026-03-03 (eclipse), nuevas 2024-04-08, 2026-02-17 y 2026-08-12 (eclipses); orden de las ocho fases en una lunación. El test "estrictamente después" encontró un bug real (al pasar como entrada el instante devuelto antes, redondeado al milisegundo, devolvía el mismo instante); corregido: menos de 1 s cuenta como "ahora". · Commit `0e3bb44`.
- **F-26** `index.ts`: `getArcanaBlueprint`, `describeBlueprintForAI`, `getDayEnergies`, `describeDayEnergies`, y re-exporta todos los módulos (`import { … } from "@/lib/systems"`). · Test `index.test.ts`: el blueprint coincide módulo por módulo; valores de 1990-07-15 (Cáncer, Caballo de Metal, 12 Cóatl, camino 5, Hierofante); **`describeBlueprintForAI` ≤ 900 caracteres y sin `undefined`/`null`/`NaN` en es y en**, barriendo ~3,500 fechas de 1925 a 2030 con nombres vacíos, con acentos y de 400 caracteres (el texto completo mide ~550–600; el recorte nunca se activa); factor oculto y El Loco; energías del día en 2 líneas (3 con fecha de nacimiento) durante todo 2026 en ambos idiomas. · Commit `bbb5de4`.
- **F-27** Cada módulo tiene su suite, más `content.test.ts` (commit `9b50313`), que recorre las más de 400 parejas `{ en, es }` de toda la librería (≈465): no vacías, sin espacios dobles ni saltos de línea, español con acentos (ninguna terminación "-cion", "dia", "Mexico"), sin clichés ni predicciones ("universo", "cósmico", "vibración", "destinado", "te pasará", "los aztecas creían"), descripciones de 2–3 frases, y el tonalpohualli presentado como tradición viva. Sin dependencias nuevas (`package.json` y `package-lock.json` intactos).

Muestra real de `describeBlueprintForAI(…, "es")` (1990-07-15, 598 caracteres):

```
Mapa Arcano (nacimiento 1990-07-15).
- Zodiaco occidental: Cáncer (agua, cardinal; regente Luna). Cuidado, memoria, intuición.
- Zodiaco chino: Caballo de Metal (Yang). Libertad, energía, franqueza.
- Tonalpohualli (tradición mexica): 12 Cóatl · 12 Serpiente, trecena Ce Océlotl. La fuerza vital que se mueve pegada a la tierra: la sabiduría, la renovación y la fertilidad.
- Numerología: camino de vida 5 (la libertad), expresión 9, alma 3, personalidad 6, cumpleaños 6, año personal 5.
- Cartas natales del tarot: personalidad El Hierofante, alma El Hierofante.
- Luna al nacer: Cuarto menguante.
```

Y de `describeDayEnergies(getDayEnergies(2026-11-04, 1990-07-15), "es")`:

```
Tonalli del día (tradición mexica): 13 Miquiztli · 13 Muerte, trecena Ce Océlotl. La transformación y los ancestros: los finales que abren espacio a lo que viene.
Fase lunar: Luna menguante, 28% de iluminación. Descansa y escucha antes de que empiece el siguiente ciclo.
Día personal 2: cooperación, sensibilidad, diplomacia.
```

### Exports públicos (firmas exactas, para los lotes B–F)

Todo se importa desde `@/lib/systems` (el `index.ts` re-exporta cada módulo). Todas las funciones de fecha leen campos UTC y lanzan `RangeError` con una fecha inválida.

`types.ts`
```ts
export type Locale = "en" | "es";
export interface Bilingual { en: string; es: string }
export function localize(text: Bilingual, locale: Locale): string;
```

`western.ts`
```ts
export type WesternElement = "Fire" | "Earth" | "Air" | "Water";
export type WesternModality = "Cardinal" | "Fixed" | "Mutable";
export type WesternSignKey = "Aries" | "Taurus" | … | "Pisces";
export interface WesternSign { key: string; name: Bilingual; emoji: string; element: WesternElement; modality: WesternModality; ruler: Bilingual; traits: Bilingual; description: Bilingual; tarotArcana: number }
export const WESTERN_SIGN_KEYS: readonly WesternSignKey[];
export const WESTERN_ELEMENT_NAMES: Record<WesternElement, Bilingual>;
export const WESTERN_MODALITY_NAMES: Record<WesternModality, Bilingual>;
export const WESTERN_SIGNS: Record<WesternSignKey, WesternSign>;
export function getWesternSign(birthDate: Date): WesternSign;
export function getWesternSignByKey(key: string): WesternSign | null;   // p. ej. UserProfile.zodiacSign
export function getElementCompatibility(a: WesternSign["element"], b: WesternSign["element"]): { score: 1 | 2 | 3 | 4 | 5; summary: Bilingual };
```

`chinese-zodiac.ts`
```ts
export type ChineseAnimal = "Rat" | "Ox" | "Tiger" | "Rabbit" | "Dragon" | "Snake" | "Horse" | "Goat" | "Monkey" | "Rooster" | "Dog" | "Pig";
export type ChineseElement = "Wood" | "Fire" | "Earth" | "Metal" | "Water";
export type ChineseRelation = "same" | "trine" | "secret-friend" | "clash" | "neutral";
export interface ChineseSign { animal: ChineseAnimal; element: ChineseElement; polarity: "Yin" | "Yang"; year: number; animalName: Bilingual; elementName: Bilingual; label: Bilingual; emoji: string; traits: Bilingual; description: Bilingual; trine: ChineseAnimal[]; secretFriend: ChineseAnimal; clash: ChineseAnimal }
export const LUNAR_NEW_YEAR: Readonly<Record<number, string>>;   // 1924–2043, "MM-DD"
export const CHINESE_ANIMALS: readonly ChineseAnimal[];
export const CHINESE_ANIMAL_INFO: Record<ChineseAnimal, { name: Bilingual; emoji: string; traits: Bilingual; description: Bilingual }>;
export const CHINESE_ELEMENT_INFO: Record<ChineseElement, { name: Bilingual; traits: Bilingual }>;
export function getChineseSign(birthDate: Date): ChineseSign;
export function getChineseYearSign(year: number): ChineseSign;
export function getChineseCompatibility(a: ChineseAnimal, b: ChineseAnimal): { score: 1 | 2 | 3 | 4 | 5; relation: ChineseRelation; summary: Bilingual };
```

`tonalpohualli.ts`
```ts
export interface DaySign { index: number; nahuatl: string; name: Bilingual; glyph: string; direction: Bilingual; patron: string; meaning: Bilingual; traits: Bilingual }
export interface Trecena { index: number /* 0–19 */; nahuatl: string; name: Bilingual; patron: string; meaning: Bilingual }
export interface LordOfNight { index: number /* 0–8 */; nahuatl: string; meaning: Bilingual }
export interface Tonalli { number: number; sign: DaySign; trecena: Trecena; lordOfNight: LordOfNight; cycleDay: number; label: Bilingual }
export const TONALPOHUALLI_CORRELATION: 584283;
export const TONALPOHUALLI_INTRO: Bilingual;
export const DAY_SIGNS: readonly DaySign[];
export const TRECENAS: readonly Trecena[];
export const LORDS_OF_THE_NIGHT: readonly LordOfNight[];
export function julianDayNumber(date: Date): number;
export function tonalliFromJDN(jdn: number): Tonalli;
export function getTonalli(date: Date): Tonalli;
```

`numerology.ts`
```ts
export type CoreNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;
export type PersonalNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface NumberMeaning { number: CoreNumber; name: Bilingual; keywords: Bilingual; description: Bilingual; tarotArcana: number }
export interface NumerologyProfile { lifePath: CoreNumber; birthday: CoreNumber; expression: CoreNumber | null; soulUrge: CoreNumber | null; personality: CoreNumber | null; personalYear: PersonalNumber; personalMonth: PersonalNumber; personalDay: PersonalNumber }
export function reduceNumber(n: number, keepMasters?: boolean /* true */): CoreNumber;
export function getLifePathNumber(birthDate: Date): CoreNumber;
export function getBirthdayNumber(birthDate: Date): CoreNumber;
export function getPersonalYear(birthDate: Date, onDate: Date): PersonalNumber;
export function getPersonalMonth(birthDate: Date, onDate: Date): PersonalNumber;
export function getPersonalDay(birthDate: Date, onDate: Date): PersonalNumber;
export function normalizeName(fullName: string): string[];
export function getExpressionNumber(fullName: string): CoreNumber | null;
export function getSoulUrgeNumber(fullName: string): CoreNumber | null;
export function getPersonalityNumber(fullName: string): CoreNumber | null;
export function getNumberMeaning(n: CoreNumber): NumberMeaning;
export function getNumerologyProfile(birthDate: Date, fullName: string, onDate?: Date /* hoy 00:00 UTC */): NumerologyProfile;
```

`birth-cards.ts`
```ts
export interface MajorArcanaInfo { index: number; name: string; nameEs: string; keywords: Bilingual }
export interface BirthCards { personality: number; soul: number; hidden: number | null; sum: number }
export const MAJOR_ARCANA: readonly MajorArcanaInfo[];   // 22; name/nameEs = Card.name/nameEs del seed
export function getBirthCards(birthDate: Date): BirthCards;
export function getTarotYearCard(birthDate: Date, year: number): number;
```

`moon.ts`
```ts
export type MoonPhase = "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";
export interface MoonPhaseInfo { phase: MoonPhase; name: Bilingual; emoji: string; illumination: number; age: number; guidance: Bilingual }
export const SYNODIC_MONTH: number;          // 29.530588853
export const REFERENCE_NEW_MOON_JD: number;  // 2451550.1
export const MOON_PHASES: readonly Omit<MoonPhaseInfo, "illumination" | "age">[];
export function getMoonPhase(date: Date): MoonPhaseInfo;
export function getNextFullMoon(date: Date): Date;
export function getNextNewMoon(date: Date): Date;
```

`index.ts`
```ts
export * from "./types"; export * from "./western"; export * from "./chinese-zodiac"; export * from "./tonalpohualli";
export * from "./numerology"; export * from "./birth-cards"; export * from "./moon";
export function todayUtc(): Date;   // new Date() con setUTCHours(0,0,0,0)
export interface ArcanaBlueprint { western: WesternSign; chinese: ChineseSign; tonalli: Tonalli; numerology: NumerologyProfile; birthCards: BirthCards; moonAtBirth: MoonPhaseInfo; birthDate: string /* "YYYY-MM-DD" */; fullName: string }
export interface DayEnergies { tonalli: Tonalli; moon: MoonPhaseInfo; personalDay: PersonalNumber | null }
export const BLUEPRINT_DESCRIPTION_MAX: 900;
export function getArcanaBlueprint(birthDate: Date, fullName: string, onDate?: Date): ArcanaBlueprint;
export function describeBlueprintForAI(bp: ArcanaBlueprint, locale: Locale): string;
export function getDayEnergies(date: Date, birthDate?: Date | null): DayEnergies;
export function describeDayEnergies(e: DayEnergies, locale: Locale): string;
```

### Falsas o ya hechas

- Ninguna ficha falsa. Una aserción del plan no cuadra: §4.5 lista "2000-11-11 → 11 (maestro, se conserva)" entre los vectores de camino de vida, pero con cualquier método el camino de vida de esa fecha es **6** (11 + 11 + 2 = 24; suma de dígitos 2+0+0+0+1+1+1+1 = 6; 11 + 11 + 2000 = 2022 → 6). El 11 que se conserva es el **número de cumpleaños** (día 11). El test lo deja así: camino de vida 6, cumpleaños 11 (`numerology.test.ts`, "2000-11-11 → 6 …"). Para probar maestros en el camino de vida agregué 1990-01-09 → 11, 2000-11-09 → 22 y 2009-11-11 → 33.

### Bloqueadas / handoffs

- Ninguna bloqueada.
- **Handoff (fuera de mi alcance, bug menor que encontré al leer `zodiac.ts`)**: `src/app/(main)/profile/setup/page.tsx:79-80` hace `getZodiacSign(new Date(formData.birthDate))`. `new Date("1990-03-21")` es medianoche UTC y `zodiac.ts` lee campos locales, así que en México (UTC−6) la vista previa del signo sale un día antes en las cúspides (21 de marzo → Piscis). El servidor (`src/app/api/profile/route.ts:46-47`) corre en UTC en Vercel y guarda el signo correcto, así que sólo falla la vista previa. Cambio sugerido para quien sea dueño de esa página (Lote B o el Integrador): `import { getWesternSign } from "@/lib/systems";` y `const sign = getWesternSign(date).key;`. Alternativa de raíz: que `zodiac.ts` use `getUTCMonth()/getUTCDate()` (lo tocaría el Lote 0 o el Integrador; hay que ajustar `src/__tests__/lib/zodiac.test.ts`, que hoy arma fechas locales).

### Decisiones tomadas (con motivo)

1. **20 trecenas, no 13.** §4.5 dice `Trecena.index 0–12` y F-22 dice "13 trecenas", pero el propio contrato define `trecena.index = floor(cycleDay / 13)`, que va de 0 a 19: el tonalpohualli tiene 20 trecenas de 13 días. Implementé las 20 (Ce Cipactli, Ce Océlotl, Ce Mázatl, … Ce Tochtli) y el tipo documenta 0–19.
2. **Números del nombre devuelven `CoreNumber | null`** en lugar de `CoreNumber`: un nombre sin letras ("", "李", "❤️"), sin vocales ("Brr") o sin consonantes ("Ai") no tiene número, y lanzar un error tumbaría una página o una ruta del Lote F por un nombre raro. Con `null`, TypeScript obliga a manejarlo. `NumerologyProfile.expression/soulUrge/personality` son nullables y `describeBlueprintForAI` los omite.
3. **Reducción del nombre por partes** (cada palabra se reduce y luego se suman, conservando 11/22/33), como en la numerología pitagórica de Decoz; el resultado de un dígito es igual al de sumar todo junto, sólo cambia la detección de maestros. Los componentes del camino de vida también conservan maestros (mes 11, día 22, año 2009 → 11).
4. **Año personal = año calendario** de `onDate` (no de cumpleaños a cumpleaños), sin maestros, igual que el mes y el día personales.
5. **`zodiac.ts` se envuelve, no se toca**: el envoltorio le pasa una fecha local a mediodía con el día UTC, así el resultado no depende de la zona horaria.
6. **Luna**: `getMoonPhase` evalúa el día UTC a las 12:00 UTC para que todo el día tenga una sola fase; `getNext*` trabajan sobre el instante. Es la luna media del plan (error típico de hasta ~14 h), suficiente para nombrar la fase de un día.
7. **Chino fuera de 1924–2043**: frontera el 4 de febrero (Lichun). Afecta sólo a nacidos antes del 5 feb 1924.
8. **Puntajes chinos** (el plan no los fijaba): trino 5, amigo secreto 5, mismo animal 4, neutral 3, choque 2 (no 1: el tono es de espejo, y el resumen habla de acuerdos y paciencia, no de incompatibilidad).
9. **Cartas de la numerología**: 1–9 y 11 → el arcano de su número; 22 → El Loco (0), como en Greer; 33 → Los Enamorados (6, porque 3 + 3).
10. **`describeBlueprintForAI` no incluye el nombre** (privacidad y espacio); si la síntesis lo necesita, el Lote B lo pasa aparte. `birthDate` del blueprint va como `"YYYY-MM-DD"`.
11. **Patronos**: los de los días siguen la lista más citada (Ácatl y Técpatl con Tezcatlipoca, Quiáhuitl con Chantico); los de las trecenas, el Códice Borbónico. Las fuentes varían entre códices; lo dejo dicho por si alguien de la tradición quiere revisarlo. Rumbos: Oriente, Norte, Poniente, Sur en ciclo desde Cipactli.
12. **Exports extra** además del contrato (listas `WESTERN_SIGNS`, `DAY_SIGNS`, `TRECENAS`, `MOON_PHASES`, `CHINESE_ANIMAL_INFO`, `getWesternSignByKey`, `normalizeName`, `todayUtc`, `BLUEPRINT_DESCRIPTION_MAX`…) para que las páginas de B y C no tengan que reconstruirlas.
13. Glifos del tonalpohualli con emoji neutros (Técpatl 🪨 en lugar de un cuchillo; Cozcacuauhtli 🪶 porque no hay emoji de zopilote).

### PENDIENTES (decisión del dueño del producto)

- Que Memo decida si quiere que alguien de la tradición (danza o contadores del tiempo) revise los textos del tonalpohualli antes de publicarlo; están escritos con respeto y como tradición viva, pero son resúmenes.
- Puntajes de compatibilidad china (decisión 8) y que el choque se muestre como 2/5: es contenido visible en la Lectura de dos (Lote F).

### Comandos corridos al final y su resultado (jest / tsc / lint / build)

Corridos en el worktree sobre `9b50313` (la máquina estaba muy cargada; los tiempos no son representativos).

- `npm ci` → 1004 paquetes, salida 0 (no se instaló nada más).
- `npx jest src/__tests__/lib/systems` → **8 suites, 198 tests, todos verdes** (western, chinese-zodiac, tonalpohualli, numerology, birth-cards, moon, index, content), salida 0.
- `npx tsc --noEmit` → **0 errores en `src/lib/systems/**` y `src/__tests__/lib/systems/**`**. Sale con 2 por los **8 errores de línea base, todos en `src/__tests__/lib/streak.test.ts`** (§0 del plan; los resuelve el Lote 0 con F-01/F-02).
- `npm run lint` → no corrido: hoy no hay config de ESLint y `next lint` abre un prompt (§0; lo arregla el Lote 0 con F-03).
- `npm run build` → no aplica en Fase 1 (regla 13: sólo Fase 2); la librería no tiene UI ni rutas.

Commits de la rama `capataz/lote-A` (sobre `dda10e2`):

| Ficha | Commit | Mensaje |
|---|---|---|
| F-20 | `ca16382` | feat(systems): add shared types and western zodiac wrapper (F-20) |
| F-21 | `e858eaa` | feat(systems): add chinese zodiac with lunar new year table (F-21) |
| F-22 | `65877d1` | feat(systems): add mexica tonalpohualli with caso correlation (F-22) |
| F-23 | `2cc1443` | feat(systems): add pythagorean numerology (F-23) |
| F-24 | `38f0547` | feat(systems): add tarot birth cards after mary k. greer (F-24) |
| F-25 | `0e3bb44` | feat(systems): add mean moon phases and next full/new moon (F-25) |
| F-26 | `bbb5de4` | feat(systems): add arcana blueprint and day energies entry point (F-26) |
| F-27 | `9b50313` | test(systems): check bilingual content integrity across modules (F-27) |
| — | (este) | docs(systems): add lote A report |

`git diff --stat dda10e2..9b50313`: 17 archivos nuevos, 3352 líneas, todos bajo `src/lib/systems/` y `src/__tests__/lib/systems/`.
