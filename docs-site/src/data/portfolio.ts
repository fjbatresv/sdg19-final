/**
 * Bilingual copy for the portfolio landing (`/portfolio/` and `/portfolio/es/`).
 * Facts mirror ARCHITECTURE.md, FLOWS.md, SECURITY.md and the *-COST.md files;
 * keep them in sync when the architecture changes.
 */
export type Lang = 'en' | 'es';

export const REPO_URL = 'https://github.com/fjbatresv/sdg19-final';

interface Stat {
  value: string;
  label: string;
}

interface Card {
  tag: string;
  title: string;
  body: string;
}

interface Flow {
  id: string;
  title: string;
  steps: string[];
  note: string;
}

export interface PortfolioCopy {
  lang: Lang;
  htmlLang: string;
  meta: { title: string; description: string };
  nav: {
    skip: string;
    primaryLabel: string;
    architecture: string;
    flows: string;
    decisions: string;
    quality: string;
    docs: string;
    langSwitch: string;
    langSwitchLabel: string;
    themeLabel: string;
  };
  sheet: {
    label: string;
    projectLabel: string;
    project: string;
    sheet: string;
    rev: string;
    stackLabel: string;
    scaleLabel: string;
    scale: string;
    dimension: string;
  };
  hero: {
    kicker: string;
    title: [string, string];
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    stats: Stat[];
  };
  problem: { eyebrow: string; title: string; requirements: Card[] };
  architecture: {
    eyebrow: string;
    title: string;
    lead: string;
    diagramTitle: string;
    diagramDesc: string;
    legendRequest: string;
    legendEvent: string;
    legendReplica: string;
    legendTitle: string;
    usersLabel: string;
    legendNotes: string[];
    listToggle: string;
  };
  flows: { eyebrow: string; title: string; items: Flow[] };
  decisions: { eyebrow: string; title: string; items: Card[] };
  quality: { eyebrow: string; title: string; lead: string; items: Card[] };
  docs: {
    eyebrow: string;
    title: string;
    links: { label: string; desc: string; href: string; external?: boolean }[];
  };
  footer: { built: string; by: string; source: string; license: string };
}

