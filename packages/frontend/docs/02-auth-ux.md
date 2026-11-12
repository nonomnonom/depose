# Authentication UX

Guards decide which shell a visitor sees. `RequireGuest` keeps signed-in users
out of login/signup, `RequireSetup` sends a signed-in user to onboarding when
the host has no firm, and `RequireAuth` protects the workspace.

```mermaid
flowchart TD
  Visit["User opens the app"] --> Tenant["Tenant config loads"]
  Tenant --> Session{"Session exists?"}
  Session -- no --> Guest{"Login methods"}
  Guest -- password only --> Password["Email + password"]
  Guest -- SSO only --> SsoOnly["Email + Continue with SSO"]
  Guest -- both --> Choice["Switch between password and SSO"]
  Guest -- signup allowed --> Signup["Signup form"]
  Guest -- signup closed --> Closed["Contact firm admin"]
  Session -- yes --> Setup{"requiresSetup?"}
  Setup -- yes --> Onboarding["/setup creates firm + domain + admin"]
  Setup -- no --> Inbox{"Invitation link?"}
  Inbox -- yes --> Invite["Review firm/inviter, accept"]
  Inbox -- no --> Workspace["/matters"]
```

## Password login

1. User submits email and password.
2. The client calls Better Auth, then `GET /api/v1/me`.
3. The `me` response seeds the session query cache.
4. Redirect to `/setup`, the `returnTo` path, or `/matters`.

A failure keeps the form values and shows the server message. There is no
"forgot password" promise unless mail is configured.

## SSO login

SSO needs an email because the server routes the identity provider by domain.
The form validates the address locally, then redirects to the provider. A
failed start shows an inline error and re-enables the button.

```mermaid
sequenceDiagram
  participant U as User
  participant L as LoginPage
  participant API as /api/auth
  participant IdP as Identity provider
  participant Me as /api/v1/me

  U->>L: enter email
  U->>L: Continue with SSO
  L->>L: validate email
  L->>API: start SSO
  API-->>U: redirect to IdP
  U->>IdP: authenticate
  IdP-->>API: callback
  API-->>L: session cookie + redirect
  L->>Me: fetch current user
  Me-->>L: firm + permissions
  L-->>U: /matters
```

## Invitations

`/invitations/:token` is public. It shows the firm name, inviter, role, and
expiry before the user accepts. Accepting creates the member and sends the user
to login or directly into the workspace when a session already exists. A used,
revoked, or expired token renders a clear terminal state, not a retry loop.

## First-run setup

On the bootstrap host with no firm, only setup and health routes work.
`SetupFirmPage` creates the first firm, its primary domain, and the owner. After
success it clears the tenant query and navigates to the workspace. If the firm
already exists, the setup route is no longer shown.

## Email verification

When required, signup ends in a "check your email" state. The user cannot sign
in before verification. The resend action is only shown when mail is
configured; otherwise the page explains that a firm admin must help.
