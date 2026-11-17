// The CometRow logo from the official kit (public/logo; never redrawn or recoloured, see its
// README.txt). Two images, one per theme: "dark" artwork on light backgrounds, "light" artwork on
// dark ones; the CSS shows the one that matches the page's theme (src/chat-design.css).
const KIT = "/logo/svg/cometrow-A-";

/** The horizontal lockup (mark and name): headers, the menu, sign-in. The name is in the artwork. */
export function BrandLockup({ label = "CometRow" }: { label?: string }) {
  return (
    <span className="brand-logo" role="img" aria-label={label}>
      <img className="brand-logo-dark" src={`${KIT}lockup-horizontal-dark.svg`} alt="" draggable={false} />
      <img className="brand-logo-light" src={`${KIT}lockup-horizontal-light.svg`} alt="" draggable={false} />
    </span>
  );
}

/** The mark alone: a collapsed menu, avatars, loading. */
export function CometMark() {
  return (
    <span className="brand-logo brand-icon" aria-hidden="true">
      <img className="brand-logo-dark" src={`${KIT}icon-dark.svg`} alt="" draggable={false} />
      <img className="brand-logo-light" src={`${KIT}icon-light.svg`} alt="" draggable={false} />
    </span>
  );
}
