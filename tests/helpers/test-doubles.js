/**
 * tests/helpers/test-doubles.js
 * Koleksi Test Doubles (Dummy, Stub, Mock, Fake, Spy) untuk mengisolasi
 * unit under test GadgetStock dari Supabase Cloud DB/Auth, localStorage, fetch, dan Timer.
 */

const path = require('path');

/**
 * 1. DUMMY: Membuat objek req/res minimal atau placeholder metadata yang hanya
 * diperlukan untuk memenuhi parameter tanpa memengaruhi alur logika utama.
 */
function createMockReq(method = 'GET', { body = {}, query = {}, params = {} } = {}) {
  return { method, body, query, params };
}

function createResponseRecorder() {
  const headers = {};
  const res = {
    statusCode: 200,
    headers,
    body: null,
    ended: false,
    setHeader(k, v) {
      headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
  return res;
}

const dummyLogger = {
  info() {},
  warn() {},
  error() {}
};

/**
 * 2. SPY: Membungkus/mencatat setiap pemanggilan fungsi beserta argumen & jumlah panggilannya.
 */
function createSpy(impl = () => undefined) {
  const calls = [];
  const fn = (...args) => {
    calls.push(args);
    return impl(...args);
  };
  fn.calls = calls;
  fn.callCount = () => calls.length;
  fn.calledWith = (idx = 0) => calls[idx];
  return fn;
}

/**
 * 3. FAKE: Implementasi ringan in-memory untuk browser localStorage.
 */
class FakeLocalStorage {
  constructor(initial = {}) {
    this.store = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

/**
 * 3b. FAKE: Implementasi ringan in-memory untuk tabel settings (upsert & select).
 */
class FakeSettingsRepository {
  constructor(initialRows = []) {
    this.rows = new Map(initialRows.map(r => [r.key, r.value]));
  }
  selectAll() {
    return Array.from(this.rows.entries()).map(([key, value]) => ({ key, value }));
  }
  upsert(key, value) {
    this.rows.set(key, String(value));
    return { error: null };
  }
}

/**
 * 4. STUB & MOCK: Pembangun Query & Client Supabase tiruan yang dapat disuntikkan
 * ke require.cache ['@supabase/supabase-js'] agar handler API dapat diuji terisolasi.
 */
function createQueryBuilderStub({ result = { data: [], error: null, count: 0 }, onFilter, onInsert, onUpdate } = {}) {
  const recordedOps = [];
  const builder = {
    _ops: recordedOps,
    select(...args) { recordedOps.push(['select', ...args]); return builder; },
    eq(...args) { recordedOps.push(['eq', ...args]); if (onFilter) onFilter('eq', args); return builder; },
    gt(...args) { recordedOps.push(['gt', ...args]); if (onFilter) onFilter('gt', args); return builder; },
    lte(...args) { recordedOps.push(['lte', ...args]); if (onFilter) onFilter('lte', args); return builder; },
    gte(...args) { recordedOps.push(['gte', ...args]); if (onFilter) onFilter('gte', args); return builder; },
    or(...args) { recordedOps.push(['or', ...args]); if (onFilter) onFilter('or', args); return builder; },
    order(...args) { recordedOps.push(['order', ...args]); return builder; },
    range(...args) { recordedOps.push(['range', ...args]); return builder; },
    insert(payload) {
      recordedOps.push(['insert', payload]);
      if (onInsert) return onInsert(payload);
      return builder;
    },
    update(payload) {
      recordedOps.push(['update', payload]);
      if (onUpdate) return onUpdate(payload);
      return builder;
    },
    upsert(payload, opts) {
      recordedOps.push(['upsert', payload, opts]);
      return Promise.resolve(typeof result === 'function' ? result('upsert', payload, opts) : result);
    },
    single() {
      recordedOps.push(['single']);
      return Promise.resolve(typeof result === 'function' ? result('single', recordedOps) : result);
    },
    then(resolve, reject) {
      const resolved = typeof result === 'function' ? result('exec', recordedOps) : result;
      return Promise.resolve(resolved).then(resolve, reject);
    }
  };
  return builder;
}

/**
 * Helper untuk mengganti @supabase/supabase-js dan memuat ulang modul target API secara bersih.
 */
function loadApiWithSupabaseDouble(moduleRelativePath, supabaseDouble) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.local';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub-service-role-key';
  process.env.PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET || 'unit-test-reset-secret';

  const supaPath = require.resolve('@supabase/supabase-js');
  const targetPath = path.resolve(__dirname, '..', '..', moduleRelativePath);

  delete require.cache[targetPath];
  require.cache[supaPath] = {
    id: supaPath,
    filename: supaPath,
    loaded: true,
    exports: {
      createClient: () => supabaseDouble
    }
  };

  return require(targetPath);
}

/**
 * 5. MOCK: Membuat mock fetch global dengan verifikasi URL, method, dan payload.
 */
function createFetchMock(handler) {
  const spy = createSpy(async (url, options = {}) => handler(url, options));
  return spy;
}

module.exports = {
  createMockReq,
  createResponseRecorder,
  dummyLogger,
  createSpy,
  FakeLocalStorage,
  FakeSettingsRepository,
  createQueryBuilderStub,
  loadApiWithSupabaseDouble,
  createFetchMock
};
