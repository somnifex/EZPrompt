import { StorageSnapshot, DEFAULT_SETTINGS, PromptItem, Category, SiteAdapterConfig } from '../types/models';

const LS_KEY = 'EZP_STORAGE_V1';

let snapshotCache: StorageSnapshot | null = null;

function now() { return Date.now(); }

const presetSites: SiteAdapterConfig[] = [
  {
    id: 'chatgpt',
    match: url => /chat\.openai\.com|chatgpt\.com/.test(url),
    inputSelectors: ['textarea[data-id="root"]','textarea','div[contenteditable="true"]'],
    textareaStrategy: 'value'
  },
  {
    id: 'claude',
    match: url => /claude\.ai/.test(url),
    inputSelectors: ['textarea','div[contenteditable="true"]'],
    textareaStrategy: 'value'
  },
  {
    id: 'gemini',
    match: url => /gemini\.google\.com/.test(url),
    inputSelectors: ['textarea','div[contenteditable="true"]'],
    textareaStrategy: 'value'
  },
  {
    id: 'deepseek',
    match: url => /deepseek\.com/.test(url),
    inputSelectors: ['textarea','div[contenteditable="true"]'],
    textareaStrategy: 'value'
  },
  {
    id: 'qwen',
    match: url => /tongyi\.aliyun|qwen/.test(url),
    inputSelectors: ['textarea','div[contenteditable="true"]'],
    textareaStrategy: 'value'
  }
];

function load(): StorageSnapshot {
  if (snapshotCache) return snapshotCache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StorageSnapshot;
      // 补全默认设置字段
      parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      snapshotCache = parsed;
      return parsed;
    }
  } catch (e) {
    console.warn('[EZPrompt] load error', e);
  }
  const initial: StorageSnapshot = {
    prompts: [],
    categories: [],
    settings: { ...DEFAULT_SETTINGS },
    sites: presetSites
  };
  snapshotCache = initial;
  persist();
  return initial;
}

function persist() {
  if (!snapshotCache) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(snapshotCache));
  } catch (e) {
    console.error('[EZPrompt] persist error', e);
  }
}

export function getSnapshot(): StorageSnapshot {
  return load();
}

export function savePrompt(p: Omit<PromptItem,'id'|'createdAt'|'updatedAt'> & {id?: string}): PromptItem {
  const snap = load();
  const id = p.id || crypto.randomUUID();
  const existing = snap.prompts.find(x => x.id === id);
  const nowTs = now();
  if (existing) {
    existing.name = p.name;
    existing.title = p.title;
    existing.content = p.content;
    existing.tags = p.tags;
    existing.categoryId = p.categoryId;
    existing.updatedAt = nowTs;
  } else {
    const item: PromptItem = {
      id,
      name: p.name,
      title: p.title,
      content: p.content,
      tags: p.tags || [],
      categoryId: p.categoryId,
      createdAt: nowTs,
      updatedAt: nowTs
    };
    snap.prompts.push(item);
  }
  persist();
  return snap.prompts.find(x => x.id === id)!;
}

export function deletePrompt(id: string) {
  const snap = load();
  snap.prompts = snap.prompts.filter(p => p.id !== id);
  persist();
}

export function listPrompts(): PromptItem[] {
  return load().prompts;
}

export function saveCategory(c: Omit<Category,'id'> & {id?: string}): Category {
  const snap = load();
  const id = c.id || crypto.randomUUID();
  const existing = snap.categories.find(x => x.id === id);
  if (existing) {
    existing.name = c.name;
    existing.parentId = c.parentId;
    existing.sort = c.sort;
  } else {
    snap.categories.push({ id, name: c.name, parentId: c.parentId, sort: c.sort });
  }
  persist();
  return snap.categories.find(x => x.id === id)!;
}

export function deleteCategory(id: string) {
  const snap = load();
  snap.categories = snap.categories.filter(c => c.id !== id);
  persist();
}

export function listCategories(): Category[] {
  return load().categories;
}

export function updateSettings(partial: Partial<StorageSnapshot['settings']>) {
  const snap = load();
  snap.settings = { ...snap.settings, ...partial };
  persist();
  return snap.settings;
}

export function getSettings() { return load().settings; }

export function getCurrentSite(): SiteAdapterConfig | undefined {
  const url = location.href;
  return load().sites.find(s => {
    try { return s.match(url); } catch { return false; }
  });
}

// 添加自定义站点
export function addCustomSite(cfg: Omit<SiteAdapterConfig,'id'|'match'> & { id?: string; matchPattern: string; }) {
  const snap = load();
  const id = cfg.id || 'custom-' + crypto.randomUUID();
  const site: SiteAdapterConfig = {
    id,
    match: (url: string) => new RegExp(cfg.matchPattern).test(url),
    inputSelectors: cfg.inputSelectors,
    textareaStrategy: cfg.textareaStrategy,
    extra: cfg.extra
  };
  snap.sites.push(site);
  persist();
  return site;
}

// ===== WebDAV / 外部同步辅助函数 =====
// 直接覆盖或插入完整 Prompt（来自远端合并结果）
export function upsertPromptExternal(p: PromptItem) {
  const snap = load();
  const idx = snap.prompts.findIndex(x => x.id === p.id);
  if (idx >= 0) snap.prompts[idx] = p; else snap.prompts.push(p);
  persist();
}

export function overwritePromptsExternal(list: PromptItem[]) {
  const snap = load();
  snap.prompts = [...list];
  persist();
}

export function overwriteCategoriesExternal(list: Category[]) {
  const snap = load();
  snap.categories = [...list];
  persist();
}

export function getAllForExport(): StorageSnapshot { return load(); }
