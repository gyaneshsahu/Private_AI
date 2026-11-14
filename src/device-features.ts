/**
 * Switches for features that run only on the device (docs/read-aloud-and-pdf-export-20261114.md).
 * Each is off unless the build sets its variable to "1", like VITE_GERMAN_UI. Build settings and
 * not /api/status fields: neither feature sends or receives anything, so the server has no part.
 */
const on = (name: string): boolean => {
  // Read in two steps: Vite and Vitest only fill the plain `import.meta.env` form.
  const env: ImportMetaEnv | undefined = import.meta.env;
  return env?.[name] === "1";
};
export const readAloudEnabled = () => on("VITE_READ_ALOUD");
export const pdfExportEnabled = () => on("VITE_PDF_EXPORT");
