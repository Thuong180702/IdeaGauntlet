# Security Policy

## Supported versions

IdeaGauntlet is pre-1.0. Security fixes are applied to the latest `0.x` release
published on npm. Please upgrade to the latest version before reporting an issue.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, report privately via GitHub's
[private vulnerability reporting](https://github.com/Thuong180702/IdeaGauntlet/security/advisories/new)
(Security → Report a vulnerability). Include:

- affected version(s),
- a description and impact,
- steps to reproduce or a proof of concept.

You can expect an initial response within a few days. Once a fix is released,
we're happy to credit you unless you prefer to stay anonymous.

## How IdeaGauntlet handles secrets

- **API keys are read from environment variables** (`ANTHROPIC_API_KEY`,
  `GROQ_API_KEY`, `IDEAGAUNTLET_API_KEY`, `IDEAGAUNTLET_SEARCH_API_KEY`) or CLI
  flags. They are **never written to generated files, reports, or logs**, and
  are not persisted anywhere by the tool.
- Idea text is treated as **data, not executable input** — it is never used to
  build or run shell commands.
- MCP `save_report` and CLI report writes are constrained to the project's
  `.idea-gauntlet/reports/` directory (path traversal is rejected).
- Outbound web-research fetches pass through an SSRF guard that rejects
  private/loopback/link-local addresses.

If you configure a custom provider or OpenAI-compatible endpoint, your key is
sent only to the `baseUrl` you supply. Treat your keys like passwords and never
commit them to source control.
