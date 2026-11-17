// A bar chart drawn in the browser from a ```chart block in an answer (UI redesign, 18 November).
// The model writes a few numbers as JSON; nothing is fetched and no library is used. Anything that
// does not parse as the shape below stays an ordinary code block.
import { useText } from "./i18n";
import { answerText } from "./text/conversation-ui";

export interface ChartData {
  title?: string;
  unit?: string;
  labels: string[];
  values: number[];
}

const MAX_BARS = 24;

/** The chart in a block's text, or undefined when it is not a valid chart (then the block shows as code). */
export function parseChart(text: string): ChartData | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!raw || typeof raw !== "object") return undefined;
  const { title, unit, labels, values } = raw as Record<string, unknown>;
  if (!Array.isArray(labels) || !Array.isArray(values)) return undefined;
  if (!labels.length || labels.length !== values.length || labels.length > MAX_BARS) return undefined;
  if (!labels.every((l) => typeof l === "string" || typeof l === "number")) return undefined;
  if (!values.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)) return undefined;
  if (title !== undefined && typeof title !== "string") return undefined;
  if (unit !== undefined && typeof unit !== "string") return undefined;
  return {
    title: title?.slice(0, 120),
    unit: unit?.slice(0, 12),
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
  const format = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const name = chart.title ?? t.chart;
  return (
    <figure className="answer-chart" aria-label={name}>
      <figcaption>
        <span>{name}</span>
        {chart.unit && <span className="answer-chart-unit">{chart.unit}</span>}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {chart.values.map((v, i) => {
          const h = Math.max(2, ((height - top - bottom) * v) / max);
          const x = slot * i + (slot - bar) / 2;
          const y = height - bottom - h;
          return (
            <g key={i}>
              <rect className={v === max ? "bar top" : "bar"} x={x} y={y} width={bar} height={h} rx={5} />
              {n <= 12 && (
                <text className="value" x={x + bar / 2} y={y - 6} textAnchor="middle">
                  {format(v)}
                </text>
              )}
              <text className="label" x={x + bar / 2} y={height - 6} textAnchor="middle">
                {chart.labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
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