const en: PortfolioCopy = {
  lang: 'en',
  htmlLang: 'en',
  meta: {
    title: 'SDG19 — Serverless commerce on AWS | Portfolio',
    description:
      'Event-driven, multi-region serverless e-commerce on AWS: CloudFront + WAF, Cognito, API Gateway, Lambda, DynamoDB streams, SNS/SQS fan-out, SES and a Kinesis → Firehose Parquet data lake. Built with Angular, Nx and AWS CDK.',
  },
  nav: {
    skip: 'Skip to content',
    primaryLabel: 'Primary',
    architecture: 'Architecture',
    flows: 'Flows',
    decisions: 'Decisions',
    quality: 'Quality',
    docs: 'Docs',
    langSwitch: 'ES',
    langSwitchLabel: 'Ver en español',
    themeLabel: 'Toggle color theme',
  },
  sheet: {
    label: 'Drawing title block',
    projectLabel: 'Project',
    stackLabel: 'Stack',
    scaleLabel: 'Scale',
    dimension: '0 servers · 2 regions',
    project: 'SDG19 · Final project',
    sheet: 'Sheet',
    rev: 'Rev',
    scale: '1:1 · us-east-1 ⇄ us-east-2',
  },
  hero: {
    kicker: 'AWS Solutions Architect · Capstone',
    title: ['Serverless commerce,', 'drawn to scale.'],
    lead: 'An e-commerce API that sleeps at 3 a.m. and survives Black Friday. Orders flow through DynamoDB streams into an SNS/SQS fan-out that sends audited confirmation emails and feeds a near-real-time data lake, all deployed by CDK across two regions with no static credentials.',
    primaryCta: 'Read the documentation',
    secondaryCta: 'View source on GitHub',
    stats: [
      { value: '10', label: 'Lambda functions, one bundle' },
      { value: '2', label: 'AWS regions with KMS replication' },
      { value: '10 yr', label: 'audited email retention' },
      { value: '≥80%', label: 'test coverage per app' },
    ],
  },
  problem: {
    eyebrow: '01 — Brief',
    title: 'What the business asked for',
    requirements: [
      {
        tag: 'Scale',
        title: 'Spiky, unpredictable traffic',
        body: 'Quiet nights, massive peaks on campaigns. Pay-per-request compute and on-demand storage instead of provisioned capacity.',
      },
      {
        tag: 'Audit',
        title: 'Every notification kept for 10 years',
        body: 'Emails stored in S3 with Glacier transition after a year, expiration at ten, and cross-region replication.',
      },
      {
        tag: 'Data',
        title: 'Orders in the data lake, near real time',
        body: 'Each order is streamed to Kinesis and landed by Firehose as hourly-partitioned Parquet.',
      },
      {
        tag: 'Security',
        title: 'Defense in depth',
        body: 'JWT auth, least-privilege IAM, SSE-KMS at rest, TLS in transit, WAF at the edge, friendly custom domains.',
      },
    ],
  },
  architecture: {
    eyebrow: '02 — Architecture',
    title: 'One request path, one event backbone',
    lead: 'Synchronous calls stay short: the edge authenticates, a Lambda writes one item to DynamoDB, and the response returns. Everything else, including email, audit and analytics, happens asynchronously off the table’s change stream.',
    diagramTitle: 'SDG19 AWS architecture diagram',
    diagramDesc:
      'Users reach Route 53, WAF and two CloudFront distributions. The web distribution serves the Angular app from S3. The API distribution fronts an API Gateway HTTP API with a Cognito JWT authorizer, which invokes Lambda functions backed by a DynamoDB single table. The table stream triggers an order-stream Lambda that publishes to SNS. SNS fans out to two SQS queues: one feeds the order-email Lambda, which stores audit copies in an encrypted S3 bucket replicated to us-east-2 and sends mail with SES; the other feeds the order-lake Lambda, which writes to Kinesis Data Streams and Firehose into a Parquet data lake in S3.',
    legendRequest: 'Synchronous request',
    legendEvent: 'Order event',
    legendReplica: 'Cross-region replication',
    legendTitle: 'LEGEND',
    usersLabel: 'users',
    legendNotes: [
      'λ = AWS Lambda · Node.js 24',
      'X-Ray on every function',
      'SSE-KMS at rest',
      'TLS in transit',
    ],
    listToggle: 'Read the diagram as a list',
  },
  flows: {
    eyebrow: '03 — Flows',
    title: 'Follow an order',
    items: [
      {
        id: 'api',
        title: 'Place the order',
        steps: [
          'Angular app → CloudFront (API) + WAF',
          'API Gateway HTTP API validates the Cognito JWT',
          'createOrder Lambda writes PK=USER#sub · SK=ORDER#id',
          'GSI1 serves “my orders” with cursor pagination',
        ],
        note: 'Products are cached at the edge; orders are never cached.',
      },
      {
        id: 'email',
        title: 'Confirm by email',
        steps: [
          'DynamoDB Stream → order-stream Lambda → SNS topic',
          'SQS queue (with DLQ) → order-email Lambda',
          'Audit copy written to S3 as pending, without PII',
          'SES template sent, copy promoted to sent',
        ],
        note: 'The emails bucket is KMS-encrypted and replicated to us-east-2.',
      },
      {
        id: 'lake',
        title: 'Land it in the lake',
        steps: [
          'Same SNS topic → dedicated SQS lake queue',
          'order-lake Lambda → Kinesis Data Stream (KMS)',
          'Firehose converts to Parquet',
          'S3 DataBucket, partitioned by hour',
        ],
        note: 'Analytics consumers never touch the transactional table.',
      },
    ],
  },
  decisions: {
    eyebrow: '04 — Trade-offs',
    title: 'Decisions worth defending',
    items: [
      {
        tag: 'Cost',
        title: 'VPC is a switch, not a default',
        body: 'Placing Lambdas in private subnets needs three NAT gateways, about $97/month fixed, which pushes the floor from ~$25–35 to ~$135–175/month. A single `enableLambdaVpc` flag lets each environment pick isolation or cost.',
      },
      {
        tag: 'Data',
        title: 'Single-table DynamoDB',
        body: 'Orders keyed by user plus a GSI ordered by creation time: one query for “my orders”, strict cursor validation, and a stream that carries every change downstream.',
      },
      {
        tag: 'Events',
        title: 'SNS → SQS fan-out',
        body: 'Email and the data lake scale, retry and fail independently, with DLQs on each queue, so a slow consumer can never block checkout.',
      },
      {
        tag: 'Resilience',
        title: 'Replicate what audit requires',
        body: 'Only the 10-year audit trail is replicated to a second region with its own KMS key. That keeps multi-region cost focused where the requirement lives.',
      },
      {
        tag: 'Delivery',
        title: 'One bundle, many handlers',
        body: 'esbuild produces a single backend artifact; CDK wires each Lambda to a named export. One build, consistent dependencies, fast deploys.',
      },
      {
        tag: 'Access',
        title: 'No long-lived keys anywhere',
        body: 'GitHub Actions assumes a deploy role through OIDC, pinned to a protected `aws` environment. Nothing to rotate, nothing to leak.',
      },
    ],
  },
  quality: {
    eyebrow: '05 — Quality & security',
    title: 'Hardened, measured, documented',
    lead: 'The pipeline treats the supply chain as part of the architecture.',
    items: [
      {
        tag: 'Tests',
        title: '≥80% coverage gate',
        body: 'Vitest across backend, infra (CDK assertions) and web, with LCOV reported to SonarCloud quality gates.',
      },
      {
        tag: 'SAST',
        title: 'CodeQL + SonarCloud',
        body: 'security-extended queries on TypeScript and on the workflows themselves.',
      },
      {
        tag: 'Supply chain',
        title: 'Zero high or critical advisories',
        body: 'npm audit blocks CI, dependency review gates PRs, Dependabot runs grouped updates with a cooldown, and every action is pinned to a commit SHA.',
      },
      {
        tag: 'Runtime',
        title: 'Encrypted and traced',
        body: 'KMS on DynamoDB, S3, SNS, SQS and Kinesis; WAF on both distributions; X-Ray traces on every Lambda.',
      },
    ],
  },
  docs: {
    eyebrow: '06 — Go deeper',
    title: 'Everything is documented',
    links: [
      {
        label: 'Architecture guide',
        desc: 'Starlight docs: infra, flows, costs, deploy',
        href: '',
      },
      {
        label: 'API reference',
        desc: 'OpenAPI contract with an interactive playground',
        href: 'api-reference/',
      },
      {
        label: 'Backend (TypeDoc)',
        desc: 'Handlers and libraries',
        href: 'api-typedoc/',
      },
      {
        label: 'Frontend (Compodoc)',
        desc: 'Angular components and coverage',
        href: 'compodoc/',
      },
      {
        label: 'Source code',
        desc: 'Nx monorepo: web, backend, infra',
        href: REPO_URL,
        external: true,
      },
    ],
  },
  footer: {
    built: 'Built with Angular 22, Nx 24, AWS CDK and Astro.',
    by: 'Designed and engineered by Javier Batres.',
    source: 'Source',
    license: 'MIT License',
  },
};

