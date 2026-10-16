/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Company,
  Contact,
  Task,
  Opportunity,
  Activity,
  ActivityType,
  Profile,
  LeadStatus,
  TaskStatus,
  TaskPriority,
  DeduplicationMatch,
  BusinessSearch,
  BusinessSearchResult,
  Diagnostic,
  DiagnosticFinding,
  ActivityOrigin,
  OutreachMessage,
  OutreachStage,
  OutreachChannel,
  OutreachMessageState,
  OutreachMessageVersion,
} from '../types/database';
import { NormalizedPlace, SearchParams, ProviderResponse } from './providers/types';
import {
  INITIAL_DEMO_COMPANIES,
  INITIAL_DEMO_CONTACTS,
  INITIAL_DEMO_TASKS,
  INITIAL_DEMO_OPPORTUNITIES,
  INITIAL_DEMO_ACTIVITIES,
  INITIAL_DEMO_DIAGNOSTICS,
  INITIAL_DEMO_FINDINGS,
  DEMO_WORKSPACE_ID,
} from './mockData';
import { getSupabaseClient } from '../lib/supabase';
import { CADENCE_SCHEDULE, generateDeterministicOutreach } from './outreachEngine';
import {
  AnalyticsFilters,
  AnalyticsReport,
  computeAnalyticsReport,
} from './analyticsService';

const DB_NAME = 'jota_prospect_v1_db';
const DB_VERSION = 4;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  workspace_id: string;
  avatar_url?: string;
  created_at: string;
}

