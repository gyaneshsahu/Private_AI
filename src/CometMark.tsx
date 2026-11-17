/** The CometRow mark: a round head of light with a two-part tail (evaluation/ui-redesign/mock.html). */
export function CometMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 22" aria-hidden="true">
      <path className="brand-tail" d="M13.2 8.8 1.6 20.4 10.4 6.9z" opacity=".3" />
      <path className="brand-tail" d="M14.6 10.2 1.6 20.4 11.8 7.4z" opacity=".55" />
      <circle className="brand-head" cx="15.5" cy="6.5" r="4.5" />
    </svg>
  );
}
