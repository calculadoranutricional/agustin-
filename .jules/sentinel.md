## 2026-10-13 - API Endpoint Payload Validation and Length Limits
**Vulnerability:** Unbounded string payload sizes in Express backend routes (`/api/chat` and `/api/analyze-food`) allowing large text input and unbounded history arrays, posing DoS and API quota exhaustion risks.
**Learning:** In SSR/Express Node.js apps handling AI LLM prompts, input length constraints and array truncation (e.g. keeping only the last N items) are critical defense-in-depth measures to prevent resource consumption attacks.
**Prevention:** Always enforce strict body size limits (`express.json({limit: '100kb'})`), disable server headers (`app.disable('x-powered-by')`), and validate character count limits on string parameters before invoking AI models.
