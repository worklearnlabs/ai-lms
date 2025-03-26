# Error Logs and Issue Tracking

This document tracks issues, bugs, and their resolutions for the AI LMS system.

## Blueprint Creation and Debugging

| ID      | Issue                                 | Description                                                | Status     | Resolution                                                       | Date       |
| ------- | ------------------------------------- | ---------------------------------------------------------- | ---------- | ---------------------------------------------------------------- | ---------- |
| BUG-001 | Debug panel not appearing             | Debug panel couldn't be toggled via Debug button           | ✅ Fixed   | Implemented isDebugOpen state and toggle function                | 2023-10-15 |
| BUG-002 | Missing API debug data                | API requests and responses weren't captured for inspection | ✅ Fixed   | Added apiDebugData state and update logic                        | 2023-10-15 |
| BUG-003 | useState inside callback              | React error - useState used in self-invoking function      | ✅ Fixed   | Moved state declaration outside the callback                     | 2023-10-15 |
| BUG-004 | Unused imports causing linter errors  | Various unused Lucide icon imports                         | ⚠️ Pending | Need to clean up unused imports                                  | 2023-10-15 |
| BUG-005 | Missing tab interface in debug window | Debug window only showed blueprint data                    | ✅ Fixed   | Implemented BlueprintDebugWindow component with tabbed interface | 2023-10-15 |

## AI Orchestrator Issues

| ID      | Issue                                      | Description                                           | Status   | Resolution                                                 | Date       |
| ------- | ------------------------------------------ | ----------------------------------------------------- | -------- | ---------------------------------------------------------- | ---------- |
| BUG-101 | No fallback when OpenAI failed             | System would crash if OpenAI API was unavailable      | ✅ Fixed | Implemented fallback mechanism to Anthropic and Perplexity | 2023-10-10 |
| BUG-102 | Services marked as unavailable permanently | Once marked unavailable, services never recovered     | ✅ Fixed | Added automatic service restoration after timeout          | 2023-10-10 |
| BUG-103 | Error handling inconsistent                | Different error formats from different providers      | ✅ Fixed | Standardized error handling and response formats           | 2023-10-10 |
| BUG-104 | No visibility into service status          | Developers couldn't see which services were available | ✅ Fixed | Added serviceStatus tracking object and logging            | 2023-10-15 |

## Blueprint API Issues

| ID      | Issue                                       | Description                                              | Status   | Resolution                                                         | Date       |
| ------- | ------------------------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------------ | ---------- |
| BUG-201 | Blueprint finalization missing user context | Generated blueprints didn't account for user skill level | ✅ Fixed | Added user skill level and learning objectives to finalize request | 2023-10-15 |
| BUG-202 | Debug data not persistent                   | Debug results were lost between interactions             | ✅ Fixed | Added persistent state for debug data                              | 2023-10-15 |
| BUG-203 | Error handling for malformed JSON           | JSON parsing errors weren't handled                      | ✅ Fixed | Added try/catch for JSON parsing in debug window                   | 2023-10-15 |

## Dependency and Build Issues

| ID      | Issue                             | Description                                                           | Status   | Resolution                                                            | Date       |
| ------- | --------------------------------- | --------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- | ---------- |
| BUG-401 | Next.js version mismatch          | Installed Next.js 14.1.3 did not match package.json (15.2.1-canary.3) | ✅ Fixed | Updated Next.js to match package.json version                         | 2023-03-26 |
| BUG-402 | Tailwind CSS PostCSS plugin error | Tailwind CSS v4 requires separate PostCSS plugin                      | ✅ Fixed | Installed @tailwindcss/postcss and updated PostCSS config             | 2023-03-26 |
| BUG-403 | Vercel deployment failing         | NPM dependency resolution conflicts on Vercel                         | ✅ Fixed | Updated vercel.json to use pnpm with --no-frozen-lockfile flag        | 2023-03-26 |
| BUG-404 | Lockfile inconsistencies          | pnpm-lock.yaml out of sync with package.json                          | ✅ Fixed | Added pnpm-workspace.yaml and configured for proper workspace support | 2023-03-26 |

## Planned Fixes

| ID      | Issue                               | Description                                     | Priority | Planned Date |
| ------- | ----------------------------------- | ----------------------------------------------- | -------- | ------------ |
| BUG-301 | Clean up unused imports             | Remove unused Lucide icons and other imports    | Medium   | 2023-10-20   |
| BUG-302 | Add error boundary for debug window | Prevent debug window errors from crashing app   | High     | 2023-10-20   |
| BUG-303 | Improve error messages              | More user-friendly error messages across system | Medium   | 2023-10-25   |

## How to Report a New Issue

1. Add a new entry to this log with the next available ID
2. Fill in all columns with relevant details
3. Set status to one of:
   - ⏳ Pending (identified but not fixed)
   - 🔄 In Progress (currently being worked on)
   - ✅ Fixed (resolved)
   - ❌ Won't Fix (intentionally not addressing)
4. If fixed, include the resolution and date

## Integration with Notion Ticket System

For team collaboration, issues are also tracked in Notion. To add a new issue to Notion:

```bash
# From project root
node notion-ticket-system/cli/add-logs.ts --id BUG-XXX --status pending --description "Description of the issue"
```

To update an existing issue:

```bash
# From project root
node notion-ticket-system/cli/update-logs.ts --id BUG-XXX --status fixed --resolution "How the issue was fixed"
```