// Generate standard UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('companies')) {
        const store = db.createObjectStore('companies', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('lead_status', 'lead_status', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('source_place_id', 'source_place_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('contacts')) {
        const store = db.createObjectStore('contacts', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('activities')) {
        const store = db.createObjectStore('activities', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('opportunities')) {
        const store = db.createObjectStore('opportunities', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('auth_users')) {
        const store = db.createObjectStore('auth_users', { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: true });
      }

      if (!db.objectStoreNames.contains('business_searches')) {
        const store = db.createObjectStore('business_searches', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('business_search_results')) {
        const store = db.createObjectStore('business_search_results', { keyPath: 'id' });
        store.createIndex('search_id', 'search_id', { unique: false });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('provider_place_id', 'provider_place_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('diagnostics')) {
        const store = db.createObjectStore('diagnostics', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('diagnostic_findings')) {
        const store = db.createObjectStore('diagnostic_findings', { keyPath: 'id' });
        store.createIndex('diagnostic_id', 'diagnostic_id', { unique: false });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
        store.createIndex('dimension', 'dimension', { unique: false });
      }

      if (!db.objectStoreNames.contains('outreach_messages')) {
        const store = db.createObjectStore('outreach_messages', { keyPath: 'id' });
        store.createIndex('workspace_id', 'workspace_id', { unique: false });
        store.createIndex('company_id', 'company_id', { unique: false });
        store.createIndex('stage', 'stage', { unique: false });
      }
    };
  });
}

// In-memory store fallback for server-side / Node.js test execution
const inMemoryStores = new Map<string, Map<string, any>>();

function getMemoryStore(storeName: string): Map<string, any> {
  if (!inMemoryStores.has(storeName)) {
    inMemoryStores.set(storeName, new Map());
  }
  return inMemoryStores.get(storeName)!;
}

// Transaction Helpers
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  if (typeof indexedDB === 'undefined') {
    return Array.from(getMemoryStore(storeName).values()) as T[];
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function getFromStore<T>(storeName: string, id: string): Promise<T | null> {
  if (typeof indexedDB === 'undefined') {
    return (getMemoryStore(storeName).get(id) as T) || null;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

async function putToStore<T>(storeName: string, item: T): Promise<T> {
  if (typeof indexedDB === 'undefined') {
    const key = (item as any).id || (item as any).stage_step || (item as any).stage || generateUUID();
    getMemoryStore(storeName).set(String(key), item);
    return item;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    getMemoryStore(storeName).delete(id);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Clean text for deduplication comparison
export function normalizeEntityString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\[demonstracao\]|\[demo\]/gi, '') // remove demo tags
    .replace(/\b(ltda|s\.a\.|sa|eireli|me|epp)\b/gi, '') // corporate suffixes
    .replace(/[^a-z0-9]/g, '') // keep alphanum only
    .trim();
}

export function extractDomain(urlOrEmail: string): string {
  if (!urlOrEmail) return '';
  try {
    let raw = urlOrEmail.toLowerCase().trim();
    if (raw.includes('@')) {
      raw = raw.split('@')[1];
    } else {
      raw = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
    return raw;
  } catch {
    return '';
  }
}

// REPOSITORY CLASS
export class ProspectRepository {
  private static instance: ProspectRepository;
  private initialized = false;

  private constructor() {}

  public static getInstance(): ProspectRepository {
    if (!ProspectRepository.instance) {
      ProspectRepository.instance = new ProspectRepository();
    }
    return ProspectRepository.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if initial demo companies exist in IndexedDB
    const existingCompanies = await getAllFromStore<Company>('companies');
    if (existingCompanies.length === 0) {
      // Seed with initial demonstrative companies clearly marked
      for (const comp of INITIAL_DEMO_COMPANIES) {
        await putToStore('companies', comp);
      }
      for (const ct of INITIAL_DEMO_CONTACTS) {
        await putToStore('contacts', ct);
      }
      for (const t of INITIAL_DEMO_TASKS) {
        await putToStore('tasks', t);
      }
      for (const op of INITIAL_DEMO_OPPORTUNITIES) {
        await putToStore('opportunities', op);
      }
      for (const a of INITIAL_DEMO_ACTIVITIES) {
        await putToStore('activities', a);
      }
    }

    // Seed initial demo diagnostics if empty
    const existingDiags = await getAllFromStore<Diagnostic>('diagnostics');
    if (existingDiags.length === 0) {
      for (const d of INITIAL_DEMO_DIAGNOSTICS) {
        await putToStore('diagnostics', d);
      }
      for (const f of INITIAL_DEMO_FINDINGS) {
        await putToStore('diagnostic_findings', f);
      }
    }

    // Seed initial demo outreach messages for demo company 1 if empty
    const existingOutreach = await getAllFromStore<OutreachMessage>('outreach_messages');
    if (existingOutreach.length === 0) {
      const demoComp1 = INITIAL_DEMO_COMPANIES[0];
      const demoContact1 = INITIAL_DEMO_CONTACTS[0];
      const demoDiag1 = INITIAL_DEMO_DIAGNOSTICS[0];
      const initialMsgs = generateDeterministicOutreach(demoComp1, demoContact1, demoDiag1, 'whatsapp');
      for (const msg of initialMsgs) {
        await putToStore('outreach_messages', msg);
      }
    }

    // Ensure default demo user exists for local test
    const existingUsers = await getAllFromStore<AuthUser>('auth_users');
    if (existingUsers.length === 0) {
      const defaultUser: AuthUser = {
        id: 'u-default-001',
        email: 'gestor@jota.com.br',
        full_name: 'Gestor Comercial',
        role: 'Admin',
        workspace_id: DEMO_WORKSPACE_ID,
        created_at: new Date().toISOString(),
      };
      await putToStore('auth_users', defaultUser);
    }

    this.initialized = true;
  }

  // --- DEDUPLICATION DETECTION ---
  public async checkDuplicates(
    workspaceId: string,
    data: { name: string; email?: string; phone?: string; website_url?: string },
    excludeCompanyId?: string
  ): Promise<DeduplicationMatch[]> {
    const companies = await this.getCompanies(workspaceId);
    const matches: DeduplicationMatch[] = [];

    const normName = normalizeEntityString(data.name);
    const normDomain = extractDomain(data.website_url || data.email || '');
    const cleanPhone = (data.phone || '').replace(/\D/g, '');

    for (const c of companies) {
      if (excludeCompanyId && c.id === excludeCompanyId) continue;

      const compNormName = normalizeEntityString(c.name);
      if (normName && compNormName && (compNormName.includes(normName) || normName.includes(compNormName))) {
        matches.push({
          field: 'name',
          matchedCompany: c,
          similarityScore: compNormName === normName ? 1.0 : 0.85,
        });
        continue;
      }

      if (normDomain && (extractDomain(c.website_url || '') === normDomain || extractDomain(c.email || '') === normDomain)) {
        matches.push({
          field: 'domain',
          matchedCompany: c,
          similarityScore: 0.95,
        });
        continue;
      }

      const compPhone = (c.phone || c.whatsapp_number || '').replace(/\D/g, '');
      if (cleanPhone.length >= 8 && compPhone.length >= 8 && compPhone.endsWith(cleanPhone.slice(-8))) {
        matches.push({
          field: 'phone',
          matchedCompany: c,
          similarityScore: 0.9,
        });
      }
    }

    return matches;
  }

  // --- COMPANIES CRUD (WORKSPACE ISOLATED) ---
  public async getCompanies(
    workspaceId: string,
    filters?: {
      search?: string;
      category?: string;
      status?: LeadStatus;
      city?: string;
      state?: string;
      onlyDemo?: boolean;
    }
  ): Promise<Company[]> {
    await this.initialize();
    
    // First try remote Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('companies').select('*');
        if (filters?.status) {
          query = query.eq('lead_status', filters.status);
        }
        if (filters?.category) {
          query = query.eq('category', filters.category);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data as Company[];
        }
      } catch (err) {
        console.warn('[JOTA Supabase] Read fallback to local DB:', err);
      }
    }

    // Local IndexedDB with strict workspace filtering
    const all = await getAllFromStore<Company>('companies');
    let results = all.filter((c) => c.workspace_id === workspaceId);

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }

    if (filters?.category && filters.category !== 'all') {
      results = results.filter((c) => c.category === filters.category);
    }

    if (filters?.status && filters.status !== ('all' as any)) {
      results = results.filter((c) => c.lead_status === filters.status);
    }

    if (filters?.city && filters.city !== 'all') {
      results = results.filter((c) => c.city === filters.city);
    }

    if (filters?.state && filters.state !== 'all') {
      results = results.filter((c) => c.state === filters.state);
    }

    // Sort by latest updated
    return results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public async getCompanyById(workspaceId: string, companyId: string): Promise<Company | null> {
    await this.initialize();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();
        if (!error && data) {
          const comp = data as Company;
          // load related items
          const contacts = await this.getContacts(workspaceId, companyId);
          const tasks = await this.getTasks(workspaceId, { companyId });
          const opportunities = await this.getOpportunities(workspaceId, companyId);
          const activities = await this.getActivities(workspaceId, companyId);
          return { ...comp, contacts, tasks, opportunities, activities };
        }
      } catch (err) {
        console.warn('[JOTA Supabase] Company fetch fallback:', err);
      }
    }

    const company = await getFromStore<Company>('companies', companyId);
    if (!company) return null;

    // Strict workspace security check
    if (company.workspace_id !== workspaceId) {
      console.warn('[RLS Violation] Attempted access to company from another workspace');
      return null;
    }

    // Populate relations
    const contacts = await this.getContacts(workspaceId, companyId);
    const tasks = await this.getTasks(workspaceId, { companyId });
    const opportunities = await this.getOpportunities(workspaceId, companyId);
    const activities = await this.getActivities(workspaceId, companyId);

    return {
      ...company,
      contacts,
      tasks,
      opportunities,
      activities,
    };
  }

  public async createCompany(
    workspaceId: string,
    payload: Omit<Company, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>,
    ownerId?: string
  ): Promise<Company> {
    await this.initialize();
    const now = new Date().toISOString();
    const newCompany: Company = {
      ...payload,
      id: generateUUID(),
      workspace_id: workspaceId,
      owner_id: ownerId || null,
      country: payload.country || 'Brasil',
      lead_status: payload.lead_status || 'novo',
      whatsapp_verified: !!payload.whatsapp_verified,
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('companies').insert([newCompany]);
        if (error) console.error('[JOTA Supabase] insert company error:', error);
      } catch (err) {
        console.warn('[JOTA Supabase] insert error:', err);
      }
    }

    await putToStore('companies', newCompany);

    // Automatically log creation activity
    await this.createActivity(workspaceId, {
      company_id: newCompany.id,
      user_id: ownerId || null,
      type: 'note',
      title: 'Empresa cadastrada no sistema',
      description: `Origem: ${newCompany.source || 'Manual'}. Estágio inicial: ${newCompany.lead_status}.`,
      performed_at: now,
    });

    return newCompany;
  }

  public async updateCompany(
    workspaceId: string,
    companyId: string,
    partial: Partial<Company>
  ): Promise<Company | null> {
    await this.initialize();
    const existing = await getFromStore<Company>('companies', companyId);
    if (!existing || existing.workspace_id !== workspaceId) {
      return null;
    }

    const previousStatus = existing.lead_status;
    const now = new Date().toISOString();
    const updated: Company = {
      ...existing,
      ...partial,
      id: companyId,
      workspace_id: workspaceId,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('companies').update(updated).eq('id', companyId);
      } catch (err) {
        console.warn('[JOTA Supabase] update company error:', err);
      }
    }

    await putToStore('companies', updated);

    // If status changed, log activity
    if (partial.lead_status && partial.lead_status !== previousStatus) {
      await this.createActivity(workspaceId, {
        company_id: companyId,
        type: 'status_change',
        title: `Estágio alterado para "${partial.lead_status}"`,
        description: `O lead moveu de ${previousStatus} para ${partial.lead_status}.`,
        performed_at: now,
      });
    }

    return updated;
  }

  public async deleteCompany(workspaceId: string, companyId: string): Promise<boolean> {
    await this.initialize();
    const existing = await getFromStore<Company>('companies', companyId);
    if (!existing || existing.workspace_id !== workspaceId) {
      return false;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('companies').delete().eq('id', companyId);
      } catch (err) {
        console.warn('[JOTA Supabase] delete company error:', err);
      }
    }

    // Cascade delete relations from IndexedDB
    await deleteFromStore('companies', companyId);

    const allContacts = await getAllFromStore<Contact>('contacts');
    for (const c of allContacts) {
      if (c.company_id === companyId) {
        await deleteFromStore('contacts', c.id);
      }
    }

    const allTasks = await getAllFromStore<Task>('tasks');
    for (const t of allTasks) {
      if (t.company_id === companyId) {
        await deleteFromStore('tasks', t.id);
      }
    }

    const allOpp = await getAllFromStore<Opportunity>('opportunities');
    for (const o of allOpp) {
      if (o.company_id === companyId) {
        await deleteFromStore('opportunities', o.id);
      }
    }

    const allAct = await getAllFromStore<Activity>('activities');
    for (const a of allAct) {
      if (a.company_id === companyId) {
        await deleteFromStore('activities', a.id);
      }
    }

    return true;
  }

  // --- CONTACTS CRUD ---
  public async getContacts(workspaceId: string, companyId: string): Promise<Contact[]> {
    await this.initialize();
    const all = await getAllFromStore<Contact>('contacts');
    return all.filter((c) => c.workspace_id === workspaceId && c.company_id === companyId);
  }

  public async createContact(
    workspaceId: string,
    data: Omit<Contact, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<Contact> {
    await this.initialize();
    const now = new Date().toISOString();
    const newContact: Contact = {
      ...data,
      id: generateUUID(),
      workspace_id: workspaceId,
      is_primary: !!data.is_primary,
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('contacts').insert([newContact]);
      } catch (err) {
        console.warn('[JOTA Supabase] insert contact error:', err);
      }
    }

    await putToStore('contacts', newContact);
    return newContact;
  }

  public async deleteContact(workspaceId: string, contactId: string): Promise<boolean> {
    await this.initialize();
    const ct = await getFromStore<Contact>('contacts', contactId);
    if (!ct || ct.workspace_id !== workspaceId) return false;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('contacts').delete().eq('id', contactId);
      } catch (err) {
        console.warn('[JOTA Supabase] delete contact error:', err);
      }
    }

    await deleteFromStore('contacts', contactId);
    return true;
  }

  // --- ACTIVITIES ---
  public async getActivities(workspaceId: string, companyId?: string): Promise<Activity[]> {
    await this.initialize();
    const all = await getAllFromStore<Activity>('activities');
    return all
      .filter((a) => a.workspace_id === workspaceId && (!companyId || a.company_id === companyId))
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }

  public async createActivity(
    workspaceId: string,
    data: Omit<Activity, 'id' | 'workspace_id' | 'created_at'>
  ): Promise<Activity> {
    await this.initialize();
    const now = new Date().toISOString();
    const newActivity: Activity = {
      ...data,
      id: generateUUID(),
      workspace_id: workspaceId,
      performed_at: data.performed_at || now,
      created_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('activities').insert([newActivity]);
      } catch (err) {
        console.warn('[JOTA Supabase] insert activity error:', err);
      }
    }

    await putToStore('activities', newActivity);
    return newActivity;
  }

  // --- TASKS ---
  public async getTasks(
    workspaceId: string,
    filters?: { companyId?: string; status?: TaskStatus }
  ): Promise<Task[]> {
    await this.initialize();
    const all = await getAllFromStore<Task>('tasks');
    let results = all.filter((t) => t.workspace_id === workspaceId);

    if (filters?.companyId) {
      results = results.filter((t) => t.company_id === filters.companyId);
    }
    if (filters?.status) {
      results = results.filter((t) => t.status === filters.status);
    }

    return results.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }

  public async createTask(
    workspaceId: string,
    data: Omit<Task, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<Task> {
    await this.initialize();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...data,
      id: generateUUID(),
      workspace_id: workspaceId,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tasks').insert([newTask]);
      } catch (err) {
        console.warn('[JOTA Supabase] insert task error:', err);
      }
    }

    await putToStore('tasks', newTask);
    return newTask;
  }

  public async updateTaskStatus(
    workspaceId: string,
    taskId: string,
    status: TaskStatus
  ): Promise<Task | null> {
    await this.initialize();
    const task = await getFromStore<Task>('tasks', taskId);
    if (!task || task.workspace_id !== workspaceId) return null;

    const updated: Task = {
      ...task,
      status,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tasks').update({ status, updated_at: updated.updated_at }).eq('id', taskId);
      } catch (err) {
        console.warn('[JOTA Supabase] update task error:', err);
      }
    }

    await putToStore('tasks', updated);
    return updated;
  }

  public async updateTask(
    workspaceId: string,
    taskId: string,
    data: Partial<Task>
  ): Promise<Task | null> {
    await this.initialize();
    const task = await getFromStore<Task>('tasks', taskId);
    if (!task || task.workspace_id !== workspaceId) return null;

    const updated: Task = {
      ...task,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tasks').update({ ...data, updated_at: updated.updated_at }).eq('id', taskId);
      } catch (err) {
        console.warn('[JOTA Supabase] update task error:', err);
      }
    }

    await putToStore('tasks', updated);
    return updated;
  }

  public async deleteTask(workspaceId: string, taskId: string): Promise<boolean> {
    await this.initialize();
    const task = await getFromStore<Task>('tasks', taskId);
    if (!task || task.workspace_id !== workspaceId) return false;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('tasks').delete().eq('id', taskId);
      } catch (err) {
        console.warn('[JOTA Supabase] delete task error:', err);
      }
    }

    await deleteFromStore('tasks', taskId);
    return true;
  }

  // --- OPPORTUNITIES ---
  public async getOpportunities(workspaceId: string, companyId?: string): Promise<Opportunity[]> {
    await this.initialize();
    const all = await getAllFromStore<Opportunity>('opportunities');
    let results = all.filter((o) => o.workspace_id === workspaceId);
    if (companyId) {
      results = results.filter((o) => o.company_id === companyId);
    }
    return results;
  }

  public async createOpportunity(
    workspaceId: string,
    data: Omit<Opportunity, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<Opportunity> {
    await this.initialize();
    const now = new Date().toISOString();
    const newOpp: Opportunity = {
      ...data,
      id: generateUUID(),
      workspace_id: workspaceId,
      value: Number(data.value) || 0,
      probability: Number(data.probability) || 50,
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('opportunities').insert([newOpp]);
      } catch (err) {
        console.warn('[JOTA Supabase] insert opp error:', err);
      }
    }

    await putToStore('opportunities', newOpp);
    return newOpp;
  }

  public async deleteOpportunity(workspaceId: string, oppId: string): Promise<boolean> {
    await this.initialize();
    const opp = await getFromStore<Opportunity>('opportunities', oppId);
    if (!opp || opp.workspace_id !== workspaceId) return false;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('opportunities').delete().eq('id', oppId);
      } catch (err) {
        console.warn('[JOTA Supabase] delete opp error:', err);
      }
    }

    await deleteFromStore('opportunities', oppId);
    return true;
  }

  // --- AGGREGATE METRICS ---
  public async getMetrics(workspaceId: string) {
    const companies = await this.getCompanies(workspaceId);
    const opportunities = await this.getOpportunities(workspaceId);
    const tasks = await this.getTasks(workspaceId);

    const totalLeads = companies.length;
    const qualifiedLeads = companies.filter((c) => ['qualificado', 'proposta', 'negociacao', 'ganho'].includes(c.lead_status)).length;
    const wonLeads = companies.filter((c) => c.lead_status === 'ganho').length;
    const pipelineValue = opportunities.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const whatsappVerifiedCount = companies.filter((c) => c.whatsapp_verified).length;

    // By Stage count
    const stageCounts: Record<LeadStatus, number> = {
      novo: 0,
      contatado: 0,
      qualificado: 0,
      proposta: 0,
      negociacao: 0,
      ganho: 0,
      perdido: 0,
    };

    for (const c of companies) {
      if (stageCounts[c.lead_status] !== undefined) {
        stageCounts[c.lead_status]++;
      }
    }

    return {
      totalLeads,
      qualifiedLeads,
      wonLeads,
      pipelineValue,
      pendingTasks,
      whatsappVerifiedCount,
      stageCounts,
    };
  }

  /**
   * Fase 5: Gera o relatório analítico consolidado e auditável com base em dados reais do workspace.
   */
  public async getAnalyticsReport(
    workspaceId: string,
    filters: AnalyticsFilters = { period: 'all' }
  ): Promise<AnalyticsReport> {
    await this.initialize();
    const [companies, opportunities, activities, diagnostics, tasks] = await Promise.all([
      this.getCompanies(workspaceId),
      this.getOpportunities(workspaceId),
      this.getActivities(workspaceId),
      this.getAllDiagnostics(workspaceId),
      this.getTasks(workspaceId),
    ]);
    return computeAnalyticsReport(companies, opportunities, activities, diagnostics, tasks, filters);
  }

  // --- AUTHENTICATION & WORKSPACE USER MANAGEMENT ---
  public async registerUser(email: string, password: string, fullName: string): Promise<AuthUser> {
    await this.initialize();
    const users = await getAllFromStore<AuthUser>('auth_users');
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    // Attempt Supabase Auth signup
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'Admin' },
          },
        });
        if (error) console.warn('[JOTA Supabase] Auth signUp error:', error.message);
      } catch (err) {
        console.warn('[JOTA Supabase] Auth signup failed:', err);
      }
    }

    const newUser: AuthUser = {
      id: generateUUID(),
      email: email.trim(),
      full_name: fullName.trim(),
      role: 'Admin',
      workspace_id: generateUUID(), // Unique isolated workspace for this user
      created_at: new Date().toISOString(),
    };

    await putToStore('auth_users', newUser);
    return newUser;
  }

  public async authenticate(email: string, password: string): Promise<AuthUser> {
    await this.initialize();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!error && data?.user) {
          const profile = await getFromStore<AuthUser>('auth_users', data.user.id);
          if (profile) return profile;
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: (data.user.user_metadata?.full_name as string) || email.split('@')[0],
            role: 'Admin',
            workspace_id: (data.user.user_metadata?.workspace_id as string) || generateUUID(),
            created_at: new Date().toISOString(),
          };
          await putToStore('auth_users', user);
          return user;
        }
      } catch (err) {
        console.warn('[JOTA Supabase] signIn fallback:', err);
      }
    }

    const users = await getAllFromStore<AuthUser>('auth_users');
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For convenience during testing: if logging in with demo account, create or authenticate
      if (email.toLowerCase().includes('demo') || email.toLowerCase().includes('jota')) {
        const demoUser: AuthUser = {
          id: generateUUID(),
          email: email.trim(),
          full_name: 'Usuário Gestor',
          role: 'Admin',
          workspace_id: DEMO_WORKSPACE_ID,
          created_at: new Date().toISOString(),
        };
        await putToStore('auth_users', demoUser);
        return demoUser;
      }
      throw new Error('E-mail ou senha inválidos.');
    }

    return user;
  }

  public async requestPasswordRecovery(email: string): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email);
      } catch (err) {
        console.warn('[JOTA Supabase] resetPassword error:', err);
      }
    }
    return {
      success: true,
      message: `Instruções de recuperação de senha enviadas para ${email}. Verifique sua caixa de entrada.`,
    };
  }

  // --- BUSINESS SEARCHES & PLACES IMPORT (FASE 2) ---
  public async saveSearchExecution(
    workspaceId: string,
    params: SearchParams,
    response: ProviderResponse,
    userId?: string
  ): Promise<BusinessSearch> {
    await this.initialize();
    const now = new Date().toISOString();
    const searchRecord: BusinessSearch = {
      id: generateUUID(),
      workspace_id: workspaceId,
      user_id: userId || null,
      query: params.query,
      segment: params.segment || null,
      city: params.city || null,
      state: params.state || null,
      country: params.country || 'Brasil',
      desired_quantity: params.desiredQuantity,
      results_count: response.items.length,
      status: response.status,
      provider: response.provider || 'google_places_new',
      error_message: response.errorMessage || null,
      created_at: now,
    };

    // Store search execution in IndexedDB
    await putToStore('business_searches', searchRecord);

    // Store search results
    for (const item of response.items) {
      const resultRecord: BusinessSearchResult = {
        id: generateUUID(),
        search_id: searchRecord.id,
        workspace_id: workspaceId,
        provider_place_id: item.providerPlaceId,
        name: item.name,
        address: item.address,
        city: item.city,
        state: item.state,
        country: item.country,
        phone: item.phone || null,
        website_url: item.websiteUrl || null,
        google_maps_url: item.googleMapsUrl || null,
        rating: item.rating || null,
        user_ratings_total: item.userRatingsTotal || 0,
        category: item.category || params.segment || null,
        is_imported: false,
        created_at: now,
      };
      await putToStore('business_search_results', resultRecord);
    }

    // Attempt Supabase insert if available
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('business_searches').insert([searchRecord]);
      } catch (err) {
        console.warn('[JOTA Supabase] save search execution fallback:', err);
      }
    }

    return searchRecord;
  }

  public async getSearchHistory(workspaceId: string): Promise<BusinessSearch[]> {
    await this.initialize();
    const all = await getAllFromStore<BusinessSearch>('business_searches');
    return all
      .filter((s) => s.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getSearchResults(workspaceId: string, searchId: string): Promise<BusinessSearchResult[]> {
    await this.initialize();
    const all = await getAllFromStore<BusinessSearchResult>('business_search_results');
    return all.filter((r) => r.workspace_id === workspaceId && r.search_id === searchId);
  }

  public async markPlacesExistingInCrm(workspaceId: string, items: NormalizedPlace[]): Promise<NormalizedPlace[]> {
    const existingCompanies = await this.getCompanies(workspaceId);
    const existingPlaceIds = new Set(existingCompanies.map((c) => c.source_place_id).filter(Boolean));
    const existingNormNames = new Set(existingCompanies.map((c) => normalizeEntityString(c.name)));

    return items.map((item) => {
      const matchPlaceId = item.providerPlaceId && existingPlaceIds.has(item.providerPlaceId);
      const matchName = normalizeEntityString(item.name) && existingNormNames.has(normalizeEntityString(item.name));
      return {
        ...item,
        alreadyInCrm: Boolean(matchPlaceId || matchName),
      };
    });
  }

  public async importPlacesToCrm(
    workspaceId: string,
    places: NormalizedPlace[],
    searchId?: string,
    ownerId?: string
  ): Promise<{ importedCount: number; skippedCount: number; importedCompanies: Company[] }> {
    await this.initialize();
    const existingCompanies = await this.getCompanies(workspaceId);
    const existingPlaceIds = new Set(existingCompanies.map((c) => c.source_place_id).filter(Boolean));
    const existingNormNames = new Set(existingCompanies.map((c) => normalizeEntityString(c.name)));

    let importedCount = 0;
    let skippedCount = 0;
    const importedCompanies: Company[] = [];

    for (const place of places) {
      // Deduplication check: if place_id matches or normalized name matches existing company in this workspace, skip
      if (
        (place.providerPlaceId && existingPlaceIds.has(place.providerPlaceId)) ||
        existingNormNames.has(normalizeEntityString(place.name))
      ) {
        skippedCount++;
        continue;
      }

      // Create company record with provider place ID and metadata
      const newCompany = await this.createCompany(
        workspaceId,
        {
          name: place.name,
          category: place.category || 'Empresa',
          address: place.address || null,
          city: place.city || null,
          state: place.state || null,
          country: place.country || 'Brasil',
          phone: place.phone || null,
          whatsapp_number: place.phone || null,
          whatsapp_verified: false,
          website_url: place.websiteUrl || null,
          google_maps_url: place.googleMapsUrl || (place.providerPlaceId ? `https://www.google.com/maps/place/?q=place_id:${place.providerPlaceId}` : null),
          source: 'Google Places (New) Text Search',
          source_place_id: place.providerPlaceId || null,
          lead_status: 'novo',
          notes: place.rating
            ? `Importado via Google Places API (New). Avaliação: ${place.rating} estrelas (${place.userRatingsTotal || 0} avaliações no Google Maps).`
            : 'Importado via busca de empresas Google Places API (New).',
        },
        ownerId
      );

      // If phone number exists, add as primary contact
      if (place.phone) {
        await this.createContact(workspaceId, {
          company_id: newCompany.id,
          name: `Contato Principal (${place.name})`,
          role: 'Recepção / Comercial',
          phone: place.phone,
          whatsapp_number: place.phone,
          is_primary: true,
        });
      }

      // Mark result as imported in business_search_results store
      if (searchId) {
        const results = await this.getSearchResults(workspaceId, searchId);
        const matchResult = results.find((r) => r.provider_place_id === place.providerPlaceId);
        if (matchResult) {
          matchResult.is_imported = true;
          matchResult.imported_company_id = newCompany.id;
          await putToStore('business_search_results', matchResult);
        }
      }

      existingPlaceIds.add(place.providerPlaceId);
      existingNormNames.add(normalizeEntityString(place.name));
      importedCompanies.push(newCompany);
      importedCount++;
    }

    return { importedCount, skippedCount, importedCompanies };
  }

  // ==============================================================================
  // --- FASE 3: DIAGNÓSTICO 360° REPOSITORY METHODS ---
  // ==============================================================================

  /**
   * Salva um diagnóstico e seus findings, incrementando automaticamente a versão da empresa
   * para manter o histórico evolutivo sem apagar versões anteriores.
   */
  public async saveDiagnostic(
    workspaceId: string,
    diagData: Partial<Diagnostic>,
    findings: Partial<DiagnosticFinding>[]
  ): Promise<Diagnostic> {
    await this.initialize();

    if (!diagData.company_id) {
      throw new Error('company_id é obrigatório para registrar diagnóstico');
    }

    // Calcular próxima versão da empresa
    const existingForCompany = await this.getDiagnosticsByCompany(workspaceId, diagData.company_id);
    const highestVersion = existingForCompany.reduce((max, d) => Math.max(max, d.version || 1), 0);
    const nextVersion = diagData.version || highestVersion + 1;

    const diagId = diagData.id || generateUUID();
    const now = new Date().toISOString();

    const diagnostic: Diagnostic = {
      id: diagId,
      workspace_id: workspaceId,
      company_id: diagData.company_id,
      company_name: diagData.company_name,
      version: nextVersion,
      status: diagData.status || 'completed',
      overall_score: typeof diagData.overall_score === 'number' ? diagData.overall_score : 50,
      coverage_percentage: typeof diagData.coverage_percentage === 'number' ? diagData.coverage_percentage : 100,
      executive_summary: diagData.executive_summary || 'Diagnóstico concluído.',
      positive_points: diagData.positive_points || [],
      confirmed_problems: diagData.confirmed_problems || [],
      probable_opportunities: diagData.probable_opportunities || [],
      analysis_limitations: diagData.analysis_limitations || [],
      priority_recommendations: diagData.priority_recommendations || [],
      next_steps: diagData.next_steps || [],
      raw_evidence: diagData.raw_evidence || {},
      engine: diagData.engine || 'deterministic_rules_engine',
      created_by: diagData.created_by || null,
      created_at: diagData.created_at || now,
    };

    // Salvar diagnóstico no store
    await putToStore('diagnostics', diagnostic);

    // Salvar findings vinculados
    const savedFindings: DiagnosticFinding[] = [];
    for (const f of findings) {
      const findingId = f.id || generateUUID();
      const findingRecord: DiagnosticFinding = {
        id: findingId,
        diagnostic_id: diagId,
        workspace_id: workspaceId,
        company_id: diagData.company_id,
        dimension: f.dimension || 'site_institucional',
        dimension_label: f.dimension_label || 'Dimensão',
        status: f.status || 'verified',
        score: typeof f.score === 'number' ? f.score : null,
        weight: typeof f.weight === 'number' ? f.weight : 10,
        observed_fact: f.observed_fact || 'Fato observado.',
        evidence_found: f.evidence_found || 'Evidência registrada.',
        source_url: f.source_url || null,
        observation_date: f.observation_date || now,
        confidence_level: f.confidence_level || 'alta',
        finding_type: f.finding_type || 'neutro',
        potential_impact: f.potential_impact || 'medio',
        interpretation: f.interpretation || 'Interpretação analítica.',
        commercial_hypothesis: f.commercial_hypothesis || 'Hipótese comercial.',
        recommendation: f.recommendation || 'Recomendação técnica.',
        corresponding_service: f.corresponding_service || 'Consultoria B2B',
        created_at: f.created_at || now,
      };

      await putToStore('diagnostic_findings', findingRecord);
      savedFindings.push(findingRecord);
    }

    // Mirror to Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('diagnostics').upsert({
          id: diagnostic.id,
          workspace_id: diagnostic.workspace_id,
          company_id: diagnostic.company_id,
          version: diagnostic.version,
          status: diagnostic.status,
          overall_score: diagnostic.overall_score,
          coverage_percentage: diagnostic.coverage_percentage,
          executive_summary: diagnostic.executive_summary,
          positive_points: diagnostic.positive_points,
          confirmed_problems: diagnostic.confirmed_problems,
          probable_opportunities: diagnostic.probable_opportunities,
          analysis_limitations: diagnostic.analysis_limitations,
          priority_recommendations: diagnostic.priority_recommendations,
          next_steps: diagnostic.next_steps,
          raw_evidence: diagnostic.raw_evidence,
          engine: diagnostic.engine,
          created_at: diagnostic.created_at,
        });

        for (const sf of savedFindings) {
          await supabase.from('diagnostic_findings').upsert({
            id: sf.id,
            diagnostic_id: sf.diagnostic_id,
            workspace_id: sf.workspace_id,
            company_id: sf.company_id,
            dimension: sf.dimension,
            dimension_label: sf.dimension_label,
            status: sf.status,
            score: sf.score,
            weight: sf.weight,
            observed_fact: sf.observed_fact,
            evidence_found: sf.evidence_found,
            source_url: sf.source_url,
            observation_date: sf.observation_date,
            confidence_level: sf.confidence_level,
            finding_type: sf.finding_type,
            potential_impact: sf.potential_impact,
            interpretation: sf.interpretation,
            commercial_hypothesis: sf.commercial_hypothesis,
            recommendation: sf.recommendation,
            corresponding_service: sf.corresponding_service,
            created_at: sf.created_at,
          });
        }
      } catch (err) {
        console.warn('[JOTA Supabase] Diagnostic sync error:', err);
      }
    }

    diagnostic.findings = savedFindings;
    return diagnostic;
  }

  /**
   * Retorna todo o histórico de diagnósticos de uma empresa (ordenado por versão decrescente).
   */
  public async getDiagnosticsByCompany(workspaceId: string, companyId: string): Promise<Diagnostic[]> {
    await this.initialize();
    const all = await getAllFromStore<Diagnostic>('diagnostics');
    const filtered = all
      .filter((d) => d.workspace_id === workspaceId && d.company_id === companyId)
      .sort((a, b) => (b.version || 0) - (a.version || 0));

    // Carregar findings para cada diagnóstico
    const allFindings = await getAllFromStore<DiagnosticFinding>('diagnostic_findings');
    for (const diag of filtered) {
      diag.findings = allFindings.filter((f) => f.diagnostic_id === diag.id);
    }

    return filtered;
  }

  /**
   * Retorna um diagnóstico específico por ID com seus findings.
   */
  public async getDiagnosticById(workspaceId: string, diagnosticId: string): Promise<Diagnostic | null> {
    await this.initialize();
    const diag = await getFromStore<Diagnostic>('diagnostics', diagnosticId);
    if (!diag || diag.workspace_id !== workspaceId) return null;

    const allFindings = await getAllFromStore<DiagnosticFinding>('diagnostic_findings');
    diag.findings = allFindings.filter((f) => f.diagnostic_id === diag.id);
    return diag;
  }

  /**
   * Retorna a lista dos diagnósticos mais recentes de todas as empresas no workspace.
   */
  public async getAllDiagnostics(workspaceId: string): Promise<Diagnostic[]> {
    await this.initialize();
    const all = await getAllFromStore<Diagnostic>('diagnostics');
    const filtered = all.filter((d) => d.workspace_id === workspaceId);

    // Carregar todas as empresas para garantir nome atualizado
    const companies = await this.getCompanies(workspaceId);
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    const allFindings = await getAllFromStore<DiagnosticFinding>('diagnostic_findings');

    // Agrupar por company_id e selecionar a versão mais recente
    const latestByCompany = new Map<string, Diagnostic>();
    for (const d of filtered) {
      d.company_name = companyMap.get(d.company_id) || d.company_name || 'Empresa';
      d.findings = allFindings.filter((f) => f.diagnostic_id === d.id);

      const existing = latestByCompany.get(d.company_id);
      if (!existing || (d.version || 0) > (existing.version || 0)) {
        latestByCompany.set(d.company_id, d);
      }
    }

    return Array.from(latestByCompany.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Exclui um diagnóstico e seus achados em cascata.
   */
  public async deleteDiagnostic(workspaceId: string, diagnosticId: string): Promise<boolean> {
    await this.initialize();
    const diag = await getFromStore<Diagnostic>('diagnostics', diagnosticId);
    if (!diag || diag.workspace_id !== workspaceId) return false;

    // Remover findings associados
    const allFindings = await getAllFromStore<DiagnosticFinding>('diagnostic_findings');
    for (const f of allFindings) {
      if (f.diagnostic_id === diagnosticId) {
        await deleteFromStore('diagnostic_findings', f.id);
      }
    }

    await deleteFromStore('diagnostics', diagnosticId);
    return true;
  }

  /**
   * Chama o motor server-side de Diagnóstico 360° (/api/diagnostics/run),
   * que executa a auditoria determinística + interpretação IA (Gemini 3.8 Flash),
   * e persiste o novo relatório como uma nova versão histórica.
   */
  public async runDiagnosticServer(
    workspaceId: string,
    companyId: string,
    companyData: Company
  ): Promise<Diagnostic> {
    await this.initialize();

    const response = await fetch('/api/diagnostics/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspaceId,
        companyId,
        companyData: {
          id: companyData.id,
          name: companyData.name,
          category: companyData.category,
          website_url: companyData.website_url,
          phone: companyData.phone,
          whatsapp_number: companyData.whatsapp_number,
          address: companyData.address,
          city: companyData.city,
          state: companyData.state,
          country: companyData.country,
          instagram_url: companyData.instagram_url,
          google_maps_url: companyData.google_maps_url,
          source_place_id: companyData.source_place_id,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.errorMessage || `Falha na execução do diagnóstico (${response.status})`);
    }

    const payload = await response.json();
    const { diagnostic: serverDiag, findings: serverFindings } = payload;

    // Salvar localmente no repositório persistente (gerando nova versão)
    const saved = await this.saveDiagnostic(workspaceId, serverDiag, serverFindings);
    return saved;
  }

  // ==============================================================================
  // --- FASE 4: CENTRAL DE ABORDAGEM & CADÊNCIA REPOSITORY METHODS ---
  // ==============================================================================

  /**
   * Obtém as 4 mensagens de abordagem da empresa, ordenadas por etapa (1 a 4).
   */
  async getOutreachMessages(workspaceId: string, companyId: string): Promise<OutreachMessage[]> {
    await this.initialize();
    const all = await getAllFromStore<OutreachMessage>('outreach_messages');
    const filtered = all.filter(
      (m) => m.workspace_id === workspaceId && m.company_id === companyId
    );
    return filtered.sort((a, b) => a.stage_step - b.stage_step);
  }

  /**
   * Salva ou atualiza uma mensagem de abordagem mantendo histórico estrito de versões.
   */
  async saveOutreachMessage(
    workspaceId: string,
    message: OutreachMessage,
    note?: string
  ): Promise<OutreachMessage> {
    await this.initialize();
    const existingList = await this.getOutreachMessages(workspaceId, message.company_id);
    const existing = existingList.find((m) => m.stage === message.stage);

    const now = new Date().toISOString();
    let updatedVersions = [...(existing?.versions || message.versions || [])];

    // Se o conteúdo ou estado mudou em relação à última versão, adiciona nova versão
    const lastVersion = updatedVersions[updatedVersions.length - 1];
    if (!lastVersion || lastVersion.content !== message.content || lastVersion.state !== message.state) {
      const nextVerNum = (lastVersion?.version || 0) + 1;
      updatedVersions.push({
        version: nextVerNum,
        content: message.content,
        channel: message.channel,
        state: message.state,
        updated_at: now,
        note: note || (message.state === 'editado' ? 'Edição manual pelo usuário' : 'Atualização de mensagem'),
      });
    }

    const messageToSave: OutreachMessage = {
      ...message,
      workspace_id: workspaceId,
      versions: updatedVersions,
      updated_at: now,
    };

    await putToStore('outreach_messages', messageToSave);

    // Sincronizar com Supabase se disponível
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('outreach_messages').upsert({
          id: messageToSave.id,
          workspace_id: messageToSave.workspace_id,
          company_id: messageToSave.company_id,
          contact_id: messageToSave.contact_id || null,
          stage: messageToSave.stage,
          stage_title: messageToSave.stage_title,
          stage_step: messageToSave.stage_step,
          channel: messageToSave.channel,
          content: messageToSave.content,
          state: messageToSave.state,
          versions: messageToSave.versions,
          diagnostic_id: messageToSave.diagnostic_id || null,
          diagnostic_score: messageToSave.diagnostic_score || null,
          tailored_points: messageToSave.tailored_points || [],
          updated_at: messageToSave.updated_at,
        });
      } catch (err) {
        console.warn('Sync com Supabase outreach_messages falhou (usando store local):', err);
      }
    }

    return messageToSave;
  }

  /**
   * Salva múltiplas mensagens de uma só vez (ex: regeneração completa das 4 etapas).
   */
  async saveOutreachMessagesBatch(
    workspaceId: string,
    messages: OutreachMessage[]
  ): Promise<OutreachMessage[]> {
    const saved: OutreachMessage[] = [];
    for (const msg of messages) {
      const s = await this.saveOutreachMessage(workspaceId, msg);
      saved.push(s);
    }
    return saved;
  }

  /**
   * Gera ou regenera as mensagens personalizadas utilizando os dados do CRM e do Diagnóstico 360°.
   */
  async generateOutreachForCompany(
    workspaceId: string,
    companyId: string,
    contactId?: string | null,
    channel: OutreachChannel = 'whatsapp'
  ): Promise<{ messages: OutreachMessage[]; engine: string }> {
    const company = await this.getCompanyById(workspaceId, companyId);
    if (!company) {
      throw new Error('Empresa não encontrada para geração de abordagem.');
    }

    let contact: Contact | null = null;
    if (contactId) {
      const contacts = await this.getContacts(workspaceId, companyId);
      contact = contacts.find((c) => c.id === contactId) || null;
    } else {
      const contacts = await this.getContacts(workspaceId, companyId);
      contact = contacts.find((c) => c.is_primary) || contacts[0] || null;
    }

    // Buscar diagnóstico mais recente da empresa
    const diagnostics = await this.getDiagnosticsByCompany(workspaceId, companyId);
    const latestDiag = diagnostics.length > 0 ? diagnostics[0] : null;

    // Tentar chamada ao endpoint server-side para IA (Gemini) ou fallback determinístico
    let resultMessages: OutreachMessage[];
    let engine = 'deterministic_template_engine';

    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          company,
          contact,
          diagnostic: latestDiag,
          channel,
        }),
      });

      if (res.ok) {
        const payload = await res.json();
        resultMessages = payload.messages;
        engine = payload.engine || 'gemini-2.5-flash';
      } else {
        resultMessages = generateDeterministicOutreach(company, contact, latestDiag, channel);
      }
    } catch {
      resultMessages = generateDeterministicOutreach(company, contact, latestDiag, channel);
    }

    // Persistir lote gerado
    const persisted = await this.saveOutreachMessagesBatch(workspaceId, resultMessages);

    // Registrar evento comercial no histórico
    await this.logCommercialEvent(
      workspaceId,
      companyId,
      'message_prepared',
      'system_observed',
      '4 mensagens de abordagem preparadas pela IA',
      `Mensagens estruturadas para as 4 etapas com base no diagnóstico (${latestDiag ? `Maturidade ${latestDiag.overall_score}/100` : 'sem diagnóstico preliminar'}).`,
      { channel, engine, contactId: contact?.id }
    );

    return { messages: persisted, engine };
  }

  /**
   * Inicia a cadência de acompanhamento sugerida nos dias 0, 2, 4, 8 e 12.
   * Não dispara mensagens automaticamente; cria tarefas pendentes de revisão.
   * Se o lead estiver marcado com do_not_contact, bloqueia a criação de tarefas.
   */
  async startCadenceForCompany(
    workspaceId: string,
    companyId: string,
    startDateStr?: string
  ): Promise<{ success: boolean; tasks: Task[]; message?: string }> {
    const company = await this.getCompanyById(workspaceId, companyId);
    if (!company) {
      throw new Error('Empresa não encontrada para iniciar cadência.');
    }

    // REGRA CRÍTICA: Lead bloqueado por Opt-out / Pedido de não contato não recebe tarefas
    if (company.do_not_contact) {
      throw new Error(
        'Bloqueio ativo: Este lead solicitou não receber mensagens (Opt-Out). Abertura de cadência e tarefas de prospecção estão estritamente bloqueadas.'
      );
    }

    // Cancelar/limpar tarefas de cadência pendentes anteriores se houver
    const existingTasks = await this.getTasks(workspaceId, { companyId });
    for (const t of existingTasks) {
      if (t.status === 'pending' && t.title.startsWith('Dia ')) {
        await this.updateTask(workspaceId, t.id, { status: 'cancelled' });
      }
    }

    const baseDate = startDateStr ? new Date(startDateStr) : new Date();
    const createdTasks: Task[] = [];

    for (const step of CADENCE_SCHEDULE) {
      const dueDate = new Date(baseDate.getTime() + step.dayOffset * 24 * 60 * 60 * 1000);
      const task = await this.createTask(workspaceId, {
        company_id: companyId,
        title: step.title,
        description: `Objetivo da etapa: ${step.objective}\nCanal sugerido: ${step.channel.toUpperCase()}\nStatus: Pendente de revisão e ação manual pelo usuário.`,
        due_date: dueDate.toISOString(),
        priority: step.dayOffset === 0 ? 'high' : 'medium',
        status: 'pending',
        is_cadence: true,
        stage_step: step.stageStep,
      });
      createdTasks.push(task);
    }

    // Atualizar status de cadência na empresa
    await this.updateCompany(workspaceId, companyId, {
      cadence_status: 'active',
      cadence_started_at: baseDate.toISOString(),
    });

    // Registrar evento comercial
    await this.logCommercialEvent(
      workspaceId,
      companyId,
      'manual_contact_logged',
      'manual_user',
      'Cadência de prospecção iniciada (Dias 0, 2, 4, 8 e 12)',
      '5 tarefas de acompanhamento consultivo foram criadas no CRM e no calendário para revisão manual.',
      { tasksCount: createdTasks.length, baseDate: baseDate.toISOString() }
    );

    return { success: true, tasks: createdTasks };
  }

  /**
   * Interrompe as sugestões de contato por evento de negócio:
   * opt_out, reunião marcada, lead sem interesse ou suspensão manual.
   */
  async stopOrPauseCadence(
    workspaceId: string,
    companyId: string,
    reason: 'opt_out' | 'meeting' | 'not_interested' | 'paused',
    customNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    const company = await this.getCompanyById(workspaceId, companyId);
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    // Cancelar tarefas pendentes da cadência
    const tasks = await this.getTasks(workspaceId, { companyId });
    let cancelledCount = 0;
    for (const t of tasks) {
      if (t.status === 'pending' && t.title.startsWith('Dia ')) {
        await this.updateTask(workspaceId, t.id, { status: 'cancelled' });
        cancelledCount++;
      }
    }

    if (reason === 'opt_out') {
      await this.updateCompany(workspaceId, companyId, {
        do_not_contact: true,
        do_not_contact_reason: customNotes || 'Destinatário solicitou não receber mensagens (Opt-Out)',
        cadence_status: 'stopped',
      });

      await this.logCommercialEvent(
        workspaceId,
        companyId,
        'opt_out_requested',
        'manual_user',
        'Pedido de Não Contato (Opt-Out) registrado',
        `Lead bloqueado para novos contatos e cadência interrompida (${cancelledCount} tarefas canceladas). Motivo: ${customNotes || 'Solicitação do destinatário'}.`,
        { reason: 'opt_out' }
      );

      return {
        success: true,
        message: 'Lead bloqueado por pedido de não-contato e cadência cancelada com sucesso.',
      };
    }

    if (reason === 'meeting') {
      await this.updateCompany(workspaceId, companyId, {
        cadence_status: 'completed',
        lead_status: 'qualificado',
      });

      await this.logCommercialEvent(
        workspaceId,
        companyId,
        'meeting_scheduled',
        'manual_user',
        'Reunião comercial agendada',
        `Reunião marcada com sucesso. Cadência de prospecção concluída com êxito (${cancelledCount} tarefas futuras canceladas).`,
        { notes: customNotes }
      );

      return {
        success: true,
        message: 'Reunião registrada! Cadência concluída com sucesso.',
      };
    }

    if (reason === 'not_interested') {
      await this.updateCompany(workspaceId, companyId, {
        cadence_status: 'stopped',
        lead_status: 'perdido',
      });

      await this.logCommercialEvent(
        workspaceId,
        companyId,
        'manual_contact_logged',
        'manual_user',
        'Lead sem interesse / Desqualificado',
        `Lead marcou sem interesse comercial no momento. Cadência de prospecção suspensa (${cancelledCount} tarefas canceladas).`,
        { notes: customNotes }
      );

      return {
        success: true,
        message: 'Lead marcado como sem interesse e cadência finalizada.',
      };
    }

    // Pausa manual
    await this.updateCompany(workspaceId, companyId, {
      cadence_status: 'paused',
    });

    await this.logCommercialEvent(
      workspaceId,
      companyId,
      'manual_contact_logged',
      'manual_user',
      'Cadência suspensa temporariamente pelo usuário',
      `Cadência pausada para revisão comercial (${cancelledCount} tarefas canceladas).`,
      { notes: customNotes }
    );

    return {
      success: true,
      message: 'Cadência de acompanhamento pausada com sucesso.',
    };
  }

  /**
   * Bloqueia um lead com pedido de não contato (Opt-Out).
   */
  async setDoNotContact(
    workspaceId: string,
    companyId: string,
    reason: string
  ): Promise<boolean> {
    await this.stopOrPauseCadence(workspaceId, companyId, 'opt_out', reason);
    return true;
  }

  /**
   * Registra um evento no histórico comercial com diferenciação estrita entre
   * eventos observados pelo sistema (ex: link aberto, mensagem copiada) e
   * eventos manuais registrados pelo operador (ex: resposta recebida, reunião marcada).
   */
  async logCommercialEvent(
    workspaceId: string,
    companyId: string,
    type: ActivityType,
    origin: ActivityOrigin,
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<Activity> {
    const actId = `act-${generateUUID()}`;
    const now = new Date().toISOString();

    const activity: Activity = {
      id: actId,
      workspace_id: workspaceId,
      company_id: companyId,
      type,
      origin,
      title,
      description: description || null,
      performed_at: now,
      created_at: now,
      metadata: metadata || {},
    };

    await putToStore('activities', activity);

    // Sync com Supabase se disponível
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('activities').insert({
          id: activity.id,
          workspace_id: activity.workspace_id,
          company_id: activity.company_id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          performed_at: activity.performed_at,
          origin: activity.origin,
          metadata: activity.metadata,
        });
      } catch (err) {
        console.warn('Sync com Supabase activities falhou:', err);
      }
    }

    return activity;
  }
}

export const dbRepo = ProspectRepository.getInstance();

