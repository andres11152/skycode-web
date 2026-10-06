import type { BlogBlock } from "./blogShared";
import { contactEmail, siteName } from "@/lib/site";
import { GOOGLE_ADS_STORAGE_NOTE, STORAGE_INVENTORY, THIRD_PARTY_STORAGE_NOTE, storageKindLabel } from "./cookieInventory";

/**
 * Bloques propios de los documentos legales, además de los del blog:
 *  - `table`: tablas de datos (cookies, proveedores, plazos), con la tabla de
 *    cookies GENERADA desde `cookieInventory.ts` para que nunca se desfase.
 *  - `cookie-preferences`: botón que reabre el centro de preferencias.
 */
export type LegalBlock =
  | BlogBlock
  | { type: "table"; caption: string; columns: string[]; rows: string[][] }
  | { type: "cookie-preferences" };

export interface LegalChange {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  change: string;
}

export interface LegalDocument {
  slug: string;
  title: string;
  description: string;
  /** Fecha de la última modificación del texto. */
  updatedAt: string;
  /** Versión del documento (`major.minor`); sube con cada cambio de fondo. */
  version: string;
  /** Resumen en lenguaje llano; no sustituye al texto legal. */
  summary?: string[];
  /** Historial de cambios, del más reciente al más antiguo. */
  changelog: LegalChange[];
  content: LegalBlock[];
}

/**
 * Identificación del responsable del tratamiento. Es el único lugar donde se
 * redacta: la política de privacidad la cita. Si cambia la forma jurídica
 * (por ejemplo, al constituir una sociedad con su propio NIT), se edita acá.
 */
const CONTROLLER = `${siteName} es el nombre comercial con el que Andrés Felipe Betancourt Ortiz, persona natural inscrita en el Registro Único Tributario (RUT) de la DIAN, con domicilio en Bogotá D.C., Colombia, presta sus servicios de desarrollo de software`;

