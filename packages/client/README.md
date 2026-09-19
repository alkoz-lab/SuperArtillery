# SuperArtillery Client

Browser client for SuperArtillery, built with Vite and TypeScript.

This client consumes API contracts defined at:

- ../../contracts/openapi/superartillery.yaml

Generated contract types are owned by `@superartillery/core` and re-exported by the client:

- ../core/src/contract/generated/openapi.d.ts

## Quick Start

Prerequisites:

- Node.js 26+
- npm 10+

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Run unit tests
npm run test
```

Default local URL:

- http://localhost:5173

## Runtime Expectations

- The server address is configured automatically for each environment.
- The client derives REST and WebSocket endpoints from this value.
- Use `http://` or `https://` URLs (example: `http://localhost:3000`).
- Local Vite development defaults to `http://localhost:3000`.
- The GitHub Pages build uses the Railway URL configured as the `VITE_SERVER_URL` GitHub Actions secret.
- The server address field remains available for connecting to another server.

## Notes

- Do not manually edit generated contract type files.
- Update contracts first, regenerate, then update client implementation.

## GitHub Pages Deployment

The repository includes `.github/workflows/deploy-server-and-client.yml` to publish this client on GitHub Pages.

- Build base path is configured through `VITE_BASE_PATH` in `vite.config.ts`.
- Backend URL is configured through `VITE_SERVER_URL` during the Pages build.
- The workflow sets `VITE_BASE_PATH=/<repo-name>/` automatically.

To test a Pages-style build locally:

```bash
VITE_BASE_PATH=/SuperArtillery/ npm run build
```

After deployment, open your Pages URL and join the game. The Railway backend URL is supplied by the deployment workflow.
