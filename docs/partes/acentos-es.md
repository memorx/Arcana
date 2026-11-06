# Acentos, eñes y signos de apertura en `messages/es.json`

I1b · 6 nov 2026 · rama `rediseno/dos-tintas`. Decisión de Memo (vía Opus): es ortografía, no cambio de texto.

- **259 valores cambiados** de 1,019. Llaves, sentido, inglés y textos ya correctos: intactos.
  Placeholders `{…}`, sintaxis ICU (`plural`/`select`, selectores `one`/`other`/`=0`) y etiquetas `<hl>`: intactos
  (cada valor cambiado se volvió a parsear con `intl-messageformat` y conserva exactamente los mismos argumentos y
  selectores; `check-messages: ok (1019 keys)`).
- Script: `acentos.py` (en el scratchpad de la sesión; no se versiona). Tres pasos:
  1. **Palabras que en todo el archivo sólo pueden ir con acento o ñ** (revisadas una por una sobre la lista de las
     991 palabras sin acento del archivo): `contraseña`, `sesión`, `créditos`, `día`, `colección`, `desafío`,
     `oráculo`, `configuración`, `menú`, `más`, `aún`, `así`, `también`, `después`, `según`, `será`, `información`,
     `intención`, `interpretación`, `posición`, `pública`, `práctica`, `específica`, `continúa`, `ayudó`, `María`, etc.
     (`mas`, `aun`, `publica`, `practica`, `especifica`, `continua`, `ayudo` se revisaron en cada aparición antes de
     meterlas aquí: todas eran «más», «aún» = todavía, adjetivo, sustantivo o pasado).
  2. **Palabras que dependen del contexto**, sólo en las llaves revisadas a mano:
     «está» (4: `auth.errors.emailExists`, `legal.terms.service.content`, `subscribe.success.subtitle`,
     `streakReward.keepGoing`), «estás» (3), «cómo» interrogativo directo o indirecto (7), «tú» pronombre (2:
     «solo tú puedes»), «qué» interrogativo (8).
  3. **¿ y ¡**: cada «?» o «!» sin su signo de apertura en la misma oración lo recibe al inicio de esa oración
     (`¿Olvidaste tu contraseña?`, `Aún no hay artículos publicados. ¡Vuelve pronto!`, `¡{count} días de racha!`).

**Se dejaron como estaban, a propósito** (no son errores): «solo» (la RAE ya no pide tilde; el archivo usa las dos
formas), «Cuanto más clara…» (correlativo, sin tilde), «donde» y «quien» relativos, «como» comparativo («actúan como
espejos», «márcala como invertida»), «Formula tu pregunta» (verbo), «Factor oculto», «si» condicional, «mi» posesivo,
«el» artículo, «Que este año te traiga…» (desiderativo, sin tilde), «Re Pág / Av Pág» (teclas), «Diciembre 2024»
(mayúscula de mes: estilo, no acento). En inglés y en los nombres de argumento (`{dia}`, `{posicion}`,
`{diaSemana}`) no se tocó nada.

**Pruebas**: las specs e2e que buscaban el texto sin acento aceptan ahora ambas formas (`/iniciar sesi[oó]n/`,
`/credenciales inv[aá]lidas/`, `/t[eé]rminos/`, `/c[oó]mo funciona/`, `/cr[eé]ditos/`, …) para no chocar con los lotes.

## Lista completa (antes → después)

