// The view follows the newest text while an answer streams. It stops when the user moves up and
// starts again at the bottom or through the "Jump to latest" button.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Moving down to within this many pixels of the end counts as "back at the bottom". */
const SLACK = 48;

/**
 * Whether to keep following after a scroll event. `distance` is how far the view is from the end.
 * Any move up away from the end stops it (wheel, keys, touch, scrollbar). Our own scrolling only
 * moves down, so it never stops it. Arriving at the end starts it again.
 */
export function nextFollowing(
  following: boolean,
  lastTop: number,
  top: number,
  distance: number,
): boolean {
  if (distance <= 2) return true;
  if (top < lastTop) return false;
  if (top > lastTop && distance <= SLACK) return true;
  return following;
}

const reducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * `end` is the marker after the last message; its scroll container is the nearest <main>.
 * `jumpKey` changes when a message is added, another conversation opens or the conversation view
 * comes back on screen: the view goes to the end.
 * Returns whether the user is away from the end (show the button) and the jump function.
 */
export function useFollowScroll(end: RefObject<HTMLElement | null>, jumpKey: string) {
  const following = useRef(true);
  const [away, setAway] = useState(false);
  const toEnd = useCallback(
    (smooth: boolean) => {
      const scroller = end.current?.closest("main");
      if (!scroller) return;
      following.current = true;
      setAway(false);
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: smooth && !reducedMotion() ? "smooth" : "instant",
      });
    },
    [end],
  );
  useEffect(() => {
    const marker = end.current;
    const scroller = marker?.closest("main");
    if (!marker || !scroller) return;
    let lastTop = scroller.scrollTop;
    const onScroll = () => {
      const top = scroller.scrollTop;
      following.current = nextFollowing(
        following.current,
        lastTop,
        top,
        scroller.scrollHeight - top - scroller.clientHeight,
      );
      lastTop = top;
      setAway(!following.current);
    };
    // Streamed text, a table, a code block or the message box growing: stay at the end, in one
    // step without animation, so nothing jumps.
    const grown = new ResizeObserver(() => {
      if (following.current) scroller.scrollTop = scroller.scrollHeight;
    });
    grown.observe(marker.parentElement!);
    if (marker.parentElement!.parentElement) grown.observe(marker.parentElement!.parentElement);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      grown.disconnect();
      scroller.removeEventListener("scroll", onScroll);
    };
    // jumpKey: the marker is mounted again when the conversation view comes back.
  }, [end, jumpKey]);
  useEffect(() => toEnd(true), [jumpKey, toEnd]);
  return { away, toEnd };
}
