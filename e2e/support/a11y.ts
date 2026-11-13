import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// axe com as regras WCAG 2 A e AA. A falha lista regra, quantidade e o primeiro elemento de cada violacao.
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const summary = results.violations.map((violation) => {
    const node = violation.nodes[0];
    const detail = (node?.failureSummary ?? '').split('\n')[1]?.trim() ?? '';
    return `${violation.id} (${violation.impact}, ${violation.nodes.length}x): ${node?.target.join(' ')} | ${detail}`;
  });
  expect(summary, `violacoes de acessibilidade em ${page.url()}`).toEqual([]);
}

// Rolagem horizontal da pagina (nao de um container interno, como o quadro do pipeline).
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow, `rolagem horizontal em ${page.url()}`).toBeLessThanOrEqual(0);
}

interface FocusRing {
  tag: string;
  outlineStyle: string;
  outlineWidth: number;
  contrast: number;
}

// Indicador do elemento com foco: precisa existir (contorno de 2px ou mais) e contrastar 3:1 com o fundo
// em que e desenhado (WCAG 1.4.11). As cores sao lidas ja resolvidas, pintando-as num canvas.
export async function focusRing(page: Page): Promise<FocusRing> {
  return page.evaluate(async () => {
    // Botoes animam a cor (inclusive a do contorno): mede so depois de a transicao terminar.
    await Promise.all(
      (document.activeElement?.getAnimations() ?? []).map((animation) => animation.finished),
    );
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgba = (color: string): number[] => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const luminance = (color: number[]): number => {
      const [r, g, b] = color.slice(0, 3).map((value) => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    // O contorno tem afastamento: fica sobre o fundo do ancestral opaco mais proximo.
    let background = [255, 255, 255, 255];
    for (let node = element.parentElement; node; node = node.parentElement) {
      const candidate = rgba(getComputedStyle(node).backgroundColor);
      if (candidate[3] === 255) {
        background = candidate;
        break;
      }
    }
    const [hi, lo] = [luminance(rgba(style.outlineColor)), luminance(background)].sort(
      (a, b) => b - a,
    );
    return {
      tag: element.tagName.toLowerCase(),
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      contrast: (hi + 0.05) / (lo + 0.05),
    };
  });
}

export async function expectVisibleFocus(page: Page, what: string): Promise<void> {
  const ring = await focusRing(page);
  expect(ring.outlineStyle, `${what}: contorno de foco em <${ring.tag}>`).not.toBe('none');
  expect(ring.outlineWidth, `${what}: espessura do contorno`).toBeGreaterThanOrEqual(2);
  expect(ring.contrast, `${what}: contraste do contorno com o fundo`).toBeGreaterThanOrEqual(3);
}
