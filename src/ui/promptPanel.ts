import { listPrompts, savePrompt, updateSettings, deletePrompt, getSettings } from '../storage/local';
import { t } from '../services/i18n';
import { insertTextToInput } from './insertText';
// removed duplicate import
import { fillTemplateWithDialog } from './variableDialog';
import { bus, BUS_EVENTS } from '../utils/eventBus';

let panelEl: HTMLDivElement | null = null;
let searchInput: HTMLInputElement | null = null;
let listEl: HTMLDivElement | null = null;
let footerEl: HTMLDivElement | null = null;
let activeInput: HTMLTextAreaElement | HTMLDivElement | HTMLInputElement | null = null;
let visible = false;
let currentFilter = '';
let showRecommendations = true;

const STYLE_ID = 'ezp-panel-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
  .ezp-panel-overlay { position:fixed; inset:0; display:flex; align-items:flex-start; justify-content:center; z-index:999999; background:rgba(0,0,0,0.15); backdrop-filter:blur(2px); }
  .ezp-panel { margin-top:10vh; width:480px; max-height:70vh; background:var(--ezp-bg,#fffffffa); color:#222; border:1px solid #ccc; border-radius:8px; box-shadow:0 4px 18px rgba(0,0,0,0.15); display:flex; flex-direction:column; font-family: system-ui, sans-serif; }
  .ezp-panel-header { padding:8px 10px; border-bottom:1px solid #e3e3e3; display:flex; gap:8px; }
  .ezp-panel-header input { flex:1; padding:4px 8px; font-size:14px; }
  .ezp-panel-list { overflow:auto; padding:4px 0; }
  .ezp-item { padding:6px 10px; cursor:pointer; line-height:1.3; }
  .ezp-item:hover, .ezp-item.active { background:#f0f6ff; }
  .ezp-empty { padding:16px; text-align:center; color:#999; }
  .ezp-insert-mode { font-size:12px; color:#666; }
  @media (prefers-color-scheme: dark) { .ezp-panel { background:#1e1f22; color:#e6e6e6; border-color:#444; } .ezp-item:hover, .ezp-item.active { background:#2d3b52; } }
  `;
  document.head.appendChild(style);
}

export function setActiveInputElement(el: HTMLTextAreaElement | HTMLDivElement | HTMLInputElement) {
  activeInput = el;
}

function buildPanel() {
  ensureStyle();
  if (panelEl) return;
  const overlay = document.createElement('div');
  overlay.className = 'ezp-panel-overlay';
  overlay.style.display = 'none';

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePromptPanel();
  });

  const panel = document.createElement('div');
  panel.className = 'ezp-panel';

  const header = document.createElement('div');
  header.className = 'ezp-panel-header';

  const input = document.createElement('input');
  input.placeholder = t('search_placeholder');
  input.addEventListener('input', () => {
    currentFilter = input.value.trim().toLowerCase();
    renderList();
  });
  input.addEventListener('keydown', e => onSearchKey(e));
  searchInput = input;

  const modeSpan = document.createElement('div');
  modeSpan.className = 'ezp-insert-mode';
  modeSpan.textContent = t('mode') + ': ' + getSettings().insertMode;

  header.appendChild(input);
  header.appendChild(modeSpan);

  const listDiv = document.createElement('div');
  listDiv.className = 'ezp-panel-list';
  listEl = listDiv;

  // 推荐区块容器 (插在列表顶部)
  const recWrap = document.createElement('div');
  recWrap.id = 'ezp-recs';
  recWrap.style.cssText='border-bottom:1px solid #e5e7eb;padding:4px 0;display:none;';
  listDiv.appendChild(recWrap);

  panel.appendChild(header);
  panel.appendChild(listDiv);
  // footer
  const footer = document.createElement('div');
  footer.className = 'ezp-panel-footer';
  footer.style.cssText = 'border-top:1px solid #e3e3e3; padding:6px 8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;';
  const addBtn = document.createElement('button'); addBtn.textContent = t('add'); addBtn.type = 'button'; addBtn.style.cssText = btnStyle();
  addBtn.onclick = () => openEditDialog();
  const editBtn = document.createElement('button'); editBtn.textContent = t('edit'); editBtn.type = 'button'; editBtn.style.cssText = btnStyle(); editBtn.onclick = () => editSelected();
  const delBtn = document.createElement('button'); delBtn.textContent = t('delete'); delBtn.type = 'button'; delBtn.style.cssText = btnStyle(); delBtn.onclick = () => deleteSelected();
  const modeSelect = document.createElement('select'); modeSelect.style.cssText = 'font-size:12px; padding:2px 4px;';
  ['cursor','replace','prefix','suffix'].forEach(m => { const o = document.createElement('option'); o.value = o.textContent = m; if (m===getSettings().insertMode) o.selected = true; modeSelect.appendChild(o); });
  modeSelect.onchange = () => { const newMode = modeSelect.value as any; updateSettings({ insertMode: newMode }); modeSpan.textContent = t('mode') + ': ' + newMode; };
  footer.append(addBtn, editBtn, delBtn, modeSelect);
  footerEl = footer;
  panel.appendChild(footer);
  overlay.appendChild(panel);

  panelEl = overlay;
  document.body.appendChild(overlay);
  renderList();

  window.addEventListener('keydown', e => {
    if (!visible) return;
    if (e.key === 'Escape') { closePromptPanel(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(e.key === 'ArrowDown' ? 1 : -1);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      activateSelected();
    }
  });
}

let activeIndex = -1;

function filteredPrompts() {
  const list = listPrompts();
  if (!currentFilter) return list;
  return list.filter(p => p.name.toLowerCase().includes(currentFilter) || (p.title || '').toLowerCase().includes(currentFilter));
}

function renderList() {
  if (!listEl) return;
  const items = filteredPrompts();
  listEl.innerHTML = '';
  // 重建推荐容器
  const recWrap = document.createElement('div'); recWrap.id='ezp-recs'; recWrap.style.cssText='border-bottom:1px solid #e5e7eb;padding:4px 0;';
  if (showRecommendations) {
    const prompts = listPrompts();
    const recent = prompts.filter(p=>p.lastUsedAt).sort((a,b)=>(b.lastUsedAt||0)-(a.lastUsedAt||0)).slice(0,3);
    const frequent = prompts.filter(p=>p.usageCount).sort((a,b)=>(b.usageCount||0)-(a.usageCount||0)).slice(0,3);
    const block = document.createElement('div');
    block.style.cssText='display:flex;flex-wrap:wrap;gap:4px;padding:2px 6px;';
    const usedIds = new Set<string>();
    const addChip = (p:any,label:string) => {
      if (usedIds.has(p.id)) return; usedIds.add(p.id);
      const chip = document.createElement('div');
      chip.textContent = p.name;
      chip.title = label;
      chip.style.cssText='font-size:11px;padding:2px 6px;background:#eef2ff;border:1px solid #cbd5e1;border-radius:14px;cursor:pointer;';
      chip.onclick = () => { activeIndex = filteredPrompts().findIndex(x=>x.id===p.id); commitInsert(); };
      block.appendChild(chip);
    };
    recent.forEach(p=>addChip(p,'recent'));
    frequent.forEach(p=>addChip(p,'frequent'));
    if (block.children.length>0) { const title=document.createElement('div'); title.textContent='★ Recommendations'; title.style.cssText='font-size:11px;opacity:.6;padding:2px 6px 4px;flex:1 0 100%;'; block.prepend(title); recWrap.appendChild(block); }
    if (block.children.length>0) listEl.appendChild(recWrap);
  }
  if (!items.length) {
    const div = document.createElement('div');
    div.className = 'ezp-empty';
  div.textContent = t('no_matches');
    listEl.appendChild(div);
    activeIndex = -1;
    return;
  }
  items.forEach((p, idx) => {
  const div = document.createElement('div');
  div.className = 'ezp-item' + (idx === activeIndex ? ' active' : '');
  div.textContent = p.name + (p.title && p.title !== p.name ? ` (${p.title})` : '');
  div.title = p.content.slice(0, 300);
    div.addEventListener('click', () => {
      activeIndex = idx;
      commitInsert();
    });
    listEl!.appendChild(div);
  });
}

function moveActive(delta: number) {
  const count = filteredPrompts().length;
  if (!count) return;
  activeIndex = (activeIndex + delta + count) % count;
  renderList();
}

function activateSelected() {
  if (activeIndex < 0) activeIndex = 0;
  commitInsert();
}

async function commitInsert() {
  const items = filteredPrompts();
  if (activeIndex < 0 || activeIndex >= items.length) return;
  const p = items[activeIndex];
  if (activeInput) {
  let content = p.content;
  content = await fillTemplateWithDialog(content);
  insertWithMode(content);
  // usage stats update
  p.usageCount = (p.usageCount || 0) + 1;
  p.lastUsedAt = Date.now();
  savePrompt({ id: p.id, name: p.name, title: p.title, content: p.content, tags: p.tags, categoryId: p.categoryId });
  bus.emit(BUS_EVENTS.PROMPT_INSERTED, { id: p.id });
  }
  closePromptPanel();
}

function insertWithMode(content: string) {
  if (!activeInput) return;
  const mode = getSettings().insertMode;
  if (activeInput instanceof HTMLTextAreaElement || activeInput instanceof HTMLInputElement) {
    if (mode === 'replace') {
      activeInput.value = content;
    } else if (mode === 'prefix') {
      activeInput.value = content + (activeInput.value || '');
    } else if (mode === 'suffix') {
      activeInput.value = (activeInput.value || '') + content;
    } else { // cursor
      insertTextToInput(activeInput, content);
      return;
    }
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (activeInput instanceof HTMLDivElement && activeInput.isContentEditable) {
    if (mode === 'replace') {
      activeInput.innerText = content;
    } else if (mode === 'prefix') {
      activeInput.innerText = content + activeInput.innerText;
    } else if (mode === 'suffix') {
      activeInput.innerText = activeInput.innerText + content;
    } else {
      insertTextToInput(activeInput, content);
      return;
    }
  }
}

// 简易编辑对话框
function openEditDialog(existing?: ReturnType<typeof filteredPrompts>[number]) {
  const name = window.prompt('名称', existing?.name || ''); if (!name) return;
  const title = window.prompt('标题(可选)', existing?.title || '') || undefined;
  const content = window.prompt('内容', existing?.content || ''); if (!content) return;
  savePrompt({ id: existing?.id, name, title, content, tags: existing?.tags, categoryId: existing?.categoryId });
  renderList();
}
function editSelected() { const items = filteredPrompts(); if (activeIndex>=0 && activeIndex < items.length) openEditDialog(items[activeIndex]); }
function deleteSelected() { const items = filteredPrompts(); if (activeIndex>=0 && activeIndex < items.length) { if (confirm('确认删除?')) { const p = items[activeIndex]; deletePrompt(p.id); } renderList(); } }

function btnStyle(){ return 'font-size:12px; padding:2px 6px; cursor:pointer;'; }

function onSearchKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
  if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
  if (e.key === 'Enter') { e.preventDefault(); activateSelected(); }
}

export function openPromptPanel() {
  buildPanel();
  if (!panelEl) return;
  panelEl.style.display = 'flex';
  visible = true;
  activeIndex = -1;
  currentFilter = '';
  if (searchInput) { searchInput.value = ''; setTimeout(() => searchInput!.focus(), 0); }
  renderList();
}

export function closePromptPanel() {
  if (!panelEl) return;
  panelEl.style.display = 'none';
  visible = false;
}

// Hotkey registration (simple)
export function registerGlobalHotkey() {
  window.addEventListener('keydown', e => {
    const settings = getSettings();
    if (!settings.hotkeys.openPanel) return;
    // Parse: support Ctrl+Shift+P style
    const combo = settings.hotkeys.openPanel.toLowerCase();
    const needCtrl = combo.includes('ctrl+');
    const needShift = combo.includes('shift+');
    const needAlt = combo.includes('alt+');
    const key = combo.split('+').pop();
    if (
      (!!needCtrl === e.ctrlKey) &&
      (!!needShift === e.shiftKey) &&
      (!!needAlt === e.altKey) &&
      e.key.toLowerCase() === key
    ) {
      // Avoid firing inside inputs if already open etc.
      e.preventDefault();
      openPromptPanel();
    }
  });
}
