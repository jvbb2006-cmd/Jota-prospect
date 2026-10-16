/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadStatus =
  | 'novo'
  | 'contatado'
  | 'qualificado'
  | 'proposta'
  | 'negociacao'
  | 'ganho'
  | 'perdido';

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'whatsapp'
  | 'note'
  | 'status_change'
  // Fase 4: Eventos comerciais
  | 'message_prepared'
  | 'message_copied'
  | 'contact_link_opened'
  | 'manual_contact_logged'
  | 'response_received'
  | 'meeting_scheduled'
  | 'opt_out_requested';

export type ActivityOrigin = 'system_observed' | 'manual_user';

export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export type OpportunityStage =
  | 'prospeccao'
  | 'contato'
  | 'qualificacao'
  | 'proposta'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido';

export interface Profile {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  owner_id?: string | null;
  name: string;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  whatsapp_verified: boolean;
  email?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  google_maps_url?: string | null;
  source?: string | null;
  source_place_id?: string | null;
  lead_status: LeadStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  is_demo?: boolean;

  // Fase 4: Políticas de não-contato e cadência
  do_not_contact?: boolean;
  do_not_contact_reason?: string | null;
  cadence_status?: 'none' | 'active' | 'paused' | 'completed' | 'stopped';
  cadence_started_at?: string | null;

  // Fase 5: Analytics e Segmentação
  assigned_to?: string | null;
  campaign?: string | null;
  loss_reason?: string | null;
  
  // Relations when expanded
  contacts?: Contact[];
  tasks?: Task[];
  opportunities?: Opportunity[];
  activities?: Activity[];
}

export interface Contact {
  id: string;
  workspace_id: string;
  company_id: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  is_primary: boolean;
  linkedin_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  workspace_id: string;
  company_id: string;
  user_id?: string | null;
  type: ActivityType;
  title: string;
  description?: string | null;
  performed_at: string;
  created_at: string;
  origin?: ActivityOrigin;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  workspace_id: string;
  company_id?: string | null;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  company_name?: string;
  stage_step?: number;
  is_cadence?: boolean;
}

export interface Opportunity {
  id: string;
  workspace_id: string;
  company_id: string;
  title: string;
  value: number;
  stage: OpportunityStage;
  close_date?: string | null;
  probability: number;
  assigned_to?: string | null;
  campaign?: string | null;
  loss_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type BusinessSearchStatus =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'no_results';

export interface BusinessSearch {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  query: string;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  desired_quantity: number;
  results_count: number;
  status: BusinessSearchStatus;
  provider: string;
  error_message?: string | null;
  created_at: string;
}

export interface BusinessSearchResult {
  id: string;
  search_id: string;
  workspace_id: string;
  provider_place_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  website_url?: string | null;
  google_maps_url?: string | null;
  rating?: number | null;
  user_ratings_total?: number | null;
  category?: string | null;
  is_imported: boolean;
  imported_company_id?: string | null;
  created_at: string;
  alreadyInCrm?: boolean;
}

export interface DeduplicationMatch {
  field: 'name' | 'email' | 'phone' | 'domain';
  matchedCompany: Company;
  similarityScore: number;
}

// ==============================================================================
// Fase 3: Diagnóstico 360° de Presença Digital
// ==============================================================================

export type DiagnosticDimension =
  | 'site_institucional'
  | 'experiencia_movel'
  | 'proposta_valor'
  | 'informacoes_contato'
  | 'seo_tecnico'
  | 'instagram_presenca'
  | 'perfil_google'
  | 'consistencia_canais'
  | 'conversao_agendamento';

export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'failed'
  | 'not_applicable'
  | 'partially_verified';

export type ConfidenceLevel = 'alta' | 'media' | 'baixa';

export type FindingType =
  | 'problema_confirmado'
  | 'oportunidade_provavel'
  | 'ponto_positivo'
  | 'neutro';

export type PotentialImpact = 'alto' | 'medio' | 'baixo';

export type DiagnosticStatus = 'pending' | 'analyzing' | 'completed' | 'partial' | 'failed';

export interface PriorityRecommendation {
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  potentialImpact: PotentialImpact;
  correspondingService: string;
  actionableStep: string;
}

export interface DiagnosticFinding {
  id: string;
  diagnostic_id: string;
  workspace_id: string;
  company_id: string;
  dimension: DiagnosticDimension;
  dimension_label: string;
  status: VerificationStatus;
  score: number | null; // 0-100 or null if unverified
  weight: number; // default dimension weight
  observed_fact: string; // Strictly observed facts with zero hallucination
  evidence_found: string; // Factual proof / technical snippet
  source_url?: string | null;
  observation_date: string;
  confidence_level: ConfidenceLevel;
  finding_type: FindingType;
  potential_impact: PotentialImpact;
  interpretation: string; // Technical & analytical interpretation
  commercial_hypothesis: string; // Commercial sales opportunity hypothesis
  recommendation: string; // Actionable advice
  corresponding_service: string; // Corresponding agency/B2B service
  created_at: string;
}

export interface Diagnostic {
  id: string;
  workspace_id: string;
  company_id: string;
  version: number;
  status: DiagnosticStatus;
  overall_score: number; // 0 - 100
  coverage_percentage: number; // percentage of dimensions verified
  executive_summary: string;
  positive_points: string[];
  confirmed_problems: string[];
  probable_opportunities: string[];
  analysis_limitations: string[];
  priority_recommendations: PriorityRecommendation[];
  next_steps: string[];
  raw_evidence?: Record<string, any>;
  engine?: string; // 'gemini-3.8-flash' | 'deterministic_rules_engine'
  created_at: string;
  created_by?: string | null;
  findings?: DiagnosticFinding[];
  company_name?: string;
}

// ==============================================================================
// Fase 4: Central de Abordagem Comercial
// ==============================================================================

export type OutreachStage = 'etapa_1' | 'etapa_2' | 'etapa_3' | 'etapa_4';

export type OutreachChannel = 'whatsapp' | 'email' | 'linkedin' | 'phone';

export type OutreachMessageState = 'rascunho' | 'editado' | 'aprovado' | 'utilizado';

export interface OutreachMessageVersion {
  version: number;
  content: string;
  channel: OutreachChannel;
  state: OutreachMessageState;
  updated_at: string;
  note?: string;
}

export interface OutreachMessage {
  id: string;
  workspace_id: string;
  company_id: string;
  contact_id?: string | null;
  stage: OutreachStage;
  stage_title: string;
  stage_step: 1 | 2 | 3 | 4;
  channel: OutreachChannel;
  content: string;
  state: OutreachMessageState;
  created_at: string;
  updated_at: string;
  versions: OutreachMessageVersion[];
  diagnostic_id?: string | null;
  diagnostic_score?: number | null;
  tailored_points?: string[];
}

export interface CadenceStepConfig {
  dayOffset: number; // 0, 2, 4, 8, 12
  stage: OutreachStage;
  stageStep: 1 | 2 | 3 | 4 | 5;
  title: string;
  channel: OutreachChannel;
  objective: string;
}

export interface WhatsAppValidationResult {
  isValid: boolean;
  e164: string | null;
  formattedDisplay: string;
  rawInput: string;
  country: string;
  isAmbiguous: boolean;
  errorMessage?: string;
}

