# SuperArtillery Server

Express and WebSocket server for SuperArtillery.

This service consumes API contracts defined at:

- ../../contracts/openapi/superartillery.yaml

Generated contract types are owned by `@superartillery/core` and re-exported by the server:

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

# Run production server
npm start

# Type check
npm run type-check

# Run unit and integration tests
npm run test
```

## Environment Variables

Copy .env.example to .env and configure:

```
PORT=3000
NODE_ENV=development
```
Swagger UI:

- http://localhost:3000/api/swagger

