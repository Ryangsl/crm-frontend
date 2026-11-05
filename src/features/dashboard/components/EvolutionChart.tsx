import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import type { EvolutionPoint } from '../services/dashboard';

type SeriesKey = 'leads' | 'opportunities' | 'won';

// Ordem e cores fixas, validadas para daltonismo (ver tokens --color-chart-*): a cor segue a serie e
// nunca muda com o tenant nem com o filtro.
const SERIES: Array<{ key: SeriesKey; label: string; stroke: string; dot: string }> = [
  { key: 'leads', label: 'Leads', stroke: 'stroke-chart-1', dot: 'bg-chart-1' },
  { key: 'opportunities', label: 'Oportunidades', stroke: 'stroke-chart-2', dot: 'bg-chart-2' },
  { key: 'won', label: 'Vendas', stroke: 'stroke-chart-3', dot: 'bg-chart-3' },
];

const HEIGHT = 240;
const MARGIN = { top: 10, right: 12, bottom: 24, left: 30 };

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude * 4 >= value) ?? 10;
  return step * magnitude * 4;
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function EvolutionChart({ points }: { points: EvolutionPoint[] }) {
  const { ref, width } = useWidth(640);
  const [active, setActive] = useState<number | null>(null);

  const series = SERIES.filter((item) => points.some((point) => point[item.key] !== null));
  const max = niceMax(
    Math.max(0, ...points.flatMap((point) => series.map((item) => point[item.key] ?? 0))),
  );
  const hasData = points.some((point) => series.some((item) => (point[item.key] ?? 0) > 0));

  const innerWidth = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) =>
    MARGIN.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * innerWidth);
  const y = (value: number) => MARGIN.top + innerHeight - (value / max) * innerHeight;

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(width / 70))));

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left - MARGIN.left) / innerWidth;
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  }

  if (!hasData) {
    return (
      <p className="py-10 text-center text-sm text-neutral-500">Sem movimentação no período.</p>
    );
  }

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span aria-hidden="true" className={`size-2 rounded-full ${item.dot}`} />
            {item.label}
          </li>
        ))}
      </ul>

      <div ref={ref} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Evolução no período: ${series.map((item) => item.label).join(', ')}. A tabela abaixo traz os valores.`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          className="block max-w-full touch-pan-y"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + innerWidth}
                y1={y(max * tick)}
                y2={y(max * tick)}
                className="stroke-border-subtle"
              />
              <text
                x={MARGIN.left - 6}
                y={y(max * tick) + 4}
                textAnchor="end"
                className="fill-neutral-500 text-[11px]"
              >
                {Math.round(max * tick)}
              </text>
            </g>
          ))}
          {points.map(
            (point, index) =>
              index % labelEvery === 0 && (
                <text
                  key={point.date}
                  x={x(index)}
                  y={HEIGHT - 6}
                  textAnchor="middle"
                  className="fill-neutral-500 text-[11px]"
                >
                  {formatDay(point.date)}
                </text>
              ),
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={MARGIN.top}
              y2={MARGIN.top + innerHeight}
              className="stroke-border-strong"
            />
          )}
          {series.map((item) => (
            <polyline
              key={item.key}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={item.stroke}
              points={points
                .map((point, index) => `${x(index)},${y(point[item.key] ?? 0)}`)
                .join(' ')}
            />
          ))}
          {active !== null &&
            series.map((item) => (
              <circle
                key={item.key}
                cx={x(active)}
                cy={y(points[active][item.key] ?? 0)}
                r={4}
                strokeWidth={2}
                className={`fill-surface ${item.stroke}`}
              />
            ))}
        </svg>

        {active !== null && (
          <div
            role="status"
            className="bg-surface border-border-subtle rounded-control shadow-raised pointer-events-none absolute top-1 z-10 min-w-32 border p-2 text-xs"
            style={
              x(active) > width / 2 ? { right: width - x(active) + 8 } : { left: x(active) + 8 }
            }
          >
            <p className="mb-1 font-medium text-neutral-900">{formatDay(points[active].date)}</p>
            {series.map((item) => (
              <p
                key={item.key}
                className="flex items-center justify-between gap-3 text-neutral-600"
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={`size-2 rounded-full ${item.dot}`} />
                  {item.label}
                </span>
                <span className="font-medium text-neutral-900 tabular-nums">
                  {points[active][item.key] ?? 0}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-2 text-xs text-neutral-500">
        <summary className="cursor-pointer">Ver como tabela</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th scope="col" className="py-1 font-medium">
                  Data
                </th>
                {series.map((item) => (
                  <th key={item.key} scope="col" className="py-1 font-medium">
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date} className="border-border-subtle border-t">
                  <td className="py-1">{formatDay(point.date)}</td>
                  {series.map((item) => (
                    <td key={item.key} className="py-1 tabular-nums">
                      {point[item.key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
