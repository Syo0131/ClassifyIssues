export type UserRole = 'user' | 'technician' | 'admin';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  password_hash?: string;
  projects?: string[];
  is_active?: boolean;
}

export interface AnalysisResult {
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  // 'pending' = ticket de desarrollo recién creado cuyo PRD/TRD todavía se está
  // generando en segundo plano.
  source: 'gemini' | 'mock' | 'pending';
}

export type TicketStatus = 'open' | 'waiting_on_client' | 'closed';

/**
 * Vía por la que se gestiona la solicitud. La elige el usuario antes de
 * describir su petición y determina qué prompt de IA se ejecuta:
 * - `incidencia`: triage clásico (categoría + prioridad).
 * - `desarrollo`: la IA actúa como PM/PO/Ingeniero y produce un PRD/TRD
 *   con estimación de esfuerzo (ver `DevelopmentSpec`).
 */
export type TicketType = 'incidencia' | 'desarrollo';

export type RequirementPriority = 'must' | 'should' | 'could';

export interface DevRequirement {
  id: string; // RF-01, RF-02, ...
  title: string;
  description: string;
  priority: RequirementPriority;
}

/** Bloque de trabajo estimado en horas (estimación de tres puntos). */
export interface DevModule {
  name: string;
  description: string;
  hoursMin: number;
  hoursLikely: number;
  hoursMax: number;
}

/**
 * Vocabulario cerrado de tipos Postgres. La IA debe elegir de esta lista (se
 * lo pedimos explícitamente en el prompt); lo que no encaje se canonicaliza o
 * cae a "text" en `normalizeColumnType` (ai.ts), nunca se deja como texto
 * libre — es lo que hace que el esquema sea comparable entre tablas.
 */
export type PgColumnType =
  | 'uuid'
  | 'text'
  | 'varchar'
  | 'integer'
  | 'bigint'
  | 'numeric'
  | 'boolean'
  | 'timestamptz'
  | 'date'
  | 'jsonb';

export interface DevTableColumn {
  name: string;
  type: PgColumnType;
  /** Precisión: longitud para varchar, "precision,scale" para numeric. */
  typeDetail?: string;
  primaryKey: boolean;
  nullable: boolean;
  /** Presente sólo en columnas de clave foránea. */
  references?: { table: string; column: string };
  notes?: string;
}

/** Una tabla del modelo de datos, con columnas tipadas. */
export interface DevDataTable {
  name: string;
  description: string;
  columns: DevTableColumn[];
}

/**
 * Documento generado por la IA para tickets de tipo `desarrollo`.
 * Se persiste íntegro en `tickets.spec` (JSONB) y alimenta tanto la vista de
 * detalle como el PDF descargable. NO contiene importes: el presupuesto se
 * calcula al vuelo en `lib/budget.ts` para que cambiar la tarifa no obligue a
 * reanalizar el ticket.
 */
export interface DevelopmentSpec {
  title: string;

  // ── PRD ──
  problem: string;
  goal: string;
  targetUsers: string[];
  scope: string[];
  outOfScope: string[];
  functionalRequirements: DevRequirement[];
  successMetrics: string[];
  assumptions: string[];
  risks: string[];

  // ── TRD ──
  architecture: string;
  components: string[];
  dataModel: string[];
  integrations: string[];
  nonFunctional: string[];
  /**
   * Esquema estructurado de tablas (nombre + columnas), cuando el desarrollo
   * necesita persistir datos nuevos. `undefined`/vacío si no aplica — no todo
   * ticket de desarrollo requiere tablas nuevas. Cuando está presente, la UI y
   * el PDF lo muestran en vez de la lista plana `dataModel`.
   */
  dataTables?: DevDataTable[];
  /**
   * Diagrama de flujo del proceso/funcionalidad, en sintaxis Mermaid
   * (`flowchart TD ...`). `undefined`/vacío si la IA no considera que el
   * ticket amerite uno (p. ej. un cambio de copy o un ajuste visual simple).
   * Se renderiza sólo en el panel web (Mermaid necesita un navegador); el PDF
   * no lo incluye como imagen, ver `lib/pdf.ts`.
   */
  flowDiagram?: string;

