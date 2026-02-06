# Vibrant

CLI to detect vibecoded (AI-generated) code. It reports warnings, alerts, and improvement suggestions. Use it from the terminal only—no imports.

## Usage

```bash
# Analyze the current directory
bun run cli .

# Or a specific path
bun run cli apps/cli

# Compact or JSON output
bun run cli . --format compact
bun run cli . --format json1

# List available rules
bun run cli rules

# Create config file
bun run cli init
```

## Global install

```bash
cd apps/cli && bun install -g .
# Then in any project:
vibrant .
vibrant src --format json
vibrant rules
```

## Structure

- **apps/cli**: the main product—the `vibrant` CLI (all linter logic lives here).
- **apps/web**: landing page (placeholder).

## Build

```bash
bun install
bun run build
```