export const legalDocuments: LegalDocument[] = [
  {
    slug: "politica-privacidad",
    title: "Política de Privacidad",
    description:
      "Quién es el responsable de sus datos, para qué los usamos, con qué proveedores los compartimos, cuánto tiempo los conservamos y cómo ejercer sus derechos (Ley 1581 de 2012).",
    updatedAt: "2026-10-02",
    version: "2.0",
    summary: [
      "Usamos sus datos solo para responderle y, si llega a ser cliente, para prestar el servicio contratado.",
      "No vendemos sus datos ni los cedemos con fines publicitarios.",
      "No usamos analítica ni publicidad de terceros. Lo opcional (su país y de qué campaña llegó) solo se guarda si usted lo permite.",
      `Puede pedir acceso, corrección o supresión escribiendo a ${contactEmail}: respondemos consultas en 10 días hábiles y reclamos en 15.`,
      "Los pagos con tarjeta los procesa Bold: nosotros nunca vemos el número de su tarjeta.",
    ],
    changelog: [
      {
        date: "2026-10-02",
        change:
          "Reescritura completa: identificación del responsable, bases legales por finalidad, proveedores nombrados, plazos de conservación, derechos ampliados y corrección de los plazos de respuesta a consultas (10 días hábiles, art. 14 de la Ley 1581).",
      },
      { date: "2026-09-25", change: "Se incorporó la firma electrónica de propuestas y las cookies técnicas." },
    ],
    content: [
      {
        type: "paragraph",
        text: `${CONTROLLER}. En esta política, "nosotros" o "la Agencia" se refiere a esa persona natural, responsable del tratamiento de los datos personales que usted nos entrega a través de este sitio web, del portal de clientes o de cualquier otro canal aquí descrito, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas que los modifiquen o complementen.`,
      },
      {
        type: "paragraph",
        text: `Para cualquier asunto sobre sus datos personales, escriba a ${contactEmail}. Ese correo es el canal oficial de consultas y reclamos.`,
      },
      { type: "heading", level: 2, text: "1. Datos que recolectamos" },
      {
        type: "paragraph",
        text: "Recolectamos datos personales por varios canales, según cómo interactúe con nosotros:",
      },
      {
        type: "list",
        items: [
          "Formulario de contacto y cotizador interactivo: nombre o razón social, correo electrónico, teléfono (opcional) y el contenido de su mensaje o configuración de proyecto.",
          'Cotizador, opción "Recíbelo por correo": solo su correo electrónico.',
          "Propuestas comerciales: si acepta una propuesta, registramos su nombre tecleado, la dirección IP y el navegador desde el que aceptó, como firma electrónica de ese acuerdo (Ley 527 de 1999).",
          "Portal de clientes: si llega a ser cliente, creamos una cuenta con su nombre, correo y credenciales de acceso, desde donde puede ver sus proyectos, facturas y documentos.",
          "Datos técnicos de navegación: dirección IP y encabezados estándar del navegador, procesados automáticamente por nuestra infraestructura (alojamiento, entrega de correo, monitoreo de errores) para que el sitio funcione y se mantenga seguro. No construimos un perfil de navegación con fines publicitarios.",
          "Si usted lo permite en el centro de preferencias de cookies: su país aproximado (deducido de la IP, sin guardar la IP) y de qué campaña o página llegó (parámetros UTM, identificadores de clic de anuncios y referente).",
        ],
      },
      {
        type: "paragraph",
        text: "No recolectamos datos sensibles (salud, origen étnico, orientación política o religiosa, datos biométricos) ni le pedimos que nos los entregue. No recolectamos datos de tarjetas de pago: los pagos en línea los procesa un tercero especializado (ver sección 5) y solo recibimos la confirmación de que el pago ocurrió.",
      },
      { type: "heading", level: 2, text: "2. Finalidades y base legal" },
      {
        type: "paragraph",
        text: "Cada uso de sus datos tiene una finalidad concreta y una base que lo autoriza. Si usted se encuentra en el Espacio Económico Europeo, estas son también las bases del artículo 6 del RGPD.",
      },
      {
        type: "table",
        caption: "Finalidades del tratamiento y su base legal",
        columns: ["Finalidad", "Datos", "Base legal"],
        rows: [
          [
            "Responder su solicitud de contacto o cotización y enviarle la cotización que pidió",
            "Nombre, correo, teléfono, mensaje",
            "Su autorización expresa al enviar el formulario (casilla obligatoria)",
          ],
          [
            "Dar seguimiento comercial a proyectos en conversación",
            "Los anteriores y las notas de seguimiento",
            "Su autorización; interés legítimo en atender su propia solicitud",
          ],
          [
            "Prestar el servicio contratado: gestión de proyectos, soporte, comunicación y portal",
            "Datos de la cuenta, proyectos, documentos, tickets",
            "Ejecución del contrato o de las medidas previas que usted solicitó",
          ],
          [
            "Facturar, cobrar y cumplir obligaciones contables y tributarias",
            "Datos de facturación y pagos",
            "Obligación legal",
          ],
          [
            "Dejar constancia de la aceptación de una propuesta",
            "Nombre tecleado, IP, navegador, fecha y hora",
            "Ejecución del contrato; prueba de la firma electrónica (Ley 527 de 1999)",
          ],
          [
            "Proteger el sitio y las cuentas: límites de intentos, detección de accesos inusuales, avisos de seguridad",
            "IP, navegador, registros de acceso",
            "Interés legítimo en la seguridad; obligación de adoptar medidas de seguridad (Ley 1581, art. 17)",
          ],
          [
            "Saber qué campañas funcionan y proponerle moneda e indicativo por defecto",
            "País aproximado; UTM, identificadores de clic y referente",
            "Su consentimiento, que puede retirar en cualquier momento",
          ],
        ],
      },
      {
        type: "paragraph",
        text: "No usamos sus datos con fines distintos a los descritos, no tomamos decisiones automatizadas con efectos jurídicos sobre usted ni elaboramos perfiles con fines publicitarios, y no los vendemos ni los compartimos con terceros para publicidad.",
      },
      { type: "heading", level: 2, text: "3. Autorización" },
      {
        type: "paragraph",
        text: "Antes de recolectar sus datos mediante cualquier formulario público le pedimos marcar expresamente una casilla de autorización que enlaza a esta política: no asumimos su consentimiento por el simple hecho de usar el sitio. Sin esa autorización, los formularios no procesan la solicitud. Puede revocarla en cualquier momento, salvo cuando exista un deber legal o contractual de conservar el dato.",
      },
      { type: "heading", level: 2, text: "4. Cookies y almacenamiento en su navegador" },
      {
        type: "paragraph",
        text: "El sitio solo guarda en su navegador lo que aparece en la [Política de Cookies](/politica-cookies), con su duración y finalidad. Lo estrictamente necesario no requiere consentimiento; lo demás (país y campaña de origen) solo se guarda si usted lo acepta, y puede cambiar esa decisión cuando quiera desde el enlace «Preferencias de cookies» del pie de página.",
      },
      { type: "heading", level: 2, text: "5. Proveedores que tratan datos por nuestra cuenta" },
      {
        type: "paragraph",
        text: "Para operar el sitio y el sistema interno nos apoyamos en los proveedores de la tabla. Actúan como encargados del tratamiento: solo reciben lo estrictamente necesario para su función y no pueden usarlo para fines propios. Algunos operan servidores fuera de Colombia, lo que constituye una transferencia o transmisión internacional de datos (art. 26 de la Ley 1581 y arts. 24 y 25 del Decreto 1377). Para quienes se encuentren en el Espacio Económico Europeo, la transferencia se apoya en las garantías que ofrece cada proveedor, como cláusulas contractuales tipo.",
      },
      {
        type: "table",
        caption: "Proveedores y datos que pueden tratar",
        columns: ["Proveedor", "Para qué lo usamos", "Qué datos puede tratar"],
        rows: [
          [
            "Render",
            "Alojamiento del sitio y de la base de datos",
            "Todos los datos descritos en la sección 1, almacenados y servidos desde su infraestructura",
          ],
          [
            "Resend",
            "Envío de correos: confirmaciones, cotizaciones, avisos y recuperación de contraseña",
            "Correo, nombre y el contenido del mensaje enviado",
          ],
          [
            "Cloudflare (R2)",
            "Almacenamiento de archivos de proyecto, imágenes y copias de seguridad de la base de datos",
            "Documentos que usted o nosotros subimos y copias completas de la base de datos",
          ],
          [
            "Sentry",
            "Monitoreo técnico de errores del sitio",
            "Detalles técnicos del error (página, navegador, mensaje) y la dirección IP desde la que ocurrió",
          ],
          [
            "Bold",
            "Pagos en línea con tarjeta desde el portal de clientes",
            "Datos de pago que usted escribe en el formulario de Bold; a nosotros solo nos llega la confirmación",
          ],
          [
            "Have I Been Pwned",
            "Comprobar si una contraseña nueva ya apareció en filtraciones públicas",
            "Solo los 5 primeros caracteres de un hash de la contraseña (k-anonimato): nunca la contraseña ni el correo",
          ],
        ],
      },
      { type: "heading", level: 2, text: "6. Plazos de conservación" },
      {
        type: "paragraph",
        text: "Conservamos cada dato solo el tiempo necesario para su finalidad, con estos plazos máximos. Cuando el plazo termina, lo suprimimos o lo anonimizamos de forma irreversible.",
      },
      {
        type: "table",
        caption: "Cuánto tiempo conservamos cada tipo de dato",
        columns: ["Dato", "Plazo"],
        rows: [
          [
            "Solicitudes de contacto y cotizaciones que no llegan a ser un proyecto",
            "24 meses desde el último contacto, o hasta que usted pida su supresión si es antes",
          ],
          [
            "Datos de clientes, proyectos, documentos y tickets",
            "Mientras dure la relación contractual y hasta 2 años después de terminado el soporte o la garantía pactados",
          ],
          [
            "Facturas, pagos y soportes contables",
            "10 años desde su emisión, por obligación legal (art. 28 de la Ley 962 de 2005). En una solicitud de supresión se anonimiza la identidad y se conserva el registro contable",
          ],
          [
            "Firma electrónica de propuestas",
            "Mientras dure el contrato y 5 años después, para poder acreditar el acuerdo",
          ],
          [
            "Sesión iniciada en el portal",
            "Hasta 7 días y se cierra tras 12 horas sin actividad; usted puede cerrarla antes",
          ],
          [
            "Enlaces de invitación y de recuperación de contraseña",
            "3 días y 1 hora respectivamente, y de un solo uso",
          ],
          [
            "Registros de seguridad y auditoría",
            "Registros de acceso y seguridad: 12 meses. Registro de auditoría de cambios sobre cuentas y proyectos de clientes: mientras dure la relación y 5 años después",
          ],
          [
            "Copias de seguridad de la base de datos",
            "Las 8 copias semanales más recientes; las anteriores se eliminan automáticamente",
          ],
        ],
      },
      { type: "heading", level: 2, text: "7. Sus derechos" },
      {
        type: "paragraph",
        text: "Como titular de sus datos usted tiene derecho a conocer, actualizar y rectificar su información; a pedir prueba de la autorización otorgada; a ser informado del uso que se les ha dado; a revocar la autorización y solicitar la supresión; a acceder gratuitamente a sus datos; y a presentar quejas ante la autoridad. Esto aplica haya llegado a ser cliente o no.",
      },
      {
        type: "paragraph",
        text: "Si el RGPD le es aplicable, además tiene derecho a la portabilidad de sus datos en un formato estructurado, a la limitación del tratamiento y a oponerse a él por motivos relacionados con su situación particular. Para clientes, ya podemos entregarle un archivo con toda su información.",
      },
      {
        type: "paragraph",
        text: `Para ejercerlos escriba a ${contactEmail} indicando su solicitud y el correo con el que nos contactó. Podemos pedirle que acredite su identidad para evitar que un tercero acceda a sus datos. Atendemos las consultas en un máximo de 10 días hábiles, prorrogables por 5 más si le informamos el motivo (art. 14 de la Ley 1581), y los reclamos, incluida la supresión, en un máximo de 15 días hábiles, prorrogables por 8 más con el mismo aviso (art. 15). El ejercicio de sus derechos es gratuito.`,
      },
      {
        type: "paragraph",
        text: "Cuando la solicitud sea de supresión y exista una obligación legal o contable de conservar el registro asociado (por ejemplo, una factura ya emitida), sus datos identificables se reemplazan de forma permanente por valores genéricos en lugar de borrarse por completo, como lo contempla la excepción del artículo 9 de la Ley 1581 y del artículo 17.3.b del RGPD. En cualquier otro caso se suprimen. La anonimización es irreversible.",
      },
      {
        type: "paragraph",
        text: "Si considera que no atendimos su solicitud adecuadamente, puede presentar una queja ante la Superintendencia de Industria y Comercio (SIC), autoridad de protección de datos de Colombia, una vez agotado el trámite ante nosotros. Si se encuentra en la Unión Europea, también puede acudir a la autoridad de protección de datos de su país.",
      },
      { type: "heading", level: 2, text: "8. Seguridad" },
      {
        type: "paragraph",
        text: "Adoptamos medidas técnicas y organizativas proporcionales al riesgo:",
      },
      {
        type: "list",
        items: [
          "Todo el tráfico del sitio viaja cifrado (TLS).",
          "Las contraseñas se guardan con un algoritmo de hash lento y nunca en texto plano; comprobamos que una contraseña nueva no haya aparecido en filtraciones públicas.",
          "Las cuentas pueden activar verificación en dos pasos, y las pantallas de acceso tienen límites de intentos, comprobaciones contra automatización y avisos cuando se inicia sesión desde un dispositivo nuevo.",
          "Las sesiones se pueden revocar y caducan por inactividad.",
          "El acceso a los datos está limitado al personal que los necesita, con permisos por rol y un registro de auditoría de los cambios.",
          "Mantenemos copias de seguridad de la base de datos en un proveedor distinto al del alojamiento.",
        ],
      },
      {
        type: "paragraph",
        text: `Si ocurre un incidente de seguridad que afecte sus datos personales, lo evaluaremos de inmediato, lo reportaremos a la SIC cuando corresponda y le informaremos de forma directa si existe un riesgo para usted. Puede reportarnos una vulnerabilidad escribiendo a ${contactEmail}.`,
      },
      { type: "heading", level: 2, text: "9. Menores de edad" },
      {
        type: "paragraph",
        text: "Este sitio y nuestros servicios están dirigidos a empresas y personas mayores de edad. No recolectamos intencionalmente datos de menores de 18 años; si detecta que lo hicimos, escríbanos y los suprimiremos.",
      },
      { type: "heading", level: 2, text: "10. Cambios a esta política" },
      {
        type: "paragraph",
        text: "Podemos actualizar esta política por cambios legales u operativos. Cada versión queda registrada en el historial de cambios al final de esta página, con su fecha. Si un cambio afecta de fondo el tratamiento de sus datos, se lo comunicaremos de forma destacada y, cuando la ley lo exija, volveremos a pedir su autorización.",
      },
    ],
  },
  {
    slug: "politica-cookies",
    title: "Política de Cookies",
    description:
      "Lista exacta de lo que este sitio guarda en su navegador, para qué sirve, cuánto dura y cómo aceptarlo, rechazarlo o cambiarlo en cualquier momento.",
    updatedAt: "2026-10-02",
    version: "2.0",
    summary: [
      "No usamos cookies de analítica ni de publicidad, ni píxeles de redes sociales.",
      "Lo estrictamente necesario (sesión, su elección de cookies) funciona sin pedirle permiso.",
      "Su país y de qué campaña llegó solo se guardan si usted lo acepta.",
      "Puede aceptar, rechazar o cambiar su elección cuando quiera, con la misma facilidad.",
    ],
    changelog: [
      {
        date: "2026-10-02",
        change:
          "Se agregó el centro de preferencias con consentimiento por categoría, la tabla completa de lo que se guarda (generada desde el propio código) y se corrigió la política anterior, que omitía el país y la campaña de origen.",
      },
      { date: "2026-09-25", change: "Versión anterior: aviso informativo sin consentimiento por categoría." },
    ],
    content: [
      {
        type: "paragraph",
        text: "Una cookie es un pequeño archivo que un sitio web guarda en su navegador para recordar información entre visitas. El navegador ofrece otros mecanismos equivalentes (almacenamiento local y de sesión) que esta política trata igual. Aquí figura todo lo que este sitio guarda, sin excepciones.",
      },
      { type: "heading", level: 2, text: "1. Qué no usamos" },
      {
        type: "paragraph",
        text: "No usamos Google Analytics ni otra analítica de terceros, píxeles de redes sociales ni herramientas de grabación de sesiones o de seguimiento entre sitios. La única excepción es la etiqueta de conversión de Google Ads de la página de confirmación de envío, que solo se carga si usted acepta la categoría de medición (ver la sección 5). No vendemos lo que se guarda en su navegador.",
      },
      { type: "heading", level: 2, text: "2. Qué guardamos, para qué y cuánto tiempo" },
      {
        type: "table",
        caption: "Cookies y almacenamiento del navegador de este sitio",
        columns: ["Nombre", "Tipo", "Categoría", "Finalidad", "Duración"],
        rows: STORAGE_INVENTORY.map((entry) => [
          entry.name,
          storageKindLabel(entry.kind),
          entry.category === "necessary" ? "Necesaria" : entry.category === "preferences" ? "Preferencias" : "Medición",
          entry.purpose,
          entry.duration,
        ]),
      },
      { type: "heading", level: 2, text: "3. Categorías y consentimiento" },
      {
        type: "list",
        items: [
          "Necesarias: indispensables para que el sitio funcione o para recordar su elección. No requieren consentimiento y no se pueden desactivar. Si solo navega el sitio público sin iniciar sesión, no se instala la cookie de sesión.",
          "Preferencias: recuerdan su país para proponerle moneda e indicativo por defecto. Solo se guardan si las acepta; si las rechaza, el sitio funciona igual y simplemente deduce el país en cada visita sin guardarlo.",
          "Medición: guardan de qué campaña o página llegó para saber qué canales funcionan y adjuntarlo a su mensaje si nos escribe. Solo se guardan si las acepta; si las rechaza, su mensaje llega igual, sin ese dato.",
        ],
      },
      {
        type: "paragraph",
        text: "Hasta que usted decide, solo actúan las necesarias. Al rechazar o al retirar un consentimiento borramos de inmediato lo que ya se había guardado en esa categoría. Guardamos su elección, con fecha y versión de esta política, para no volver a preguntarle y poder demostrarla; si esta política cambia de fondo, volveremos a preguntarle.",
      },
      { type: "heading", level: 2, text: "4. Cambiar su elección" },
      {
        type: "paragraph",
        text: "Retirar el consentimiento es tan fácil como darlo. Puede hacerlo ahora o desde el enlace «Preferencias de cookies» en el pie de cualquier página.",
      },
      { type: "cookie-preferences" },
      {
        type: "paragraph",
        text: "También puede revisar, bloquear o eliminar lo almacenado desde la configuración de privacidad de Chrome, Safari, Firefox o Edge. Tenga en cuenta que bloquear las necesarias puede impedir iniciar sesión en el portal.",
      },
      { type: "heading", level: 2, text: "5. Terceros" },
      {
        type: "paragraph",
        text: `${THIRD_PARTY_STORAGE_NOTE.purpose} Consulte la política de privacidad de ${THIRD_PARTY_STORAGE_NOTE.provider} para conocer su detalle.`,
      },
      {
        type: "paragraph",
        text: `${GOOGLE_ADS_STORAGE_NOTE.purpose} Consulte la política de privacidad de ${GOOGLE_ADS_STORAGE_NOTE.provider} para conocer su detalle.`,
      },
      {
        type: "paragraph",
        text: "El sitio enlaza a servicios externos (por ejemplo, WhatsApp, Facebook o Instagram). Al hacer clic en uno de esos enlaces abandona este sitio y rigen las políticas de ese servicio.",
      },
      { type: "heading", level: 2, text: "6. Cambios y datos personales" },
      {
        type: "paragraph",
        text: "Si en el futuro incorporamos otra herramienta que guarde información en su navegador, la añadiremos a la tabla anterior y a su categoría antes de activarla, y pediremos su consentimiento cuando corresponda. Para saber cómo tratamos los datos personales que usted nos entrega, consulte la [Política de Privacidad](/politica-privacidad).",
      },
    ],
  },
  {
    slug: "terminos-uso",
    title: "Términos de Uso",
    description: "Condiciones de uso de este sitio web.",
    updatedAt: "2026-07-21",
    version: "1.0",
    changelog: [{ date: "2026-07-21", change: "Versión vigente del documento." }],
    content: [
      {
        type: "paragraph",
        text: `Al navegar este sitio web, usted acepta los siguientes términos. Si no está de acuerdo, le pedimos no usar el sitio y contactarnos directamente en ${contactEmail}.`,
      },
      { type: "heading", level: 2, text: "1. Propiedad intelectual" },
      {
        type: "paragraph",
        text: `El contenido de este sitio (textos, marca "${siteName}", logo, diseño visual y el código fuente del sitio en sí) es propiedad de ${siteName} o se usa bajo licencia. No está autorizado a reproducir, distribuir o modificar este contenido sin autorización previa por escrito, salvo el uso normal de navegación.`,
      },
      { type: "heading", level: 2, text: "2. Uso permitido" },
      {
        type: "list",
        items: [
          "Puede navegar el sitio y leer el contenido del blog libremente.",
          "No puede intentar vulnerar la seguridad del sitio, realizar scraping masivo automatizado, ni interferir con su funcionamiento normal.",
          "No puede usar el sitio para fines ilegales o para suplantar a esta agencia.",
        ],
      },
      { type: "heading", level: 2, text: "3. Enlaces a terceros" },
      {
        type: "paragraph",
        text: "Este sitio puede enlazar a redes sociales u otros sitios externos (por ejemplo, WhatsApp o nuestras redes). No somos responsables del contenido o las políticas de privacidad de sitios de terceros.",
      },
      { type: "heading", level: 2, text: "4. Disponibilidad del sitio" },
      {
        type: "paragraph",
        text: "Hacemos un esfuerzo razonable por mantener el sitio disponible, pero no garantizamos disponibilidad ininterrumpida ni libre de errores.",
      },
      { type: "heading", level: 2, text: "5. Ley aplicable" },
      {
        type: "paragraph",
        text: "Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces competentes de Colombia.",
      },
    ],
  },
  {
    slug: "terminos-y-condiciones",
    title: "Términos y Condiciones",
    description:
      "Condiciones generales bajo las cuales SkyCode Agency presta servicios de desarrollo de software.",
    updatedAt: "2026-07-21",
    version: "1.0",
    changelog: [{ date: "2026-07-21", change: "Versión vigente del documento." }],
    content: [
      {
        type: "paragraph",
        text: `Estos términos y condiciones aplican a la prestación de servicios de desarrollo de software, diseño y consultoría técnica por parte de ${siteName} a sus clientes, de forma complementaria a lo pactado por escrito en cada propuesta comercial o contrato específico.`,
      },
      { type: "heading", level: 2, text: "1. Alcance del servicio" },
      {
        type: "paragraph",
        text: "El alcance, cronograma y entregables de cada proyecto se definen por escrito en una propuesta comercial antes de iniciar el trabajo. Estos términos generales no reemplazan lo acordado específicamente en dicha propuesta; en caso de conflicto, prevalece el acuerdo específico firmado con el cliente.",
      },
      { type: "heading", level: 2, text: "2. Propiedad del código entregado" },
      {
        type: "paragraph",
        text: "Una vez cumplidas las condiciones de pago acordadas, el código fuente y los entregables desarrollados específicamente para el cliente son transferidos en su totalidad al cliente, sin dependencia de plataformas o builders propietarios de terceros — consistente con nuestro compromiso de código 100% transferible.",
      },
      { type: "heading", level: 2, text: "3. Confidencialidad" },
      {
        type: "paragraph",
        text: "Tratamos como confidencial toda la información técnica, comercial o de negocio que el cliente comparta durante el proyecto, y no la divulgamos a terceros sin autorización, salvo obligación legal.",
      },
      { type: "heading", level: 2, text: "4. Pagos" },
      {
        type: "paragraph",
        text: "Las condiciones de pago (anticipos, hitos de entrega y forma de pago) se definen en la propuesta comercial de cada proyecto. El incumplimiento de los pagos acordados puede resultar en la suspensión de los servicios.",
      },
      { type: "heading", level: 2, text: "5. Garantía y soporte" },
      {
        type: "paragraph",
        text: "Corregimos, sin costo adicional, los defectos atribuibles a nuestro desarrollo que se reporten dentro de un periodo razonable posterior a la entrega, según lo acordado en la propuesta. Los cambios de alcance, nuevas funcionalidades o mantenimiento posterior a ese periodo se cotizan por separado.",
      },
      { type: "heading", level: 2, text: "6. Limitación de responsabilidad" },
      {
        type: "paragraph",
        text: "Nuestra responsabilidad se limita al valor efectivamente pagado por el cliente por el servicio específico del que se derive la reclamación, salvo dolo o negligencia grave.",
      },
      { type: "heading", level: 2, text: "7. Terminación" },
      {
        type: "paragraph",
        text: "Cualquiera de las partes puede terminar un acuerdo de servicio con aviso previo por escrito, en los términos definidos en la propuesta comercial correspondiente. El cliente recibe los entregables y el código completados hasta la fecha de terminación, sujeto al pago de lo trabajado.",
      },
      { type: "heading", level: 2, text: "8. Ley aplicable" },
      {
        type: "paragraph",
        text: "Estos términos y condiciones se rigen por las leyes de la República de Colombia.",
      },
    ],
  },
];

export function getLegalDocBySlug(slug: string): LegalDocument | undefined {
  return legalDocuments.find((doc) => doc.slug === slug);
}
