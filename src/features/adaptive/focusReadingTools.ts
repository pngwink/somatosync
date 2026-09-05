const originalPlainText = new Map<Text, string>();

const SIMPLE_LANGUAGE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bcognitive fatigue\b/gi, "mental tiredness"],
  [/\bcognitive difficulty\b/gi, "thinking difficulty"],
  [/\bcognitive load\b/gi, "mental effort"],
  [/\bvisual-motion discomfort\b/gi, "discomfort from moving visuals"],
  [/\bvisual sensitivity\b/gi, "light sensitivity"],
  [/\bvisual difficulty\b/gi, "reading or seeing difficulty"],
  [/\bpostural movement\b/gi, "body movement"],
  [/\bpostural-movement\b/gi, "body-movement"],
  [/\baccommodations\b/gi, "supports"],
  [/\baccommodation\b/gi, "support"],
  [/\binterventions\b/gi, "supports"],
  [/\bintervention\b/gi, "support"],
  [/\bindividualized\b/gi, "personalized"],
  [/\bassessment results\b/gi, "check results"],
  [/\bassessment\b/gi, "check"],
  [/\bassessments\b/gi, "checks"],
  [/\bseverity\b/gi, "level"],
  [/\bsymptom burden\b/gi, "overall symptom level"],
  [/\btrajectory\b/gi, "change over time"],
  [/\bcalibration\b/gi, "setup"],
  [/\bmonitoring\b/gi, "tracking"],
  [/\bclinician\b/gi, "healthcare professional"],
  [/\bvestibular\b/gi, "balance and motion"],
  [/\bphotophobia\b/gi, "light sensitivity"],
  [/\btolerance\b/gi, "how well you can handle it"],
  [/\bfunctionally\b/gi, "in daily life"],
  [/\bfunctional\b/gi, "daily-life"],
  [/\binitiate\b/gi, "start"],
  [/\butilize\b/gi, "use"],
  [/\bapproximately\b/gi, "about"],
  [/\bprior to\b/gi, "before"],
];

function preserveCase(original: string, replacement: string) {
  if (original.toUpperCase() === original) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function simplifyText(value: string) {
  return SIMPLE_LANGUAGE_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, (match) => preserveCase(match, replacement)),
    value,
  );
}

function shouldSimplifyNode(node: Text) {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue?.trim()) return false;
  if (parent.closest('[data-focus-preserve-text="true"]')) return false;
  if (parent.closest('button, a, input, textarea, select, option, code, pre, script, style, svg, [role="alert"]')) return false;
  return Boolean(parent.closest('p, li, dd, dt, blockquote'));
}

export function applyPlainLanguage(root: ParentNode = document) {
  const content = root instanceof Document ? root.querySelector('.app-content') : root;
  if (!content) return;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (shouldSimplifyNode(textNode)) {
      if (!originalPlainText.has(textNode)) originalPlainText.set(textNode, textNode.nodeValue ?? '');
      const simplified = simplifyText(originalPlainText.get(textNode) ?? textNode.nodeValue ?? '');
      if (textNode.nodeValue !== simplified) textNode.nodeValue = simplified;
    }
    current = walker.nextNode();
  }
}

export function restorePlainLanguage() {
  for (const [node, original] of originalPlainText) {
    if (node.isConnected) node.nodeValue = original;
  }
  originalPlainText.clear();
}

function visibleReadingText() {
  const root = document.querySelector('.app-content');
  if (!root) return '';
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, blockquote'));
  return blocks
    .filter((element) => {
      if (element.closest('[aria-hidden="true"], [hidden], nav, footer, button, [role="dialog"]')) return false;
      const style = window.getComputedStyle(element);
      return element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05;
    })
    .map((element) => element.innerText.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('. ')
    .slice(0, 7000);
}

export function readCurrentPageAloud() {
  if (!("speechSynthesis" in window)) return false;
  const text = visibleReadingText();
  if (!text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => /en-US/i.test(voice.lang) && /natural|enhanced|samantha|ava|aria|jenny/i.test(voice.name))
    ?? voices.find((voice) => /en-US/i.test(voice.lang))
    ?? voices.find((voice) => /^en/i.test(voice.lang));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopReadingAloud() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