  // ── Estimación ──
  modules: DevModule[];
  complexity: 'low' | 'medium' | 'high';
  openQuestions: string[];

  /**
   * Avisos para el revisor humano, generados por nuestro código de validación
   * (no por la IA): campos que la IA no aportó, respuesta truncada, estimaciones
   * ensanchadas, falta de contexto de stack, etc. Este análisis es un borrador
   * inicial que alguien del equipo valida; estos avisos le dicen qué mirar.
   */
  warnings: string[];

  /**
   * Conversación de refinamiento que originó el documento (petición inicial +
   * preguntas de la IA + respuestas del cliente). Se guarda para que el staff
   * vea por qué el documento dice lo que dice. Vacía si no hubo chat.
   */
  conversation?: ChatMessage[];

  source: 'gemini' | 'mock';
}

/** Un turno del chat de refinamiento previo a generar el documento. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Contexto adicional que acompaña a una solicitud de desarrollo. */
export interface DevelopmentBrief {
  /**
   * NO lo aporta el cliente: lo inyecta el servidor desde `lib/project-context`.
   * Los clientes ya son activos, así que su stack lo conocemos nosotros y
   * preguntárselo no tendría sentido.
   */
  stack?: string;
  /**
   * Conversación de refinamiento: la petición inicial del cliente más las
   * preguntas de la IA y sus respuestas. Enriquece el prompt de generación y se
   * persiste en el spec para trazabilidad. `messages[0]` es la petición inicial.
   */
  conversation?: ChatMessage[];
}

export interface BudgetLine {
  module: string;
  hoursMin: number;
  hoursLikely: number;
  hoursMax: number;
  costMin: number;
  costLikely: number;
  costMax: number;
}

export interface Budget {
  currency: string;
  hourlyRate: number;
  contingencyPct: number;
  lines: BudgetLine[];
  hours: { min: number; likely: number; max: number };
  subtotal: { min: number; likely: number; max: number };
  contingency: { min: number; likely: number; max: number };
  total: { min: number; likely: number; max: number };
}

export interface Ticket {
  id: number;
  user_id: number;
  username?: string; // For display
  userProjects?: string[]; // Projects of the user who created the ticket
  project?: string;
  type: TicketType;
  /** Sólo presente en tickets de tipo `desarrollo`. */
  spec?: DevelopmentSpec | null;
  raw_text: string;
  category: string;
  confidence: number;
  issues: string[];
  actions: string[];
  summary: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TicketStatus;
  source: string;
  closed_by_user_id?: number;
  last_updated_by_user_id?: number;
  last_updated_at?: string;
  created_at: string;
}

export interface TicketRow {
  id: number;
  user_id: number;
  username?: string; // Joined field
  userProjects?: string; // Joined field (JSON string)
  project?: string;
  type: string;
  spec?: string; // JSON string
  raw_text: string;
  category: string;
  confidence: number;
  issues: string;
  actions: string;
  summary: string;
  priority: string;
  status: string;
  source: string;
  closed_by_user_id?: number;
  last_updated_by_user_id?: number;
  last_updated_at?: string;
  created_at: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  text: string;
  created_at: string;
  username?: string; // For display
  role?: string;     // For display
}

export interface DashboardStats {
  total: number; // Total tickets created by this user
  projects?: string[]; // Added for profile page to show user's projects
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  closedCount?: number;
  totalClosedByMe?: number; // Tickets closed by this technician
  recentCount: number;
}

/** Filtros del listado paginado de tickets (API / bandeja). */
export interface TicketListFilters {
  userIdScope?: number;
  status: 'all' | 'active' | 'open' | 'waiting_on_client' | 'closed';
  priority: 'all' | 'low' | 'medium' | 'high' | 'critical';
  type: 'all' | TicketType;
  project: string;
  search: string;
}

export interface TicketListPageResult {
  tickets: Ticket[];
  total: number;
  projects: string[];
}
