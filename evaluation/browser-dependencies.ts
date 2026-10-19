// Fixed-discovery Vite runners must also prebundle the extraction worker imports.
// Keep this shared with the synthetic browser regression so new formats cannot
// silently break extraction before an inference request is attempted.
export const documentBrowserDependencies = [
  "pdfjs-dist",
  "tesseract.js",
  "zod",
  "saxes",
  "@zip.js/zip.js",
];

export const workspaceBrowserDependencies = [
  ...documentBrowserDependencies,
  "react",
  "react-dom/client",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-markdown",
  "remark-gfm",
  "remark-math",
  "rehype-katex",
  "unist-util-visit",
  "tinfoil",
  "ehbp",
];
