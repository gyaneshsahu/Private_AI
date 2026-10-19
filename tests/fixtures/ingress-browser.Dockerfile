FROM privateai-account-ingress-test:local
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/privateai-test-browsers
RUN node node_modules/playwright/cli.js install --with-deps chromium \
    && chmod -R a+rX /opt/privateai-test-browsers \
    && rm -rf /var/lib/apt/lists/*
USER node
