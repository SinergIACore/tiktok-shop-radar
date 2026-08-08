/** Application-level configuration (no secrets). */
export const appConfig = {
  name: "TikRadar AI",
  tagline: "Product & Creative Intelligence",
  /** Data source currently powering the UI. */
  dataSource: "mock" as "mock" | "api",
  /** Public base URL for a future own API. Never contains secrets. */
  apiBaseUrl: import.meta.env["VITE_API_BASE_URL"] ?? "",
} as const;
