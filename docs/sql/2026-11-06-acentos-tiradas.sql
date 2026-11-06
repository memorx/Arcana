-- =====================================================================================================
-- Acentos en los textos en español de las tiradas temáticas (tabla spread_types)
-- 6 nov 2026 · lote F4-B del rediseño «Dos tintas» · decisión para Memo n.º 2 del dictamen de Fable
--
-- *** NO SE HA APLICADO EN PRODUCCIÓN. Lo decide y lo corre Memo. ***
--
-- Qué arregla: prisma/seed-themed-spreads.ts (tal como está en main) sembró «Tu Corazon», «La Conexion»,
-- «Desafios», «Posicion Actual», «Accion a Tomar», «El Ano que Viene», «Obten guia…», «romantica» y
-- «energias». Se ven en /reading/new, /reading/manual y el dashboard. El seed ya va corregido; esto deja
-- la base igual que el seed nuevo.
--
-- Cómo está hecho:
-- - Cada UPDATE cambia un valor viejo EXACTO por el nuevo y su WHERE pide la tirada (por su `name`
--   en inglés, único) y ese valor viejo. Si producción tiene otro texto (por ejemplo, el de
--   prisma/add-themed-spreads.ts, que ya llevaba acentos) no toca nada.
-- - Idempotente: correrlo dos veces no cambia nada la segunda (el valor viejo ya no está).
-- - `positions` es jsonb (un arreglo de {position, name, nameEs, description}): sólo se reescribe el
--   `nameEs` de las posiciones cuyo valor viejo está en el mapa; el orden y lo demás quedan igual.
-- - Sólo acentos. Las mayúsculas de las posiciones («Posición Actual», «Factores Ocultos») no se tocan.
-- - Las lecturas guardadas no copian estos textos (reading.cards sólo guarda position/cardId/isReversed),
--   así que no hay nada más que actualizar.
--
-- Cómo correrlo (con la URL de producción en una variable, nunca escrita aquí):
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f docs/sql/2026-11-06-acentos-tiradas.sql
-- Cada UPDATE imprime cuántas filas cambió (0 = ya estaba bien o tiene otro texto).
-- Probado contra la base local arcana_e2e_l2 sembrada con el seed viejo: deja los mismos valores
-- que el seed nuevo y la segunda corrida da UPDATE 0 en todo (ver docs/partes/rediseno-F4-B.md).
-- =====================================================================================================

BEGIN;

-- Nombres -------------------------------------------------------------------------------------------
UPDATE spread_types SET "nameEs" = 'El Año que Viene'
 WHERE name = 'Year Ahead' AND "nameEs" = 'El Ano que Viene';

-- Descripciones -------------------------------------------------------------------------------------
UPDATE spread_types SET "descriptionEs" = 'Explora tu vida romántica y relaciones con esta tirada de 5 cartas'
 WHERE name = 'Love Reading'
   AND "descriptionEs" = 'Explora tu vida romantica y relaciones con esta tirada de 5 cartas';

UPDATE spread_types SET "descriptionEs" = 'Obtén guía para tu camino profesional con perspectivas sobre tu posición actual y potencial'
 WHERE name = 'Career Spread'
   AND "descriptionEs" = 'Obten guia para tu camino profesional con perspectivas sobre tu posicion actual y potencial';

UPDATE spread_types SET "descriptionEs" = 'Una tirada completa de 12 cartas revelando temas y energías para cada mes'
 WHERE name = 'Year Ahead'
   AND "descriptionEs" = 'Una tirada completa de 12 cartas revelando temas y energias para cada mes';

-- Posiciones (positions[].nameEs) ------------------------------------------------------------------
WITH mapa (tirada, viejo, nuevo) AS (
  VALUES
    ('Love Reading',  'Tu Corazon',      'Tu Corazón'),
    ('Love Reading',  'La Conexion',     'La Conexión'),
    ('Love Reading',  'Desafios',        'Desafíos'),
    ('Career Spread', 'Posicion Actual', 'Posición Actual'),
    ('Career Spread', 'Accion a Tomar',  'Acción a Tomar')
)
UPDATE spread_types s
   SET positions = (
         SELECT jsonb_agg(
                  CASE WHEN m.nuevo IS NULL THEN e.p ELSE jsonb_set(e.p, '{nameEs}', to_jsonb(m.nuevo)) END
                  ORDER BY e.orden)
           FROM jsonb_array_elements(s.positions) WITH ORDINALITY AS e (p, orden)
           LEFT JOIN mapa m ON m.tirada = s.name AND m.viejo = e.p ->> 'nameEs'
       )
 WHERE jsonb_typeof(s.positions) = 'array'
   AND EXISTS (
         SELECT 1
           FROM jsonb_array_elements(s.positions) AS e (p)
           JOIN mapa m ON m.tirada = s.name AND m.viejo = e.p ->> 'nameEs'
       );

COMMIT;