const es: PortfolioCopy = {
  lang: 'es',
  htmlLang: 'es',
  meta: {
    title: 'SDG19 — Comercio serverless en AWS | Portafolio',
    description:
      'E-commerce serverless, orientado a eventos y multi-región en AWS: CloudFront + WAF, Cognito, API Gateway, Lambda, DynamoDB Streams, fan-out SNS/SQS, SES y un data lake Kinesis → Firehose en Parquet. Construido con Angular, Nx y AWS CDK.',
  },
  nav: {
    skip: 'Saltar al contenido',
    primaryLabel: 'Principal',
    architecture: 'Arquitectura',
    flows: 'Flujos',
    decisions: 'Decisiones',
    quality: 'Calidad',
    docs: 'Docs',
    langSwitch: 'EN',
    langSwitchLabel: 'View in English',
    themeLabel: 'Cambiar tema de color',
  },
  sheet: {
    label: 'Cajetín del plano',
    projectLabel: 'Proyecto',
    stackLabel: 'Stack',
    scaleLabel: 'Escala',
    dimension: '0 servidores · 2 regiones',
    project: 'SDG19 · Proyecto final',
    sheet: 'Hoja',
    rev: 'Rev',
    scale: '1:1 · us-east-1 ⇄ us-east-2',
  },
  hero: {
    kicker: 'Arquitecto de Soluciones AWS · Proyecto final',
    title: ['Comercio serverless,', 'dibujado a escala.'],
    lead: 'Una API de e-commerce que duerme a las 3 a. m. y sobrevive al Black Friday. Las órdenes viajan por DynamoDB Streams hacia un fan-out SNS/SQS que envía correos auditados y alimenta un data lake casi en tiempo real. Todo se despliega con CDK en dos regiones y sin credenciales estáticas.',
    primaryCta: 'Leer la documentación',
    secondaryCta: 'Ver el código en GitHub',
    stats: [
      { value: '10', label: 'funciones Lambda, un solo bundle' },
      { value: '2', label: 'regiones AWS con réplica KMS' },
      { value: '10 años', label: 'de retención auditada de correos' },
      { value: '≥80%', label: 'de cobertura por app' },
    ],
  },
  problem: {
    eyebrow: '01 — Requerimiento',
    title: 'Lo que pidió el negocio',
    requirements: [
      {
        tag: 'Escala',
        title: 'Tráfico variable e impredecible',
        body: 'Noches tranquilas y picos enormes en campañas. Cómputo por request y almacenamiento on-demand en lugar de capacidad aprovisionada.',
      },
      {
        tag: 'Auditoría',
        title: 'Cada notificación, 10 años',
        body: 'Correos en S3 con transición a Glacier al año, expiración a los diez y réplica en otra región.',
      },
      {
        tag: 'Datos',
        title: 'Órdenes al data lake, casi en tiempo real',
        body: 'Cada orden se envía a Kinesis y Firehose la deposita como Parquet particionado por hora.',
      },
      {
        tag: 'Seguridad',
        title: 'Defensa en profundidad',
        body: 'Autenticación JWT, IAM de mínimo privilegio, SSE-KMS en reposo, TLS en tránsito, WAF en el edge y dominios propios.',
      },
    ],
  },
  architecture: {
    eyebrow: '02 — Arquitectura',
    title: 'Un camino de request, una columna de eventos',
    lead: 'Las llamadas síncronas son cortas: el edge autentica, una Lambda escribe un ítem en DynamoDB y responde. Todo lo demás (correo, auditoría y analítica) ocurre de forma asíncrona a partir del stream de cambios de la tabla.',
    diagramTitle: 'Diagrama de arquitectura AWS de SDG19',
    diagramDesc:
      'Los usuarios llegan a Route 53, WAF y dos distribuciones CloudFront. La distribución web sirve la app Angular desde S3. La distribución de API expone un API Gateway HTTP con autorizador JWT de Cognito, que invoca funciones Lambda sobre una tabla única de DynamoDB. El stream de la tabla dispara la Lambda order-stream, que publica en SNS. SNS distribuye a dos colas SQS: una alimenta la Lambda order-email, que guarda copias de auditoría en un bucket S3 cifrado y replicado a us-east-2 y envía correo con SES; la otra alimenta la Lambda order-lake, que escribe en Kinesis Data Streams y Firehose hacia un data lake Parquet en S3.',
    legendRequest: 'Request síncrono',
    legendEvent: 'Evento de orden',
    legendReplica: 'Réplica entre regiones',
    legendTitle: 'LEYENDA',
    usersLabel: 'usuarios',
    legendNotes: [
      'λ = AWS Lambda · Node.js 24',
      'X-Ray en cada función',
      'SSE-KMS en reposo',
      'TLS en tránsito',
    ],
    listToggle: 'Leer el diagrama como lista',
  },
  flows: {
    eyebrow: '03 — Flujos',
    title: 'Sigue una orden',
    items: [
      {
        id: 'api',
        title: 'Crear la orden',
        steps: [
          'App Angular → CloudFront (API) + WAF',
          'API Gateway HTTP valida el JWT de Cognito',
          'Lambda createOrder escribe PK=USER#sub · SK=ORDER#id',
          'GSI1 responde “mis órdenes” con paginación por cursor',
        ],
        note: 'Los productos se cachean en el edge; las órdenes nunca.',
      },
      {
        id: 'email',
        title: 'Confirmar por correo',
        steps: [
          'DynamoDB Stream → Lambda order-stream → tópico SNS',
          'Cola SQS (con DLQ) → Lambda order-email',
          'Copia de auditoría en S3 como pending, sin PII',
          'Plantilla SES enviada, copia promovida a sent',
        ],
        note: 'El bucket de correos está cifrado con KMS y replicado a us-east-2.',
      },
      {
        id: 'lake',
        title: 'Llevarla al data lake',
        steps: [
          'El mismo tópico SNS → cola SQS dedicada',
          'Lambda order-lake → Kinesis Data Stream (KMS)',
          'Firehose convierte a Parquet',
          'S3 DataBucket, particionado por hora',
        ],
        note: 'La analítica nunca toca la tabla transaccional.',
      },
    ],
  },
  decisions: {
    eyebrow: '04 — Trade-offs',
    title: 'Decisiones que vale la pena defender',
    items: [
      {
        tag: 'Costo',
        title: 'La VPC es un interruptor, no un default',
        body: 'Poner las Lambdas en subredes privadas exige tres NAT gateways, unos $97/mes fijos, y sube el piso de ~$25–35 a ~$135–175/mes. Un solo flag `enableLambdaVpc` permite elegir entre aislamiento y costo en cada entorno.',
      },
      {
        tag: 'Datos',
        title: 'DynamoDB single-table',
        body: 'Órdenes por usuario y un GSI ordenado por fecha: una sola consulta para “mis órdenes”, validación estricta del cursor y un stream que propaga cada cambio.',
      },
      {
        tag: 'Eventos',
        title: 'Fan-out SNS → SQS',
        body: 'Correo y data lake escalan, reintentan y fallan por separado, cada uno con su DLQ, así que un consumidor lento nunca bloquea el checkout.',
      },
      {
        tag: 'Resiliencia',
        title: 'Replicar lo que exige la auditoría',
        body: 'Solo el rastro de auditoría de 10 años se replica a una segunda región con su propia llave KMS. El costo multi-región se concentra donde está el requisito.',
      },
      {
        tag: 'Entrega',
        title: 'Un bundle, muchos handlers',
        body: 'esbuild genera un único artefacto de backend y CDK conecta cada Lambda a un export. Un build, dependencias consistentes, deploys rápidos.',
      },
      {
        tag: 'Acceso',
        title: 'Sin llaves de larga duración',
        body: 'GitHub Actions asume el rol de deploy vía OIDC, restringido al environment protegido `aws`. Nada que rotar, nada que filtrar.',
      },
    ],
  },
  quality: {
    eyebrow: '05 — Calidad y seguridad',
    title: 'Endurecido, medido, documentado',
    lead: 'El pipeline trata la cadena de suministro como parte de la arquitectura.',
    items: [
      {
        tag: 'Pruebas',
        title: 'Gate de cobertura ≥80%',
        body: 'Vitest en backend, infra (aserciones CDK) y web, con LCOV hacia los quality gates de SonarCloud.',
      },
      {
        tag: 'SAST',
        title: 'CodeQL + SonarCloud',
        body: 'Consultas security-extended sobre TypeScript y sobre los propios workflows.',
      },
      {
        tag: 'Supply chain',
        title: 'Cero advisories altos o críticos',
        body: 'npm audit bloquea CI, dependency review filtra PRs, Dependabot agrupa actualizaciones con cooldown y cada action está fijada a un SHA.',
      },
      {
        tag: 'Runtime',
        title: 'Cifrado y trazado',
        body: 'KMS en DynamoDB, S3, SNS, SQS y Kinesis; WAF en ambas distribuciones; trazas X-Ray en cada Lambda.',
      },
    ],
  },
  docs: {
    eyebrow: '06 — Profundiza',
    title: 'Todo está documentado',
    links: [
      {
        label: 'Guía de arquitectura',
        desc: 'Docs Starlight: infra, flujos, costos, deploy',
        href: '',
      },
      {
        label: 'Referencia de API',
        desc: 'Contrato OpenAPI con playground interactivo',
        href: 'api-reference/',
      },
      {
        label: 'Backend (TypeDoc)',
        desc: 'Handlers y librerías',
        href: 'api-typedoc/',
      },
      {
        label: 'Frontend (Compodoc)',
        desc: 'Componentes Angular y cobertura',
        href: 'compodoc/',
      },
      {
        label: 'Código fuente',
        desc: 'Monorepo Nx: web, backend, infra',
        href: REPO_URL,
        external: true,
      },
    ],
  },
  footer: {
    built: 'Construido con Angular 22, Nx 24, AWS CDK y Astro.',
    by: 'Diseñado y desarrollado por Javier Batres.',
    source: 'Código',
    license: 'Licencia MIT',
  },
};

export const portfolio: Record<Lang, PortfolioCopy> = { en, es };
