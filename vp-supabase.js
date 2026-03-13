/**
 * VendorPlus — Supabase Auth & Realtime Layer
 * vp-supabase.js  (include this in ALL three pages)
 *
 * SETUP:  Replace the two values below with your own from
 *         https://app.supabase.com → Project Settings → API
 */

// ─── YOUR SUPABASE CREDENTIALS ──────────────────────────────────────
const VP_SUPABASE_URL  = 'https://mcirwhiouguqsinrdjkz.supabase.co';
const VP_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jaXJ3aGlvdWd1cXNpbnJkamt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTU4MzUsImV4cCI6MjA4ODgzMTgzNX0.yaQckxZWA6w5F4DilKtU3LdXZtpADOptEGdqbl8zuP8';
// ────────────────────────────────────────────────────────────────────

// Load Supabase JS client from CDN
(function () {
  if (window.__vpSupabaseLoading) return;
  window.__vpSupabaseLoading = true;
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = function () { window.__vpSupabaseReady = true; _vpInit(); };
  document.head.appendChild(s);
})();

// ─── INTERNAL STATE ─────────────────────────────────────────────────
let _vpClient = null;
let _vpSession = null;
const _vpReadyCallbacks = [];

function _vpInit() {
  _vpClient = window.supabase.createClient(VP_SUPABASE_URL, VP_SUPABASE_ANON);

  // Restore session from localStorage (Supabase does this automatically)
  _vpClient.auth.getSession().then(({ data }) => {
    _vpSession = data.session;
    _vpReadyCallbacks.forEach(fn => fn(_vpSession));
  });

  // Keep session in sync across tabs
  _vpClient.auth.onAuthStateChange((_event, session) => {
    _vpSession = session;
  });
}

// ─── PUBLIC API ─────────────────────────────────────────────────────

/**
 * Run callback once Supabase is ready.
 * Usage: VP_AUTH.ready(session => { ... })
 */
window.VP_AUTH = {

  ready(cb) {
    if (window.__vpSupabaseReady && _vpClient) {
      _vpClient.auth.getSession().then(({ data }) => cb(data.session));
    } else {
      _vpReadyCallbacks.push(cb);
    }
  },

  /**
   * Sign in with email + password (Supabase Auth).
   * Returns { user, role, name, error }
   */
  async signIn(email, password) {
    if (!_vpClient) return { error: 'Auth not ready' };
    const { data, error } = await _vpClient.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Fetch role from your `profiles` table
    const { data: profile } = await _vpClient
      .from('profiles')
      .select('role, name')
      .eq('id', data.user.id)
      .single();

    return {
      user: data.user,
      role: profile?.role || 'agent',
      name: profile?.name || email
    };
  },

  /**
   * Sign up a new agent account.
   * Returns { user, error }
   */
  async signUp(email, password, name) {
    if (!_vpClient) return { error: 'Auth not ready' };
    const { data, error } = await _vpClient.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) return { error: error.message };

    // Insert profile row
    await _vpClient.from('profiles').insert({
      id: data.user.id,
      name,
      role: 'agent',
      online: false
    });

    return { user: data.user };
  },

  /** Sign out current user */
  async signOut() {
    if (_vpClient) await _vpClient.auth.signOut();
    sessionStorage.clear();
  },

  /** Get current session (null if logged out) */
  getSession() { return _vpSession; },

  /** Get Supabase client for DB queries */
  db() { return _vpClient; },

  /**
   * Guard: call on protected pages (admin.html, agent.html).
   * Redirects to admin.html if not logged in or wrong role.
   * requiredRole: 'admin' | 'agent' | null (any logged in user)
   */
  guard(requiredRole) {
    this.ready(async session => {
      if (!session) {
        location.href = 'admin.html';
        return;
      }
      if (requiredRole) {
        const { data: profile } = await _vpClient
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        const role = profile?.role;
        if (role !== requiredRole && !(requiredRole === 'agent' && role === 'admin')) {
          await this.signOut();
          location.href = 'admin.html';
        }
      }
    });
  },

  /**
   * Subscribe to realtime DB changes.
   * table: 'transactions' | 'methods' | 'profiles'
   * cb: function({ eventType, new: row, old: row })
   */
  subscribe(table, cb) {
    if (!_vpClient) { _vpReadyCallbacks.push(() => this.subscribe(table, cb)); return; }
    _vpClient
      .channel('vp_' + table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
      .subscribe();
  },

  // ── Transactions ────────────────────────────────────────────────

  async getTxns() {
    const { data } = await _vpClient.from('transactions').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async addTxn(txn) {
    const { data, error } = await _vpClient.from('transactions').insert(txn).select().single();
    return { data, error };
  },

  async updateTxn(id, updates) {
    const { data, error } = await _vpClient.from('transactions').update(updates).eq('id', id).select().single();
    return { data, error };
  },

  // ── Payment Methods ──────────────────────────────────────────────

  async getMethods() {
    const { data } = await _vpClient.from('methods').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async addMethod(method) {
    return await _vpClient.from('methods').insert(method).select().single();
  },

  async updateMethod(id, updates) {
    return await _vpClient.from('methods').update(updates).eq('id', id).select().single();
  },

  async deleteMethod(id) {
    return await _vpClient.from('methods').delete().eq('id', id);
  },

  // ── Agents (profiles) ───────────────────────────────────────────

  async getAgents() {
    const { data } = await _vpClient.from('profiles').select('*').eq('role', 'agent');
    return data || [];
  },

  async setAgentOnline(userId, online) {
    return await _vpClient.from('profiles').update({ online }).eq('id', userId);
  }
};
