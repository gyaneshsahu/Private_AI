// Parts of the page that load on demand (the answer renderer, PDF export, the account page) and
// what happens when one cannot be fetched, for example offline before it was ever loaded. Without
// a boundary a failed load unmounts the whole app; with one, only that part shows a retry line.
import { Component, lazy, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { useText } from "./i18n";
import { loadRetryText } from "./text/load-retry";

// Vite reports a stylesheet of a chunk that did not load and never asks for it again: we do.
// Listen only: preventDefault would make Vite resolve the import with undefined.
const failedStyles = new Set<string>();
if (typeof window !== "undefined")
  window.addEventListener("vite:preloadError", (event) => {
    const url = /Unable to preload CSS for (\S+)/.exec(
      String((event as Event & { payload?: Error }).payload?.message),
    )?.[1];
    if (url) failedStyles.add(new URL(url, location.href).href);
  });

function relinkFailedStyles() {
  return Promise.all(
    [...failedStyles].map((href) => {
      const old = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].find(
        (link) => link.href === href,
      );
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      return new Promise<void>((resolve, reject) => {
        link.onload = () => {
          failedStyles.delete(href);
          resolve();
        };
        link.onerror = () => reject(Error(`Unable to load ${href}`));
        if (old) old.replaceWith(link);
        else document.head.append(link);
      });
    }),
  );
}

/** The same-origin script a failed dynamic import names, if the browser said which. */
function failedModule(error: unknown) {
  const named = /https?:\/\/\S+?\.(?:js|jsx|ts|tsx)(?:\?\S*)?(?=\s|$)/.exec(
    String((error as Error | undefined)?.message),
  )?.[0];
  if (!named) return;
  return new URL(named).origin === location.origin ? named : undefined;
}

// A file fetched again under a fresh query, by its own address: later loads reuse that one copy.
const recovered = new Map<string, Promise<unknown>>();
function importAgain(url: string) {
  let loading = recovered.get(url);
  if (!loading) {
    const fresh = new URL(url);
    fresh.searchParams.set("retry", String(Date.now()));
    loading = import(/* @vite-ignore */ fresh.href);
    recovered.set(url, loading);
    loading.catch(() => recovered.delete(url));
  }
  return loading;
}

/**
 * A dynamic import that can succeed after an earlier failure. Chromium keeps a failed module fetch
 * for the life of the page, so the same file is asked for once more under a fresh query.
 * shortcut: a chunk that statically imports a failed chunk (pdf-export imports Answer) still fails
 * until a reload, and Safari names no file in its error; upgrade with a service worker cache.
 */
export async function importFresh<T>(load: () => Promise<T>): Promise<T> {
  for (let tries = 0; ; tries++) {
    await relinkFailedStyles();
    try {
      return await load();
    } catch (error) {
      const url = failedModule(error);
      if (url) return (await importAgain(url)) as T;
      // A stylesheet failed first (Vite then skips the script): fetch it again, then the script.
      if (tries || !failedStyles.size) throw error;
    }
  }
}

/** The sending code (src/inference.ts) for the send path, recovering like importFresh. */
export const loadInference = () => importFresh(() => import("./inference"));

// Lazy components whose last load failed: Retry makes each of them import again.
const failedLazies = new Set<() => void>();
const boundaries = new Set<LoadBoundary>();

/**
 * lazy() whose failed load can be retried: React keeps a failed lazy for good, so Retry swaps in
 * a new one. `load` should go through importFresh.
 */
// any: the same bound as React's lazy().
export function retryLazy<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  let Current: ComponentType<ComponentProps<T>>;
  const fresh = () => {
    Current = lazy(() =>
      load().catch((error) => {
        failedLazies.add(fresh);
        throw error;
      }),
    ) as ComponentType<ComponentProps<T>>;
  };
  fresh();
  return (props: ComponentProps<T>) => <Current {...props} />;
}

/** One Retry tries every failed part again. */
function retryAll() {
  for (const fresh of failedLazies) fresh();
  failedLazies.clear();
  for (const boundary of boundaries) if (boundary.state.failed) boundary.setState({ failed: false });
}

function RetryLine({ focus, retry }: { focus: boolean; retry: () => void }) {
  const t = useText(loadRetryText);
  return (
    <p className="load-retry">
      {t.failed}{" "}
      <button type="button" autoFocus={focus} onClick={retry}>
        {t.retry}
      </button>
    </p>
  );
}

/** Shows `placeholder` (if any) and a retry line instead of children that failed to load. */
export class LoadBoundary extends Component<
  { children: ReactNode; placeholder?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  // Set by this boundary's Retry, so a retry that fails again puts the focus back on the button.
  retried = false;
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidMount() {
    boundaries.add(this);
  }
  componentWillUnmount() {
    boundaries.delete(this);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <>
        {this.props.placeholder}
        <RetryLine
          focus={this.retried}
          retry={() => {
            this.retried = true;
            retryAll();
          }}
        />
      </>
    );
  }
}
