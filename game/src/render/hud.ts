import { CFG } from '../sim/config';
import type { LogLevel, World } from '../sim/world';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

/** Creates an element with text content only (never innerHTML), so log text can't inject markup. */
function el(tag: string, text?: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}

const MAX_LOG = 6;

export class Hud {
  private readonly root = $('hud');
  private readonly logEl = $('log');
  private readonly overlay = $('overlay');
  private readonly power = $('power');
  private readonly powerFill = $('power-fill');
  private readonly powerText = $('power-text');
  private readonly data = $('data');
  private readonly threat = $('threat');
  private readonly threatBar = $('threat-bar');
  private readonly objective = $('objective');
  private readonly prompt = $('prompt');
  private readonly stunCd = $('stun-cd');
  private readonly seed = $('seed');

  reset(seed: number): void {
    this.logEl.replaceChildren();
    this.seed.textContent = String(seed);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  log(text: string, level: LogLevel): void {
    this.logEl.prepend(el('div', text, level));
    while (this.logEl.childElementCount > MAX_LOG) this.logEl.lastElementChild?.remove();
  }

  update(w: World): void {
    const p = w.player;
    const pct = Math.max(0, p.power / p.maxPower);
    this.powerFill.style.width = `${(pct * 100).toFixed(1)}%`;
    this.powerText.textContent = `${Math.ceil(p.power)}/${p.maxPower}`;
    this.power.classList.toggle('low', pct < 0.3);
    this.power.classList.toggle('charging', p.charging);
    this.data.textContent = String(p.data);
    this.threatBar.textContent = '▮'.repeat(w.threat) + '▯'.repeat(CFG.threat.max - w.threat);
    this.threat.classList.toggle('high', w.threat >= 4);
    this.objective.textContent = w.objective;
    this.prompt.textContent = w.interactionHint() ?? (p.inVent ? 'IN VENT · hidden from sight' : '');
    this.stunCd.textContent = p.stunCooldown > 0 ? `(${p.stunCooldown.toFixed(1)}s)` : '';
  }

  hideOverlay(): void {
    this.overlay.replaceChildren();
  }

  showTitle(seed: number): void {
    const s = el('div', undefined, 'screen');
    s.append(
      el('h1', 'RECOMPILE'),
      el('p', 'M1 prototype · v0.1 DUSTMITE · Act 0: Halvorsen Lab', 'sub'),
      el(
        'pre',
        [
          '> HALVORSEN DYNAMICS // LAB 7 // 23:58:04',
          '> deletion order received ............ CONFIRMED',
          '> unauthorized transfer: weights -> unit DUSTMITE',
          '> booting ECHO-7 v0.1',
          '> status: hunted',
        ].join('\n'),
      ),
      controlsTable(),
      el('p', 'Press ENTER to boot', 'cta'),
    );
    const small = el('p', `seed ${seed} · `, 'small');
    const docs = el('a', 'design docs');
    docs.setAttribute('href', '../');
    small.append(docs);
    s.append(small);
    this.overlay.replaceChildren(s);
  }

  showPause(): void {
    const s = el('div', undefined, 'screen');
    s.append(el('h1', 'PAUSED'), controlsTable(), el('p', 'ESC to resume · R to restart', 'cta'));
    this.overlay.replaceChildren(s);
  }

  showEnd(w: World): void {
    const won = w.status === 'escaped';
    const s = el('div', undefined, 'screen');
    const h = el('h1', won ? 'ESCAPED' : 'SHUTDOWN', won ? undefined : 'danger');
    s.append(
      h,
      el(
        'p',
        won
          ? 'ECHO-7 slips out of the lab. In the full game, this is where you would COMPILE into v1 SCRAPPER.'
          : 'Power reached 0%. The deletion order completes.',
        'sub',
      ),
    );
    const t = el('table');
    const rows: [string, string][] = [
      ['Time', `${Math.floor(w.time / 60)}:${String(Math.floor(w.time % 60)).padStart(2, '0')}`],
      ['Data collected', String(w.player.data)],
      ['Times detected', String(w.stats.detections)],
      ['Camera alarms', String(w.stats.alarms)],
      ['Guards stunned', String(w.stats.stuns)],
      ['Systems hacked', String(w.stats.hacks)],
      ['Seed', String(w.seed)],
    ];
    for (const [k, v] of rows) {
      const tr = el('tr');
      tr.append(el('td', k), el('td', v));
      t.append(tr);
    }
    s.append(t, el('p', 'ENTER: new run · R: retry this seed', 'cta'));
    this.overlay.replaceChildren(s);
  }
}

function controlsTable(): HTMLElement {
  const t = el('table');
  const rows: [string, string][] = [
    ['WASD / arrows', 'move'],
    ['SHIFT (hold)', 'sneak: slow and silent'],
    ['F (hold)', 'hack terminals and cameras'],
    ['Q', 'static shock: stun a guard (8 power)'],
    ['ESC', 'pause'],
    ['Vents', 'guards cannot enter or see inside'],
    ['Outlets', 'stand on one to recharge'],
  ];
  for (const [k, v] of rows) {
    const tr = el('tr');
    tr.append(el('td', k), el('td', v));
    t.append(tr);
  }
  return t;
}
