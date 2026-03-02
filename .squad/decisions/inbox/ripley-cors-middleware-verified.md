# Decision: CORS middleware config is correct — no changes needed

**By:** Ripley (Backend Dev)
**Date:** 2025-07

## Context

CORS errors in E2E tests (run 22566414169) led to a theory that CORSMiddleware might not add headers on error responses.

## Analysis

1. **Middleware ordering is correct.** Starlette builds the stack as: `ServerErrorMiddleware → CORSMiddleware → ExceptionMiddleware → Router`. CORSMiddleware wraps the exception handlers, so any JSONResponse from error handlers gets CORS headers.
2. **Regex matches.** The origin `https://agreeable-plant-04ffe2700-pr1.eastasia.6.azurestaticapps.net` matches `r"https://.*\.(azurestaticapps\.net|...)"`.
3. **Root cause was the 500.** The `nullslast()` error was caught by the catch-all exception handler and returned as a 500 JSONResponse. CORSMiddleware should have added headers to it, but the browser rejected the response because the 500 indicated a server failure. Now that `nullslast()` is fixed (commit eddc914), the API returns 200 with valid data, and CORS should work.

## Decision

No CORS config changes. Monitor the next pipeline run to confirm E2E CORS errors are resolved.
