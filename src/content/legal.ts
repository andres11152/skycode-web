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
    updatedAt: "2026-07-21",
    content: [
      {
        type: "paragraph",
        text: `${siteName} ("nosotros", "la Agencia") es responsable del tratamiento de los datos personales que usted nos entrega a través de este sitio web, de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas que las modifiquen o complementen en Colombia.`,
      },
      { type: "heading", level: 2, text: "1. Datos que recolectamos" },
      {
        type: "paragraph",
        text: "Solo recolectamos los datos que usted nos entrega voluntariamente a través del formulario de contacto de este sitio: nombre o razón social, correo electrónico y el contenido del mensaje. No recolectamos datos de pago, no requerimos crear una cuenta de usuario y no usamos formularios ocultos de captura de datos.",
      },
      { type: "heading", level: 2, text: "2. Finalidad del tratamiento" },
      {
        type: "list",
        items: [
          "Responder su solicitud de contacto o cotización.",
          "Dar seguimiento comercial a proyectos en conversación.",
          "Cumplir obligaciones legales o contractuales cuando exista una relación de servicio vigente.",
        ],
      },
      {
        type: "paragraph",
        text: "No usamos sus datos con fines distintos a los descritos, no los vendemos ni los compartimos con terceros para fines publicitarios.",
      },
      { type: "heading", level: 2, text: "3. Sus derechos (derechos ARCO)" },
      {
        type: "paragraph",
        text: "Como titular de sus datos personales, usted tiene derecho a Acceder, Rectificar, Cancelar y Oponerse (ARCO) al tratamiento de su información, así como a conocer, actualizar y solicitar la supresión de sus datos en cualquier momento.",
      },
      {
        type: "paragraph",
        text: `Para ejercer estos derechos, escríbanos a ${contactEmail} indicando su solicitud. Responderemos dentro de los términos establecidos por la ley.`,
      },
      { type: "heading", level: 2, text: "4. Conservación y seguridad" },
      {
        type: "paragraph",
        text: "Conservamos sus datos únicamente durante el tiempo necesario para cumplir la finalidad para la que fueron recolectados, o mientras exista una relación comercial vigente. Todo el tráfico de este sitio viaja cifrado (TLS), y el acceso a los datos recibidos está restringido al personal que necesita tratarlos para responder su solicitud.",
      },
      { type: "heading", level: 2, text: "5. Menores de edad" },
      {
        type: "paragraph",
        text: "Este sitio y nuestros servicios están dirigidos a empresas y personas naturales mayores de edad. No recolectamos intencionalmente datos de menores de 18 años.",
      },
      { type: "heading", level: 2, text: "6. Cambios a esta política" },
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
    updatedAt: "2026-07-21",
    content: [
      {
        type: "paragraph",
        text: "Una cookie es un pequeño archivo que un sitio web guarda en su navegador para recordar información entre visitas. Esta política explica, de forma honesta, qué usa este sitio hoy.",
      },
      { type: "heading", level: 2, text: "1. Qué usamos hoy" },
      {
        type: "paragraph",
        text: "Este sitio es una página estática. Actualmente no instalamos cookies de analítica, publicidad ni seguimiento de terceros (no usamos Google Analytics, píxeles de redes sociales ni cookies publicitarias). No requerimos su consentimiento porque, hoy, no hay nada de eso que consentir.",
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
