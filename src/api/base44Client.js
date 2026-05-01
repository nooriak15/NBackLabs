/**
 * Supabase-backed adapter that exposes the same surface the rest of the
 * codebase already calls (`base44.entities.X.list/filter/get/create/...`,
 * `base44.integrations.Core.UploadFile`, `base44.auth.*`).
 *
 * Keeping the adapter shape lets every page/component continue to use the
 * `base44.entities.Session.filter({ session_code })` style calls without
 * being rewritten — only this file knows about Supabase.
 *
 * Tables used (created by supabase_setup.sql):
 *   sessions, subjects, game_results, stimulus_sets
 * Storage bucket:
 *   stimulus-images (public)
 */

import { supabase, STIMULUS_BUCKET } from '@/lib/supabase';

// ──────────────────────────────────────────────────────────────
// Map the legacy entity names the app uses to the actual table names.
const TABLE = {
  Session: 'sessions',
  Subject: 'subjects',
  GameResult: 'game_results',
  StimulusSet: 'stimulus_sets',
};

// Parse a sort string like '-created_date' into { column, ascending }.
function parseSort(sort) {
  if (!sort || typeof sort !== 'string') return null;
  const desc = sort.startsWith('-');
  return { column: desc ? sort.slice(1) : sort, ascending: !desc };
}

// Apply an `eq` chain for every key in the filter object. Supabase has no
// "filter object" API so we fold over the entries.
function applyFilter(query, filter) {
  if (!filter) return query;
  for (const [k, v] of Object.entries(filter)) {
    query = query.eq(k, v);
  }
  return query;
}

// Throw a helpful error so it bubbles up through React Query and shows in
// the toast/UI rather than silently returning empty arrays.
function throwIfError(error, context) {
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[supabase ${context}]`, error);
    throw new Error(error.message || `Supabase ${context} failed`);
  }
}

function makeEntity(entityName) {
  const table = TABLE[entityName];
  if (!table) throw new Error(`Unknown entity ${entityName}`);

  return {
    async list(sort) {
      let q = supabase.from(table).select('*');
      const s = parseSort(sort);
      if (s) q = q.order(s.column, { ascending: s.ascending });
      const { data, error } = await q;
      throwIfError(error, `${entityName}.list`);
      return data ?? [];
    },

    async filter(criteria, sort) {
      let q = supabase.from(table).select('*');
      q = applyFilter(q, criteria);
      const s = parseSort(sort);
      if (s) q = q.order(s.column, { ascending: s.ascending });
      const { data, error } = await q;
      throwIfError(error, `${entityName}.filter`);
      return data ?? [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwIfError(error, `${entityName}.get`);
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      throwIfError(error, `${entityName}.create`);
      return data;
    },

    async bulkCreate(payloads) {
      if (!payloads || payloads.length === 0) return [];
      const { data, error } = await supabase
        .from(table)
        .insert(payloads)
        .select();
      throwIfError(error, `${entityName}.bulkCreate`);
      return data ?? [];
    },

    async update(id, patch) {
      const { data, error } = await supabase
        .from(table)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      throwIfError(error, `${entityName}.update`);
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      throwIfError(error, `${entityName}.delete`);
      return { ok: true };
    },
  };
}

// ──────────────────────────────────────────────────────────────
// File upload — replaces base44.integrations.Core.UploadFile.
//
// Uploads to the public `stimulus-images` bucket and returns the resulting
// public URL in the shape the rest of the app expects: { file_url }.
//
// We prefix the path with the user's id so the policy `owner = auth.uid()`
// on DELETE works cleanly. Filename is suffixed with a short random id to
// avoid collisions when two researchers upload images with the same name.
// ──────────────────────────────────────────────────────────────
async function uploadFile({ file }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload images.');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${user.id}/${Date.now()}-${random}-${safeName}`;

  const { error } = await supabase.storage
    .from(STIMULUS_BUCKET)
    .upload(path, file, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase upload]', error);
    throw new Error(error.message || 'Upload failed');
  }

  const { data } = supabase.storage.from(STIMULUS_BUCKET).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

// ──────────────────────────────────────────────────────────────
// Auth — minimal shim so AppLayout's `base44.auth.logout()` keeps working.
// The full auth flow lives in src/lib/AuthContext.jsx.
// ──────────────────────────────────────────────────────────────
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
    };
  },
  async logout() {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
  redirectToLogin() {
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
};

export const base44 = {
  entities: Object.keys(TABLE).reduce(
    (acc, name) => ({ ...acc, [name]: makeEntity(name) }),
    {}
  ),
  integrations: {
    Core: { UploadFile: uploadFile },
  },
  auth,
};
