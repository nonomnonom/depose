# Request lifecycle

Every API request follows the same path. Uploads are the only exception: they
are parsed as raw bodies up to 100 MB before the JSON parser runs.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser or API client
  participant E as Express
  participant T as TenancyMiddleware
  participant G as Auth, CSRF, permission guards
  participant Z as ZodBodyPipe
  participant C as Controller
  participant S as Service
  participant DB as Postgres

  B->>E: request with host and cookie or bearer key
  E->>E: request id, security headers, CORS
  E->>T: resolve x-forwarded-host
  alt unknown host
    T-->>B: 404 TENANT_NOT_FOUND
  else known firm
    T->>T: attach firm, user, role
    T->>G: continue
    alt no session or invalid key
      G-->>B: 401 UNAUTHENTICATED
    else missing permission
      G-->>B: 403 FORBIDDEN
    else mutation without CSRF token
      G-->>B: 403 CSRF_FAILED
    else allowed
      G->>Z: validate body
      alt invalid body
        Z-->>B: 400 VALIDATION_ERROR with details
      else valid
        Z->>C: typed DTO
        C->>S: call with actor
        S->>DB: firm- and matter-scoped query
        DB-->>S: rows
        S-->>B: { data } or DomainError
      end
    end
  end
```

## Details that matter

- The host is the tenant key. `TRUST_PROXY=true` makes Express read
  `x-forwarded-host` from the trusted proxy; direct client headers are ignored
  otherwise.
- `/api/auth/*` is handled by Better Auth before Nest routing and has its own
  limiter. Auth responses are not wrapped in the `{ data }` envelope.
- `/api/v1/*` JSON is limited to 1 MB. The document upload route accepts raw
  bodies up to 100 MB with an allowlisted MIME type.
- Controllers never read `request.body` directly. `ZodBodyPipe` produces the
  DTO and rejects unknown or malformed fields.
- The actor (`firmId`, `userId`, role, permissions) comes from the session or
  API key. A client-supplied `firmId` is never trusted.
- `DomainError` carries a stable code, an HTTP status, and optional details.
  `common/exception.filter.ts` adds `requestId`; clients should log that id.
- Response bodies for API routes are `{ "data": ... }`. Lists add pagination
  metadata through the shared pagination helper.

## Where to change it

| Concern | File |
| --- | --- |
| Middleware order, body limits, CORS | `src/app.bootstrap.ts` |
| Request id and security headers | `src/common/request-id.middleware.ts`, `security-headers.middleware.ts` |
| Tenant resolution | `src/modules/tenancy` |
| Session and API-key authentication | `src/modules/auth`, `src/modules/api-keys` |
| CSRF and permissions | `src/common/csrf.guard.ts`, `src/modules/access-control` |
| Error envelope | `src/common/domain-error.ts`, `exception.filter.ts` |