| Llave | Antes | Después |
|---|---|---|
| `common.error` | Algo salio mal | Algo salió mal |
| `nav.credits` | Creditos | Créditos |
| `nav.login` | Iniciar sesion | Iniciar sesión |
| `nav.logout` | Cerrar sesion | Cerrar sesión |
| `nav.dailyCard` | Carta del Dia | Carta del Día |
| `nav.collection` | Coleccion | Colección |
| `nav.subscribe` | Oraculo Diario | Oráculo Diario |
| `nav.settings` | Configuracion | Configuración |
| `nav.challenges` | Desafios | Desafíos |
| `nav.closeMenu` | Cerrar menu | Cerrar menú |
| `nav.openMenu` | Abrir menu de usuario | Abrir menú de usuario |
| `landing.dailyCard.title` | Tu Carta del Dia | Tu Carta del Día |
| `landing.dailyCard.cta` | Registrate para una lectura completa | Regístrate para una lectura completa |
| `landing.testimonials.t1.name` | Maria G. | María G. |
| `landing.testimonials.t1.text` | Las lecturas son sorprendentemente precisas. Me ayudo a tomar una decision importante. | Las lecturas son sorprendentemente precisas. Me ayudó a tomar una decisión importante. |
| `landing.testimonials.t2.text` | Uso Arcana todas las mananas. Mi carta del dia me da perspectiva para el dia. | Uso Arcana todas las mañanas. Mi carta del día me da perspectiva para el día. |
| `landing.testimonials.t3.text` | Esceptica al principio, pero las interpretaciones son muy profundas y personalizadas. | Escéptica al principio, pero las interpretaciones son muy profundas y personalizadas. |
| `landing.hero.trustBadge` | 3 lecturas gratuitas al registrarte - Sin tarjeta de credito | 3 lecturas gratuitas al registrarte - Sin tarjeta de crédito |
| `landing.howItWorks.title` | Como funciona? | ¿Cómo funciona? |
| `landing.howItWorks.step1.description` | Selecciona entre 4 tipos de tiradas segun la profundidad que busques. | Selecciona entre 4 tipos de tiradas según la profundidad que busques. |
| `landing.howItWorks.step2.title` | Enfoca tu intencion | Enfoca tu intención |
| `landing.howItWorks.step2.description` | Formula tu pregunta o situacion con claridad y concentracion. | Formula tu pregunta o situación con claridad y concentración. |
| `landing.howItWorks.step4.title` | Recibe tu guia | Recibe tu guía |
| `landing.howItWorks.step4.description` | Obten una interpretacion profunda que conecta las cartas con tu pregunta. | Obtén una interpretación profunda que conecta las cartas con tu pregunta. |
| `landing.features.title` | Por que elegir Arcana | Por qué elegir Arcana |
| `landing.features.cards.description` | Mazo tradicional Rider-Waite con interpretaciones profundas en espanol. | Mazo tradicional Rider-Waite con interpretaciones profundas en español. |
| `landing.features.spreads.title` | Multiples Tiradas | Múltiples Tiradas |
| `landing.features.spreads.description` | Desde la clasica de 3 cartas hasta la poderosa Cruz Celta de 10. | Desde la clásica de 3 cartas hasta la poderosa Cruz Celta de 10. |
| `landing.spreadsSection.subtitle` | Desde consultas rapidas hasta analisis profundos, tenemos la tirada perfecta para cada pregunta. | Desde consultas rápidas hasta análisis profundos, tenemos la tirada perfecta para cada pregunta. |
| `landing.faq.q1` | Que es una lectura de tarot? | ¿Qué es una lectura de tarot? |
| `landing.faq.a1` | Una lectura de tarot es una practica ancestral de autoconocimiento donde las cartas actuan como espejos de tu situacion actual, ayudandote a reflexionar sobre tus circunstancias, emociones y posibles caminos a seguir. No predice el futuro de forma determinista, sino que ofrece perspectivas y guia. | Una lectura de tarot es una práctica ancestral de autoconocimiento donde las cartas actúan como espejos de tu situación actual, ayudándote a reflexionar sobre tus circunstancias, emociones y posibles caminos a seguir. No predice el futuro de forma determinista, sino que ofrece perspectivas y guía. |
| `landing.faq.q2` | Como funciona la interpretacion con IA? | ¿Cómo funciona la interpretación con IA? |
| `landing.faq.a2` | Nuestra IA ha sido entrenada con conocimiento profundo del simbolismo del tarot tradicional. Analiza la combinacion especifica de cartas que aparecen en tu lectura, sus posiciones y orientaciones, para ofrecerte una interpretacion coherente y personalizada que conecta con tu pregunta original. | Nuestra IA ha sido entrenada con conocimiento profundo del simbolismo del tarot tradicional. Analiza la combinación específica de cartas que aparecen en tu lectura, sus posiciones y orientaciones, para ofrecerte una interpretación coherente y personalizada que conecta con tu pregunta original. |
| `landing.faq.q3` | Mis lecturas son privadas? | ¿Mis lecturas son privadas? |
| `landing.faq.a3` | Absolutamente. Tus lecturas son completamente privadas y solo tu puedes acceder a ellas. No compartimos tu informacion con terceros y puedes eliminar tu historial en cualquier momento. Tu viaje espiritual es solo tuyo. | Absolutamente. Tus lecturas son completamente privadas y solo tú puedes acceder a ellas. No compartimos tu información con terceros y puedes eliminar tu historial en cualquier momento. Tu viaje espiritual es solo tuyo. |
| `landing.cta.subtitle` | Registrate ahora y recibe 3 lecturas gratuitas. Descubre lo que las cartas tienen preparado para ti. | Regístrate ahora y recibe 3 lecturas gratuitas. Descubre lo que las cartas tienen preparado para ti. |
| `landing.cta.titleAuthenticated` | Listo para tu proxima lectura? | ¿Listo para tu próxima lectura? |
| `landing.dailyOracle.title` | Tu Carta del Dia, Cada Manana | Tu Carta del Día, Cada Mañana |
| `landing.dailyOracle.description` | Comienza cada dia con guia cosmica. Recibe una carta de tarot personalizada en tu correo, interpretada especificamente para tu signo zodiacal y enfoque de vida. | Comienza cada día con guía cósmica. Recibe una carta de tarot personalizada en tu correo, interpretada específicamente para tu signo zodiacal y enfoque de vida. |
| `landing.dailyOracle.cta` | Comenzar Oraculo Diario | Comenzar Oráculo Diario |
| `landing.dailyOracle.emailPreview` | Tu carta del dia te espera... | Tu carta del día te espera... |
| `auth.email` | Correo electronico | Correo electrónico |
| `auth.password` | Contrasena | Contraseña |
| `auth.confirmPassword` | Confirmar contrasena | Confirmar contraseña |
| `auth.noAccount` | No tienes cuenta? | ¿No tienes cuenta? |
| `auth.hasAccount` | Ya tienes cuenta? | ¿Ya tienes cuenta? |
| `auth.loginButton` | Iniciar Sesion | Iniciar Sesión |
| `auth.termsLink` | terminos de servicio | términos de servicio |
| `auth.privacyLink` | politica de privacidad | política de privacidad |
| `auth.forgotPassword` | Olvidaste tu contrasena? | ¿Olvidaste tu contraseña? |
| `auth.forgotPasswordTitle` | Recupera tu contrasena | Recupera tu contraseña |
| `auth.forgotPasswordSubtitle` | Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena | Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña |
| `auth.resetLinkSentSubtitle` | Si existe una cuenta con ese email, hemos enviado un enlace para restablecer tu contrasena. | Si existe una cuenta con ese email, hemos enviado un enlace para restablecer tu contraseña. |
| `auth.resetPasswordTitle` | Crea una nueva contrasena | Crea una nueva contraseña |
| `auth.resetPasswordSubtitle` | Ingresa tu nueva contrasena a continuacion | Ingresa tu nueva contraseña a continuación |
| `auth.newPassword` | Nueva contrasena | Nueva contraseña |
| `auth.confirmNewPassword` | Confirmar nueva contrasena | Confirmar nueva contraseña |
| `auth.resetPassword` | Restablecer contrasena | Restablecer contraseña |
| `auth.passwordResetSuccess` | Contrasena restablecida | Contraseña restablecida |
| `auth.passwordResetSuccessSubtitle` | Ya puedes iniciar sesion con tu nueva contrasena | Ya puedes iniciar sesión con tu nueva contraseña |
| `auth.errors.invalidCredentials` | Credenciales invalidas | Credenciales inválidas |
| `auth.errors.emailExists` | Este email ya esta registrado | Este email ya está registrado |
| `auth.errors.weakPassword` | La contrasena debe tener al menos 6 caracteres | La contraseña debe tener al menos 6 caracteres |
| `auth.errors.passwordMismatch` | Las contrasenas no coinciden | Las contraseñas no coinciden |
| `auth.errors.invalidEmail` | Email invalido | Email inválido |
| `auth.errors.loginAfterRegister` | Cuenta creada pero hubo un error al iniciar sesion | Cuenta creada pero hubo un error al iniciar sesión |
| `dashboard.streak.days` | dias seguidos | días seguidos |
| `dashboard.streak.best` | Mejor: {count} dias | Mejor: {count} días |
| `dashboard.credits` | {count} creditos | {count} créditos |
| `dashboard.credit` | credito | crédito |
| `dashboard.creditPlural` | creditos | créditos |
| `dashboard.creditsLabel` | Creditos | Créditos |
| `dashboard.noCredits` | Sin creditos | Sin créditos |
| `dashboard.buyCredits` | Comprar creditos | Comprar créditos |
| `dashboard.noReadings` | Aun no has realizado ninguna lectura | Aún no has realizado ninguna lectura |
| `dashboard.dailyOracleTitle` | Oraculo Diario | Oráculo Diario |
| `dashboard.dailyOracleDesc` | Recibe una carta personalizada en tu correo cada manana | Recibe una carta personalizada en tu correo cada mañana |
| `dashboard.referralTitle` | Invita amigos, gana creditos | Invita amigos, gana créditos |
| `dashboard.referralDesc` | Obten 2 creditos por cada amigo que se registre | Obtén 2 créditos por cada amigo que se registre |
| `reading.spreadCategories.classic` | Tiradas Clasicas | Tiradas Clásicas |
| `reading.spreadCategories.themed` | Tiradas Tematicas | Tiradas Temáticas |
| `reading.notes.placeholder` | Que significo esta lectura para ti? Que decisiones tomaste? | ¿Qué significó esta lectura para ti? ¿Qué decisiones tomaste? |
| `reading.notes.hint` | Tus notas se guardan automaticamente mientras escribes | Tus notas se guardan automáticamente mientras escribes |
| `reading.cost` | {count} credito | {count} crédito |
| `reading.costPlural` | {count} creditos | {count} créditos |
| `reading.freeWithReading` | Usaras 1 lectura gratis | Usarás 1 lectura gratis |
| `reading.creditsAvailableLabel` | creditos disponibles | créditos disponibles |
| `reading.creditsAvailable` | {count} creditos disponibles | {count} créditos disponibles |
| `reading.intentionTitle` | Tu Intencion | Tu Intención |
| `reading.intentionSubtitle` | Formula tu pregunta o describe la situacion sobre la que deseas recibir guia. Cuanto mas clara sea tu intencion, mas precisa sera la lectura. | Formula tu pregunta o describe la situación sobre la que deseas recibir guía. Cuanto más clara sea tu intención, más precisa será la lectura. |
| `reading.intentionPlaceholder` | Ej: Que necesito saber sobre mi situacion laboral actual? / Busco claridad sobre mi relacion... | Ej: ¿Qué necesito saber sobre mi situación laboral actual? / Busco claridad sobre mi relación... |
| `reading.intentionHint` | {count} / 10 caracteres minimo | {count} / 10 caracteres mínimo |
| `reading.intentionTooShort` | Tu intencion debe tener al menos 10 caracteres | Tu intención debe tener al menos 10 caracteres |
| `reading.shufflingSubtitle` | Concentrandote en tu intencion mientras las cartas se mezclan | Concentrándote en tu intención mientras las cartas se mezclan |
| `reading.revealingSubtitle` | Observa como cada carta toma su lugar... | Observa cómo cada carta toma su lugar... |
| `reading.allCardsRevealed` | Todas las cartas reveladas! | ¡Todas las cartas reveladas! |
| `reading.viewInterpretation` | Ver Interpretacion | Ver Interpretación |
| `reading.yourIntention` | Tu Intencion | Tu Intención |
| `reading.interpretation` | Interpretacion | Interpretación |
| `reading.position` | Posicion {number} | Posición {number} |
| `reading.more` | +{count} mas | +{count} más |
| `reading.needCredits` | Creditos insuficientes | Créditos insuficientes |
| `reading.needCreditsMessage` | Necesitas {cost} creditos para esta lectura. | Necesitas {cost} créditos para esta lectura. |
| `reading.currentCredits` | Actualmente tienes {credits} creditos | Actualmente tienes {credits} créditos |
| `reading.needMoreCredits` | Necesitas {count} creditos mas | Necesitas {count} créditos más |
| `reading.buyCreditsQuestion` | Necesitas mas creditos para hacer lecturas avanzadas? | ¿Necesitas más créditos para hacer lecturas avanzadas? |
| `reading.buyCreditsLink` | Comprar creditos | Comprar créditos |
| `reading.buyCredits` | Comprar Creditos | Comprar Créditos |
| `reading.shareDescription` | Haz publica esta lectura para que otros puedan verla | Haz pública esta lectura para que otros puedan verla |
| `reading.makePublic` | Hacer Publica | Hacer Pública |
| `reading.linkCopied` | Enlace copiado! | ¡Enlace copiado! |
| `reading.publicReading` | Lectura publica | Lectura pública |
| `reading.anonymous` | Anonimo | Anónimo |
| `credits.title` | Comprar Creditos | Comprar Créditos |
| `credits.subtitle` | Los creditos te permiten realizar lecturas de tarot. Cada tipo de tirada tiene un costo diferente segun su profundidad. | Los créditos te permiten realizar lecturas de tarot. Cada tipo de tirada tiene un costo diferente según su profundidad. |
| `credits.popular` | Mas popular | Más popular |
| `credits.creditsUnit` | creditos | créditos |
| `credits.success.subtitle` | Gracias por tu compra. Tus creditos ya estan disponibles. | Gracias por tu compra. Tus créditos ya están disponibles. |
| `credits.success.creditsAdded` | Creditos agregados | Créditos agregados |
| `credits.success.viewCredits` | Ver mis creditos | Ver mis créditos |
| `credits.error.sessionNotFound` | No se encontro la sesion de pago | No se encontró la sesión de pago |
| `credits.error.sessionError` | Error al obtener sesion | Error al obtener sesión |
| `history.empty` | No tienes lecturas aun | No tienes lecturas aún |
| `history.emptyTitle` | No tienes lecturas aun | No tienes lecturas aún |
| `spreads.simpleCross.description` | Vision multidimensional | Visión multidimensional |
| `spreads.celticCross.description` | Analisis profundo | Análisis profundo |
| `footer.dailyOracle` | Oraculo Diario | Oráculo Diario |
| `footer.legal.terms` | Terminos | Términos |
| `legal.about.intro` | Arcana es una plataforma moderna de lecturas de tarot que combina la sabiduria ancestral con inteligencia artificial para ofrecer guia espiritual personalizada. | Arcana es una plataforma moderna de lecturas de tarot que combina la sabiduría ancestral con inteligencia artificial para ofrecer guía espiritual personalizada. |
| `legal.about.mission.title` | Nuestra Mision | Nuestra Misión |
| `legal.about.mission.content` | Creemos que el tarot es una herramienta poderosa para la reflexion personal y el crecimiento. Nuestra mision es hacer esta practica ancestral accesible para todos, proporcionando interpretaciones profundas que resuenen con tu situacion unica. | Creemos que el tarot es una herramienta poderosa para la reflexión personal y el crecimiento. Nuestra misión es hacer esta práctica ancestral accesible para todos, proporcionando interpretaciones profundas que resuenen con tu situación única. |
| `legal.about.how.title` | Como Funciona | Cómo Funciona |
| `legal.about.how.content` | Nuestra plataforma utiliza IA avanzada para analizar las cartas de tu lectura y proporcionar interpretaciones que conecten con tu pregunta o intencion especifica. Cada lectura es unica y personalizada para tu situacion. | Nuestra plataforma utiliza IA avanzada para analizar las cartas de tu lectura y proporcionar interpretaciones que conecten con tu pregunta o intención específica. Cada lectura es única y personalizada para tu situación. |
| `legal.about.disclaimer.content` | Las lecturas de tarot estan destinadas unicamente a fines de entretenimiento y reflexion personal. No deben utilizarse como sustituto de asesoramiento profesional en asuntos legales, financieros, medicos o psicologicos. | Las lecturas de tarot están destinadas únicamente a fines de entretenimiento y reflexión personal. No deben utilizarse como sustituto de asesoramiento profesional en asuntos legales, financieros, médicos o psicológicos. |
| `legal.terms.title` | Terminos de Servicio | Términos de Servicio |
| `legal.terms.lastUpdated` | Ultima actualizacion: Diciembre 2024 | Última actualización: Diciembre 2024 |
| `legal.terms.acceptance.title` | Aceptacion de Terminos | Aceptación de Términos |
| `legal.terms.acceptance.content` | Al acceder y utilizar Arcana, aceptas estar sujeto a estos Terminos de Servicio. Si no estas de acuerdo con estos terminos, por favor no utilices nuestro servicio. | Al acceder y utilizar Arcana, aceptas estar sujeto a estos Términos de Servicio. Si no estás de acuerdo con estos términos, por favor no utilices nuestro servicio. |
| `legal.terms.service.title` | Descripcion del Servicio | Descripción del Servicio |
| `legal.terms.service.content` | Arcana ofrece lecturas de tarot impulsadas por inteligencia artificial con fines de entretenimiento y reflexion personal. Nuestro servicio no esta destinado a proporcionar asesoramiento profesional de ningun tipo. | Arcana ofrece lecturas de tarot impulsadas por inteligencia artificial con fines de entretenimiento y reflexión personal. Nuestro servicio no está destinado a proporcionar asesoramiento profesional de ningún tipo. |
| `legal.terms.credits.title` | Creditos y Pagos | Créditos y Pagos |
| `legal.terms.credits.content` | Los creditos comprados en nuestra plataforma no son reembolsables. Los creditos no expiran pero pueden estar sujetos a actualizaciones de terminos. Las lecturas gratuitas se proporcionan como oferta promocional y pueden modificarse o discontinuarse en cualquier momento. | Los créditos comprados en nuestra plataforma no son reembolsables. Los créditos no expiran pero pueden estar sujetos a actualizaciones de términos. Las lecturas gratuitas se proporcionan como oferta promocional y pueden modificarse o discontinuarse en cualquier momento. |
| `legal.terms.changes.title` | Cambios en los Terminos | Cambios en los Términos |
| `legal.terms.changes.content` | Nos reservamos el derecho de modificar estos terminos en cualquier momento. El uso continuado del servicio despues de los cambios constituye la aceptacion de los nuevos terminos. | Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del servicio después de los cambios constituye la aceptación de los nuevos términos. |
| `legal.privacy.title` | Politica de Privacidad | Política de Privacidad |
| `legal.privacy.lastUpdated` | Ultima actualizacion: Diciembre 2024 | Última actualización: Diciembre 2024 |
| `legal.privacy.intro` | Tu privacidad es importante para nosotros. Esta politica explica como recopilamos, usamos y protegemos tu informacion. | Tu privacidad es importante para nosotros. Esta política explica cómo recopilamos, usamos y protegemos tu información. |
| `legal.privacy.collection.title` | Informacion que Recopilamos | Información que Recopilamos |
| `legal.privacy.collection.content` | Recopilamos la informacion que nos proporcionas directamente, incluyendo tu direccion de correo electronico, nombre (opcional) y las lecturas que realizas. Tambien recopilamos datos de uso para mejorar nuestro servicio. | Recopilamos la información que nos proporcionas directamente, incluyendo tu dirección de correo electrónico, nombre (opcional) y las lecturas que realizas. También recopilamos datos de uso para mejorar nuestro servicio. |
| `legal.privacy.use.title` | Como Usamos tu Informacion | Cómo Usamos tu Información |
| `legal.privacy.use.content` | Utilizamos tu informacion para proporcionar y mejorar nuestro servicio, procesar transacciones, enviarte actualizaciones (si lo deseas) y responder a tus consultas. | Utilizamos tu información para proporcionar y mejorar nuestro servicio, procesar transacciones, enviarte actualizaciones (si lo deseas) y responder a tus consultas. |
| `legal.privacy.storage.content` | Tus lecturas se almacenan de forma segura y solo tu puedes acceder a ellas. Utilizamos medidas de seguridad estandar de la industria para proteger tus datos. | Tus lecturas se almacenan de forma segura y solo tú puedes acceder a ellas. Utilizamos medidas de seguridad estándar de la industria para proteger tus datos. |
| `legal.privacy.sharing.title` | Compartir Informacion | Compartir Información |
| `legal.privacy.sharing.content` | No vendemos ni compartimos tu informacion personal con terceros, excepto cuando sea necesario para proporcionar nuestro servicio (por ejemplo, procesamiento de pagos) o segun lo requiera la ley. | No vendemos ni compartimos tu información personal con terceros, excepto cuando sea necesario para proporcionar nuestro servicio (por ejemplo, procesamiento de pagos) o según lo requiera la ley. |
| `legal.privacy.cookies.content` | Utilizamos cookies para mantener tu sesion y recordar tus preferencias. Puedes desactivar las cookies en la configuracion de tu navegador, pero esto puede afectar la funcionalidad de nuestro servicio. | Utilizamos cookies para mantener tu sesión y recordar tus preferencias. Puedes desactivar las cookies en la configuración de tu navegador, pero esto puede afectar la funcionalidad de nuestro servicio. |
| `legal.privacy.rights.content` | Tienes derecho a acceder, corregir o eliminar tu informacion personal. Tambien puedes eliminar tu historial de lecturas en cualquier momento desde la configuracion de tu cuenta. | Tienes derecho a acceder, corregir o eliminar tu información personal. También puedes eliminar tu historial de lecturas en cualquier momento desde la configuración de tu cuenta. |
| `legal.privacy.contact.title` | Contactanos | Contáctanos |
| `legal.privacy.contact.content` | Si tienes alguna pregunta sobre esta Politica de Privacidad, por favor contactanos. | Si tienes alguna pregunta sobre esta Política de Privacidad, por favor contáctanos. |
| `cards.cta.title` | Listo para una lectura? | ¿Listo para una lectura? |
| `cardDetail.cta.title` | Que significa {card} para ti? | ¿Qué significa {card} para ti? |
| `cardDetail.cta.subtitle` | Obtén una lectura personalizada que conecte esta carta con tu situacion unica | Obtén una lectura personalizada que conecte esta carta con tu situación única |
| `subscribe.title` | Oraculo Diario | Oráculo Diario |
| `subscribe.subtitle` | Tu carta del dia, cada manana en tu inbox | Tu carta del día, cada mañana en tu inbox |
| `subscribe.description` | Recibe una carta de tarot personalizada cada dia, interpretada especificamente para tu signo zodiacal y area de enfoque. | Recibe una carta de tarot personalizada cada día, interpretada específicamente para tu signo zodiacal y área de enfoque. |
| `subscribe.features.focusArea` | Alineada con tu area de vida | Alineada con tu área de vida |
| `subscribe.cta` | Comenzar mi Oraculo | Comenzar mi Oráculo |
| `subscribe.alreadySubscribed` | Ya estas suscrito! | ¡Ya estás suscrito! |
| `subscribe.manageSubscription` | Gestionar Suscripcion | Gestionar Suscripción |
| `subscribe.cancelSubscription` | Cancelar Suscripcion | Cancelar Suscripción |
| `subscribe.success.title` | Bienvenido al Oraculo Diario! | ¡Bienvenido al Oráculo Diario! |
| `subscribe.success.subtitle` | Tu suscripcion ya esta activa | Tu suscripción ya está activa |
| `subscribe.success.nextSteps` | Recibiras tu primera carta diaria manana a tu hora preferida. | Recibirás tu primera carta diaria mañana a tu hora preferida. |
| `subscribe.orPayWithCredits` | o paga con creditos | o paga con créditos |
| `subscribe.payWithCredits` | Pagar con creditos | Pagar con créditos |
| `subscribe.creditsPerMonth` | creditos/mes | créditos/mes |
| `subscribe.subscribeWithCredits` | Suscribirse con Creditos | Suscribirse con Créditos |
| `subscribe.needMoreCredits` | Necesitas {count} creditos mas | Necesitas {count} créditos más |
| `subscribe.buyCredits` | Comprar creditos | Comprar créditos |
| `subscribe.paidWithCredits` | Pagado con creditos | Pagado con créditos |
| `subscribe.renewsAutomatically` | Se renueva automaticamente si tienes creditos suficientes | Se renueva automáticamente si tienes créditos suficientes |
| `subscribe.subscriptionError` | Error procesando suscripcion. Intenta de nuevo. | Error procesando suscripción. Intenta de nuevo. |
| `profile.subtitle` | Ayudanos a personalizar tus lecturas diarias | Ayúdanos a personalizar tus lecturas diarias |
| `profile.birthTimeTooltip` | Se usa para calcular tu ascendente y lecturas aun mas personalizadas | Se usa para calcular tu ascendente y lecturas aún más personalizadas |
| `profile.focusArea` | Area de Enfoque | Área de Enfoque |
| `profile.focusAreaDescription` | En que area de tu vida te gustaria recibir guia? | ¿En qué área de tu vida te gustaría recibir guía? |
| `profile.emailTimeDescription` | A que hora te gustaria recibir tu carta diaria? | ¿A qué hora te gustaría recibir tu carta diaria? |
| `profile.saved` | Perfil guardado! | ¡Perfil guardado! |
| `profile.focusAreas.general` | Guia General | Guía General |
| `daily.noCardYet` | Tu carta de hoy aun no ha sido sacada | Tu carta de hoy aún no ha sido sacada |
| `daily.cardWillArrive` | Llegara a las {time} a tu inbox | Llegará a las {time} a tu inbox |
| `daily.viewInterpretation` | Ver Interpretacion Completa | Ver Interpretación Completa |
| `daily.last7days` | Ultimos 7 dias | Últimos 7 días |
| `daily.noSubscription` | Suscribete al Oraculo Diario | Suscríbete al Oráculo Diario |
| `referral.title` | Invita Amigos, Gana Creditos | Invita Amigos, Gana Créditos |
| `referral.howItWorks` | Como funciona | Cómo funciona |
| `referral.step1` | Comparte tu enlace unico con amigos | Comparte tu enlace único con amigos |
| `referral.step3` | Ambos reciben 3 creditos gratis! | ¡Ambos reciben 3 créditos gratis! |
| `referral.copied` | Copiado! | ¡Copiado! |
| `referral.creditsEarned` | Creditos ganados | Créditos ganados |
| `referral.shareText` | Descubre lecturas de tarot con IA en Arcana! Registrate con mi enlace y ambos obtenemos 3 creditos gratis: {link} | ¡Descubre lecturas de tarot con IA en Arcana! Regístrate con mi enlace y ambos obtenemos 3 créditos gratis: {link} |
| `referral.twitterText` | He estado usando Arcana para lecturas de tarot y es increible! Registrate con mi enlace y ambos obtenemos creditos gratis | ¡He estado usando Arcana para lecturas de tarot y es increíble! Regístrate con mi enlace y ambos obtenemos créditos gratis |
| `referral.limit` | Maximo 10 referidos por usuario | Máximo 10 referidos por usuario |
| `referral.loginRequired` | Inicio de Sesion Requerido | Inicio de Sesión Requerido |
| `referral.loginRequiredDesc` | Por favor inicia sesion para acceder a tu enlace de referidos | Por favor inicia sesión para acceder a tu enlace de referidos |
| `pwa.installPrompt` | Agrega a tu pantalla de inicio para acceso rapido y funciones offline! | ¡Agrega a tu pantalla de inicio para acceso rápido y funciones offline! |
| `pwa.later` | Despues | Después |
| `blog.title` | Guias e Insights del Tarot | Guías e Insights del Tarot |
| `blog.subtitle` | Aprende sobre lectura del tarot, significados de cartas y guia espiritual | Aprende sobre lectura del tarot, significados de cartas y guía espiritual |
| `blog.article` | Articulo | Artículo |
| `blog.readMore` | Leer mas | Leer más |
| `blog.noPosts` | Aun no hay articulos publicados. Vuelve pronto! | Aún no hay artículos publicados. ¡Vuelve pronto! |
| `blog.ctaTitle` | Listo para tu Lectura? | ¿Listo para tu Lectura? |
| `blog.ctaDescription` | Pon tu conocimiento en practica con una lectura de tarot personalizada | Pon tu conocimiento en práctica con una lectura de tarot personalizada |
| `streakReward.title` | Recompensa de Racha! | ¡Recompensa de Racha! |
| `streakReward.days` | {count} dias de racha! | ¡{count} días de racha! |
| `streakReward.credits` | creditos | créditos |
| `streakReward.keepGoing` | Sigue asi! Tu dedicacion esta dando frutos. | ¡Sigue así! Tu dedicación está dando frutos. |
| `streakReward.continue` | Genial! | ¡Genial! |
| `streakReward.nextMilestone` | Proxima recompensa en {days} dias | Próxima recompensa en {days} días |
| `streakReward.allCompleted` | Todos los hitos completados! | ¡Todos los hitos completados! |
| `collection.title` | Tu Coleccion | Tu Colección |
| `collection.newCard` | Nueva carta descubierta! | ¡Nueva carta descubierta! |
| `collection.newCards` | Descubriste {count} cartas nuevas! | ¡Descubriste {count} cartas nuevas! |
| `collection.addedToCollection` | Agregada a tu coleccion! | ¡Agregada a tu colección! |
| `collection.cta.title` | Completa tu Coleccion | Completa tu Colección |
| `collection.cta.subtitle` | Haz mas lecturas para descubrir las 78 cartas | Haz más lecturas para descubrir las 78 cartas |
| `achievements.credits` | creditos | créditos |
| `achievements.latest` | Ultimo | Último |
| `achievements.allCompleted` | Todos los logros completados! | ¡Todos los logros completados! |
| `achievements.categories.collection` | Coleccion | Colección |
| `achievements.categories.subscription` | Suscripcion | Suscripción |
| `achievements.unlockModal.title` | Logro Desbloqueado! | ¡Logro Desbloqueado! |
| `achievements.unlockModal.earned` | Has ganado {credits} creditos | Has ganado {credits} créditos |
| `goldenCards.title` | CARTA DORADA! | ¡CARTA DORADA! |
| `goldenCards.titleMultiple` | {count} CARTAS DORADAS! | ¡{count} CARTAS DORADAS! |
| `goldenCards.subtitle` | Un tesoro raro ha aparecido! | ¡Un tesoro raro ha aparecido! |
| `goldenCards.creditsEarned` | Ganaste creditos gratis! | ¡Ganaste créditos gratis! |
| `goldenCards.credits` | creditos | créditos |
| `goldenCards.addedToCollection` | Agregada a tu coleccion dorada! | ¡Agregada a tu colección dorada! |
| `goldenCards.collectionTitle` | Coleccion Dorada | Colección Dorada |
| `levels.maxLevel` | Nivel maximo alcanzado! | ¡Nivel máximo alcanzado! |
| `levels.levelUp` | Subiste de Nivel! | ¡Subiste de Nivel! |
| `levels.newLevel` | Ahora eres {level}! | ¡Ahora eres {level}! |
| `levels.credits` | creditos | créditos |
| `levels.keepGoing` | Sigue asi! Tu viaje continua. | ¡Sigue así! Tu viaje continúa. |
| `levels.maxLevelMessage` | Has alcanzado la cima de la maestria! | ¡Has alcanzado la cima de la maestría! |
| `levels.names.oracle` | Oraculo | Oráculo |
| `challenges.title` | Desafios | Desafíos |
| `challenges.credits` | creditos | créditos |
| `challenges.noChallenges` | No hay desafios disponibles | No hay desafíos disponibles |
| `challenges.allCompleted` | Todos los desafios completados! | ¡Todos los desafíos completados! |
| `challenges.completedModal.title` | Desafio Completado! | ¡Desafío Completado! |
| `challenges.completedModal.earned` | Has ganado {credits} creditos de desafios | Has ganado {credits} créditos de desafíos |
| `settings.title` | Configuracion | Configuración |
| `settings.accountInfo` | Informacion de la Cuenta | Información de la Cuenta |
| `settings.email` | Correo electronico | Correo electrónico |
| `settings.deleteWarning` | Esto eliminara permanentemente tu cuenta y todos tus datos incluyendo lecturas, perfil y suscripcion. | Esto eliminará permanentemente tu cuenta y todos tus datos incluyendo lecturas, perfil y suscripción. |
| `settings.deleteConfirmTitle` | Estas seguro? | ¿Estás seguro? |
| `settings.notAuthenticated` | Debes iniciar sesion para acceder a la configuracion. | Debes iniciar sesión para acceder a la configuración. |
