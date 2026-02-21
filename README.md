# Mutual Fund Analysis Tool

A web application for exploring and analysing mutual fund performance with flexible date ranges and visualisations. Currently only supports Indian Mutual Funds (Direct Growth).

Data is sourced using https://mfapi.in.

## Architecture

### Docker Compose Services:
- **frontend** - Vue 3 application
- **backend** - NodeJS application. Data is fetched from MF API on demand and cached in memory.

## Local Developement

### Prerequisites -
- Python
- NodeJS
- Docker & Docker Compose installed
- Watch hot reload is enabled for Vue

### Running the App

```bash
docker compose up --build --watch
```

The application will be available at `http://localhost`. Access is routed through Nginx, which sits in front of both the frontend and backend components.

## Production Deployment

The production deployment uses a single optimized Dockerfile that:
1. Builds the frontend static files (Vue 3 with Vite)
2. Serves both backend API and frontend static files from a single Node.js process
3. No nginx required - backend serves everything on port 4000

Build and run:

```bash
# Build
docker build -t mfat:latest .

# Run
docker run -d \
  -p 4000:4000 \
  mfat:latest
```