// Adapted from Magic UI "Light Rays" (MIT, https://magicui.design/docs/components/light-rays).
// Changes: plain CSS instead of Tailwind, normal blending so the rays show on a light background,
// and alternating brand colours per ray.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";

type Ray = {
  id: string;
  left: number;
  rotate: number;
  width: number;
  swing: number;
  delay: number;
  duration: number;
  intensity: number;
  colour: string;
};

const createRays = (count: number, cycle: number, colours: string[]): Ray[] =>
  Array.from({ length: count }, (_, index) => {
    const left = 8 + Math.random() * 84;
    return {
      id: `${index}-${Math.round(left * 10)}`,
      left,
      rotate: -28 + Math.random() * 56,
      width: 160 + Math.random() * 160,
      swing: 0.8 + Math.random() * 1.8,
      delay: Math.random() * cycle,
      duration: cycle * (0.75 + Math.random() * 0.5),
      intensity: 0.6 + Math.random() * 0.5,
      colour: colours[index % colours.length],
    };
  });

export function LightRays({
  count = 7,
  colours = ["rgba(139, 92, 246, 0.55)", "rgba(242, 80, 155, 0.42)", "rgba(90, 141, 255, 0.42)"],
  blur = 36,
  speed = 14,
  length = "70vh",
}: {
  count?: number;
  colours?: string[];
  blur?: number;
  speed?: number;
  length?: string;
}) {
  const reduce = useReducedMotion();
  const [rays, setRays] = useState<Ray[]>([]);
  const cycle = Math.max(speed, 0.1);

  useEffect(() => {
    setRays(createRays(count, cycle, colours));
    // colours is a stable default; regenerate only when the count or speed changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cycle]);

  return (
    <div
      className="light-rays"
      aria-hidden="true"
      style={{ "--light-rays-blur": `${blur}px`, "--light-rays-length": length } as CSSProperties}
    >
      <div className="light-rays-wash light-rays-wash-a" />
      <div className="light-rays-wash light-rays-wash-b" />
      {rays.map((ray) => (
        <motion.div
          key={ray.id}
          className="light-ray"
          style={{ left: `${ray.left}%`, width: ray.width, "--ray-colour": ray.colour } as CSSProperties}
          initial={{ rotate: ray.rotate, opacity: reduce ? ray.intensity * 0.6 : 0 }}
          animate={
            reduce
              ? undefined
              : {
                  opacity: [0, ray.intensity, 0],
                  rotate: [ray.rotate - ray.swing, ray.rotate + ray.swing, ray.rotate - ray.swing],
                }
          }
          transition={{
            duration: ray.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: ray.delay,
            repeatDelay: ray.duration * 0.1,
          }}
        />
      ))}
    </div>
  );
}
