# Headless Playwright renderer for scraping JS/SPA pages from the CLI.
# Node base + `playwright install` keeps the npm package and the browser build
# version-consistent without depending on a specific Microsoft image tag.
FROM node:22-bookworm

WORKDIR /app

COPY package.json ./
RUN npm install

# Install the Chromium build matching the resolved Playwright version, plus OS deps.
RUN npx playwright install --with-deps chromium

COPY render.js ./

# Args (URL + flags) are appended by the caller.
ENTRYPOINT ["node", "/app/render.js"]
