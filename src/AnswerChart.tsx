// A chart drawn in the browser from a ```chart block in an answer (UI redesign 18 November; the
// AI's rule is in src/conversation.ts, design in docs/charts-20261118.md). The model writes a few
// numbers as JSON; nothing is fetched and no library is used. Anything that does not parse as the
// shape below stays an ordinary code block.
import { useText } from "./i18n";
import { answerText } from "./text/conversation-ui";

export interface ChartData {
  type: "bar" | "line";
  title?: string;
  unit?: string;
  source?: string;
  labels: string[];
  values: number[];
}

const MAX_POINTS = 24;

/** The chart in a block's text, or undefined when it is not a valid chart (then the block shows as code). */
export function parseChart(text: string): ChartData | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!raw || typeof raw !== "object") return undefined;
  const { type, title, unit, source, labels, values } = raw as Record<string, unknown>;
  if (!Array.isArray(labels) || !Array.isArray(values)) return undefined;
  if (labels.length < 2 || labels.length !== values.length || labels.length > MAX_POINTS) return undefined;
  if (!labels.every((l) => typeof l === "string" || typeof l === "number")) return undefined;
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)) return undefined;
  for (const field of [title, unit, source]) if (field !== undefined && typeof field !== "string") return undefined;
  if (type !== undefined && type !== "bar" && type !== "line") return undefined;
  return {
    type: type === "line" ? "line" : "bar",
    title: (title as string | undefined)?.slice(0, 120),
    unit: (unit as string | undefined)?.slice(0, 12),
    source: (source as string | undefined)?.slice(0, 160) || undefined,
    labels: labels.map((l) => String(l).slice(0, 24)),
    values: values as number[],
  };
}

export function AnswerChart({ chart }: { chart: ChartData }) {
  const t = useText(answerText);
  const width = 600;
  const height = 190;
  const top = 22;
  const bottom = 24;
  const n = chart.values.length;
  const max = Math.max(...chart.values) || 1;
  const slot = width / n;
  const bar = Math.min(64, slot * 0.62);
  const y = (v: number) => height - bottom - Math.max(2, ((height - top - bottom) * v) / max);
  const x = (i: number) => slot * i + slot / 2;
  const format = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const name = chart.title ?? t.chart;
  const showValues = n <= 12;
  return (
    <figure className="answer-chart" aria-label={name} data-type={chart.type}>
      <figcaption>
        <span>{name}</span>
        {chart.unit && <span className="answer-chart-unit">{chart.unit}</span>}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {chart.type === "line" ? (
          <>
            <polyline className="line" points={chart.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {chart.values.map((v, i) => (
              <g key={i}>
                <circle className={v === max ? "dot top" : "dot"} cx={x(i)} cy={y(v)} r={4} />
                {showValues && (
                  <text className="value" x={x(i)} y={y(v) - 9} textAnchor="middle">
                    {format(v)}
                  </text>
                )}
                <text className="label" x={x(i)} y={height - 6} textAnchor="middle">
                  {chart.labels[i]}
                </text>
              </g>
            ))}
          </>
        ) : (
          chart.values.map((v, i) => (
            <g key={i}>
              <rect className={v === max ? "bar top" : "bar"} x={x(i) - bar / 2} y={y(v)} width={bar} height={height - bottom - y(v)} rx={5} />
              {showValues && (
                <text className="value" x={x(i)} y={y(v) - 6} textAnchor="middle">
                  {format(v)}
                </text>
              )}
              <text className="label" x={x(i)} y={height - 6} textAnchor="middle">
                {chart.labels[i]}
              </text>
            </g>
          ))
        )}
      </svg>
      {chart.source && (
        <p className="answer-chart-source">
          {t.chartSource}: {chart.source}
        </p>
      )}
      {/* The same numbers for screen readers (the drawing is hidden from them). */}
      <table className="sr-only">
        <caption>{name}</caption>
        <tbody>
          {chart.labels.map((label, i) => (
            <tr key={i}>
              <th scope="row">{label}</th>
              <td>
                {format(chart.values[i])}
                {chart.unit ? ` ${chart.unit}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
