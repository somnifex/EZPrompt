import { getCurrentSite } from '../storage/local';

export interface DetectedInput {
  el: HTMLTextAreaElement | HTMLDivElement | HTMLInputElement;
  strategy: 'value' | 'composition' | 'contenteditable';
}

const listeners: Array<(input: DetectedInput) => void> = [];

export function onInputDetected(cb: (input: DetectedInput) => void) {
  listeners.push(cb);
  // 如果已经存在，立即回调
  detectedInputs.forEach(i => cb(i));
}

const detectedInputs: DetectedInput[] = [];

function detectInputs() {
  const site = getCurrentSite();
  if (!site) return;
  for (const sel of site.inputSelectors) {
    document.querySelectorAll(sel).forEach(el => {
      if (!(el instanceof HTMLElement)) return;
      if (detectedInputs.some(d => d.el === el)) return;
      const strategy = site.textareaStrategy || (el.getAttribute('contenteditable') === 'true' ? 'contenteditable' : 'value');
      const di: DetectedInput = { el: el as any, strategy };
      detectedInputs.push(di);
      listeners.forEach(l => l(di));
    });
  }
}

// MutationObserver + 轮询
const mo = new MutationObserver(() => detectInputs());
if (document.body) {
  mo.observe(document.body, { childList: true, subtree: true });
}
setInterval(detectInputs, 3000);

detectInputs();
