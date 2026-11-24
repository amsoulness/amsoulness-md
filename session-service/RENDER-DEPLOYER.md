# Amsoulness Render deployer

The portfolio wizard is at https://aslns.online/session/deploy/render. It connects a GitHub account, verifies a Render API key, creates a new public Dockerfile wrapper repository, provisions a free PostgreSQL database (or accepts an existing URL), creates a free Docker web service and polls the Render deployment until live or failed.

## One-click GitHub sign-in

The connected GitHub plugin does not provide OAuth application credentials. Register an OAuth app owned by your account at https://github.com/settings/applications/new:

- Application name: Amsoulness Render Deployer
- Homepage URL: https://aslns.online
- Authorization callback URL: https://aslns-pairing-production.up.railway.app/api/render/oauth/callback

Set these variables on the Railway `aslns-pairing` service:

```text
GITHUB_OAUTH_CLIENT_ID=your_app_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_app_client_secret
```

Do not put the secret in GitHub or in Vite frontend variables. The backend advertises sign-in availability automatically. The wizard also supports a temporary GitHub classic token with `public_repo`; no OAuth app is needed for that mode. The public_repo permission itself grants write access to public repositories; this deployer only creates the repository named in the visitor's confirmation.

## Security and lifecycle

OAuth uses a random state tied to an HttpOnly, Secure, SameSite cookie and a one-use browser ticket. GitHub/Render credentials are held in bounded server-memory connections for 15 minutes before submission or up to 30 minutes during deployment. GitHub tokens are dropped after the Dockerfile is written; Render keys are dropped on terminal job states. They are never written to disk or returned in status responses. The WhatsApp session and database URL are sent only as private Render environment settings, not repository contents. API responses disable caching. Provider URLs are fixed.

The visitor explicitly confirms the repository and Render resources before the first mutation. Submitting twice shares the same job. Provider errors never cause a paid-plan fallback. Existing resources are never overwritten or automatically deleted. A partial failure may leave a repository or database in the visitor's account; the page provides links for manual inspection. A service restart loses in-progress status; inspect provider dashboards before starting again.

Only one free database is allowed per Render workspace and free databases expire after 30 days. Visitors with an existing database can supply a PostgreSQL URL instead. Account restrictions may still require billing setup; the deployer stops rather than selecting a paid plan.

## Verification

```sh
node --test session-service/test/*.test.js
```

Tests simulate provider APIs and cover resource creation, secret redaction, confirmation, invalid workspace/session rejection, duplicate submission, existing-database mode, billing failures, expiry, OAuth state/cookie handling and one-use ticket exchange. A real deployment still requires the visitor's GitHub and Render credentials and an account-owner WhatsApp pairing.
