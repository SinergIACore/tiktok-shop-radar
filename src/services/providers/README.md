# Providers

Reserved for future external integrations (TikTok, AI, Storage, Publisher).

Rules:

- Each provider exposes an interface consumed by a service; the UI never
  imports a provider directly.
- Private API keys are never read in the browser. Provider implementations
  that require secrets must run on a server.
- No provider is implemented in Stage 01. This folder is a structural
  placeholder documented in `/docs/ARCHITECTURE.md`.
