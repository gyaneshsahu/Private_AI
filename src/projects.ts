import { z } from "zod";

export const projectsSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
      })
      .strict(),
  )
  .max(100)
  .refine(
    (projects) =>
      new Set(projects.map((project) => project.id)).size === projects.length,
    "Duplicate project identity.",
  );
export type Project = z.infer<typeof projectsSchema>[number];
