# User journeys

These are the four paths that matter most. They assume the server is reachable
and the user has a firm account.

## First run: operator creates the firm

```mermaid
journey
  title First firm setup
  section Operator
    Open the bootstrap host: 5: Operator
    Sign up or sign in: 4: Operator
    Enter firm name and jurisdiction: 5: Operator
    Create primary domain: 4: Operator
    Land in matters: 5: Operator
  section System
    Mark host as configured: 5: System
    Seed default roles: 5: System
```

## Invited member

```mermaid
flowchart LR
  Mail["Invitation email"] --> Link["/invitations/:token"]
  Link --> Review["See firm, inviter, role, expiry"]
  Review --> Accept{"Accept?"}
  Accept -- yes --> Member["Member row created"]
  Member --> Login["Login or SSO"]
  Login --> Matters["Matter list"]
  Accept -- no --> Expired["Leave; token stays pending until expiry"]
```

## Matter review

```mermaid
journey
  title From upload to reviewed draft
  section Intake
    Create a matter: 5: Lawyer
    Upload documents: 4: Paralegal
    Wait for OCR and extraction: 3: System
  section Evidence
    Confirm or reject candidate facts: 5: Lawyer
    Read chronology: 4: Lawyer
    Check contradictions: 4: Lawyer
  section Output
    Ask a grounded question: 4: Lawyer
    Open citations and source pages: 5: Lawyer
    Review the output draft: 4: Lawyer
```

Each step keeps the source one click away: fact to document page, answer to
cited fact, contradiction to both facts.

## Live hearing check

```mermaid
flowchart TD
  Start["Start live session"] --> Line["Type or paste a line"]
  Line --> Save["Line is saved"]
  Save --> Check["Check against fact bank"]
  Check --> Verdict{"Verdict"}
  Verdict -- consistent --> Quiet["No alert; line keeps verdict"]
  Verdict -- contradicts --> Alert["Alert with cited facts"]
  Verdict -- silent --> Alert
  Verdict -- unclear --> Alert
  Alert --> Review["Lawyer acknowledges or dismisses"]
  Review --> End["End session"]
  Quiet --> End
```

## Roles and visibility

- **Owner/admin**: firm settings, domains, members, invitations, API keys.
- **Lawyer**: matters they can access, evidence review, outputs, live review.
- **Paralegal**: upload, chronology, live transcription; review actions depend
  on permissions.
- **API key**: explicit scopes; read-only unless a write scope is granted.

The client does not invent permissions. Hiding an action is a convenience;
the server still checks the permission on every request, and the client must
never treat a hidden button as authorization.
