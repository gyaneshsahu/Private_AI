/** Developer-only details (token counts, weights versions, provider cost): a development build opened with ?developmentTools. */
export const developerView = () =>
  import.meta.env.DEV && new URLSearchParams(location.search).has("developmentTools");
