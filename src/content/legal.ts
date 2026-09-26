import type { BlogBlock } from "./blog";
import { contactEmail, siteName } from "@/lib/site";

export interface LegalDocument {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  content: BlogBlock[];
}

export const legalDocuments: LegalDocument[] = [
  {
    slug: "politica-privacidad",
    title: "Política de Privacidad",
    description:
      "Cómo SkyCode Agency recolecta, usa y protege los datos personales de acuerdo con la Ley 1581 de 2012 (Habeas Data) en Colombia.",
    updatedAt: "2026-09-25",
    content: [
      {
        type: "paragraph",
        text: `${siteName} ("nosotros", "la Agencia"), con domicilio en Colombia, es responsable del tratamiento de los datos personales que usted nos entrega a través de este sitio web, nuestro portal de clientes o cualquier otro canal descrito en esta política, de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas que las modifiquen o complementen.`,
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
          "Cotizador — \"Recíbelo por correo\": solo su correo electrónico, si elige esa opción en vez de llenar el formulario completo.",
          "Propuestas comerciales: si acepta una propuesta enviada por nosotros, registramos su nombre tecleado, la dirección IP y el navegador desde el que aceptó, como firma electrónica de ese acuerdo (Ley 527 de 1999).",
          "Portal de clientes: si su empresa se convierte en cliente, creamos una cuenta con su nombre, correo y, si aplica, las credenciales de acceso al portal donde puede ver sus proyectos, facturas y documentos.",
          "Datos de navegación técnicos: dirección IP y encabezados estándar del navegador, procesados automáticamente por nuestra infraestructura (hosting, entrega de correo, monitoreo de errores) para que el sitio funcione, sin que construyamos un perfil de navegación con fines publicitarios.",
        ],
      },
      {
        type: "paragraph",
        text: "No recolectamos datos de tarjetas de pago directamente — los pagos en línea del portal de clientes los procesa un tercero especializado (ver sección 4), y nosotros solo recibimos la confirmación de que el pago ocurrió, no el número de la tarjeta.",
      },
      { type: "heading", level: 2, text: "2. Finalidad del tratamiento" },
      {
        type: "list",
        items: [
          "Responder su solicitud de contacto o cotización.",
          "Dar seguimiento comercial a proyectos en conversación.",
          "Prestar el servicio contratado si usted se convierte en cliente: gestión de proyectos, facturación, soporte y comunicación relacionada.",
          "Cumplir obligaciones legales, contables o contractuales cuando exista una relación de servicio vigente.",
          "Enviarle la cotización o confirmación que usted mismo solicitó a través del sitio.",
        ],
      },
      {
        type: "paragraph",
        text: "No usamos sus datos con fines distintos a los descritos, no los vendemos ni los compartimos con terceros para fines publicitarios.",
      },
      { type: "heading", level: 2, text: "3. Autorización" },
      {
        type: "paragraph",
        text: "Antes de recolectar sus datos a través de cualquier formulario público de este sitio, le pedimos marcar expresamente una casilla de autorización que enlaza a esta política — no asumimos su consentimiento por el simple hecho de que usted use el sitio. Sin esa autorización explícita, nuestros formularios no procesan la solicitud.",
      },
      { type: "heading", level: 2, text: "4. Cookies y transferencia internacional de datos" },
      {
        type: "paragraph",
        text: "Este sitio usa una única cookie técnica y estrictamente necesaria para mantener su sesión iniciada si usted es cliente o parte de nuestro equipo (portal de clientes o panel interno) — no requiere su consentimiento por ser indispensable para ese funcionamiento, y no la usamos para rastrear su navegación. Vea la Política de Cookies para el detalle completo, incluyendo lo que NO usamos (analítica ni publicidad).",
      },
      {
        type: "paragraph",
        text: "Para operar el sitio y el sistema interno nos apoyamos en proveedores externos que, en algunos casos, procesan datos personales desde servidores fuera de Colombia (transferencia internacional, art. 26 de la Ley 1581): alojamiento (hosting) del sitio, envío de correos transaccionales, monitoreo técnico de errores y almacenamiento de archivos en la nube. Los pagos en línea del portal de clientes los procesa una pasarela de pagos colombiana. Exigimos a estos proveedores el mismo nivel de cuidado con sus datos que aplicamos nosotros mismos, y solo les compartimos lo estrictamente necesario para prestar cada servicio.",
      },
      { type: "heading", level: 2, text: "5. Sus derechos (derechos ARCO)" },
      {
        type: "paragraph",
        text: "Como titular de sus datos personales, usted tiene derecho a Acceder, Rectificar, Cancelar y Oponerse (ARCO) al tratamiento de su información, así como a conocer, actualizar, revocar su autorización y solicitar la supresión (eliminación) de sus datos en cualquier momento — haya llegado a ser cliente nuestro o no.",
      },
      {
        type: "paragraph",
        text: `Para ejercer estos derechos, escríbanos a ${contactEmail} indicando su solicitud y el correo con el que nos contactó. Atenderemos consultas dentro de los 15 días hábiles siguientes y reclamos (incluida la solicitud de supresión) dentro de los 15 días hábiles siguientes a su radicación, según los términos del Decreto 1377 de 2013; si no es posible resolver el reclamo en ese plazo, se lo informaremos indicando los motivos y la fecha en que se atenderá, sin exceder los 8 días hábiles adicionales que permite la ley.`,
      },
      {
        type: "paragraph",
        text: "Cuando su solicitud sea de supresión, sus datos identificables se reemplazan de forma permanente por valores genéricos (anonimización) en lugar de borrarse por completo, cuando exista una obligación legal o contable de conservar el registro asociado (por ejemplo, una factura ya emitida) — la Ley 1581 (art. 9) contempla esta excepción explícitamente. En cualquier otro caso, sus datos dejan de ser identificables de forma igualmente permanente.",
      },
      {
        type: "paragraph",
        text: "Si considera que no hemos atendido su solicitud de forma adecuada, puede presentar una queja ante la Superintendencia de Industria y Comercio (SIC), autoridad de protección de datos personales en Colombia.",
      },
      { type: "heading", level: 2, text: "6. Conservación y seguridad" },
      {
        type: "paragraph",
        text: "Conservamos sus datos únicamente durante el tiempo necesario para cumplir la finalidad para la que fueron recolectados, o mientras exista una relación comercial vigente. Todo el tráfico de este sitio viaja cifrado (TLS); las contraseñas de cuentas se almacenan con hash, no en texto plano; los usuarios internos y de portal pueden activar verificación en dos pasos; y el acceso a los datos recibidos está restringido al personal que necesita tratarlos para responder su solicitud o prestar el servicio.",
      },
      { type: "heading", level: 2, text: "7. Menores de edad" },
      {
        type: "paragraph",
        text: "Este sitio y nuestros servicios están dirigidos a empresas y personas naturales mayores de edad. No recolectamos intencionalmente datos de menores de 18 años.",
      },
      { type: "heading", level: 2, text: "8. Cambios a esta política" },
      {
        type: "paragraph",
        text: "Podemos actualizar esta política para reflejar cambios legales u operativos. La fecha de la última actualización aparece al inicio de este documento.",
      },
    ],
  },
  {
    slug: "politica-cookies",
    title: "Política de Cookies",
    description:
      "Qué cookies usa este sitio (y cuáles no) y cómo puede controlarlas desde su navegador.",
    updatedAt: "2026-09-25",
    content: [
      {
        type: "paragraph",
        text: "Una cookie es un pequeño archivo que un sitio web guarda en su navegador para recordar información entre visitas. Esta política explica, de forma honesta, qué usa este sitio hoy.",
      },
      { type: "heading", level: 2, text: "1. Qué usamos hoy" },
      {
        type: "paragraph",
        text: "Si usted solo navega el sitio público (sin iniciar sesión), no instalamos ninguna cookie: no usamos Google Analytics, píxeles de redes sociales ni cookies publicitarias o de seguimiento de terceros.",
      },
      {
        type: "paragraph",
        text: "Si usted es cliente o parte de nuestro equipo e inicia sesión en el portal de clientes o el panel interno, sí usamos una única cookie técnica y estrictamente necesaria para mantener su sesión iniciada mientras navega esas páginas — no se instala si usted no inicia sesión, y no la usamos para rastrear su navegación por el sitio público ni para ningún fin distinto a mantenerlo autenticado. Por ser estrictamente necesaria para ese funcionamiento, no requiere su consentimiento bajo los criterios habituales de cookies (a diferencia de una cookie de analítica o publicidad, que sí lo requeriría y que hoy no usamos).",
      },
      { type: "heading", level: 2, text: "2. Si eso cambia" },
      {
        type: "paragraph",
        text: "Si en el futuro incorporamos herramientas de analítica (por ejemplo, para entender qué páginas visitan más nuestros usuarios) o alguna cookie técnica necesaria para el funcionamiento del sitio, actualizaremos esta política antes de activarlas y, cuando la ley lo requiera, solicitaremos su consentimiento mediante un aviso visible.",
      },
      { type: "heading", level: 2, text: "3. Cómo controlar las cookies" },
      {
        type: "paragraph",
        text: "Independientemente de lo anterior, usted siempre puede revisar, bloquear o eliminar las cookies almacenadas en su navegador desde la configuración de privacidad de Chrome, Safari, Firefox o Edge.",
      },
    ],
  },
  {
    slug: "terminos-uso",
    title: "Términos de Uso",
    description: "Condiciones de uso de este sitio web.",
    updatedAt: "2026-07-21",
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
