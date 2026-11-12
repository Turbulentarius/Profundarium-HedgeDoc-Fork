# Build the checked-out fork, including matching frontend bundles and templates.
FROM node:24.21.0-alpine3.24 AS build
RUN apk add --no-cache git python3 make g++
WORKDIR /hedgedoc
ENV npm_config_nodedir=/usr/local
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases/ .yarn/releases/
COPY .yarn/patches/ .yarn/patches/
RUN node .yarn/releases/yarn-4.13.0.cjs install --immutable
COPY . .
RUN node .yarn/releases/yarn-4.13.0.cjs eslint \
    && node .yarn/releases/yarn-4.13.0.cjs mocha-suite \
    && node .yarn/releases/yarn-4.13.0.cjs build
RUN node .yarn/releases/yarn-4.13.0.cjs workspaces focus --production \
    && rm -rf .yarn/cache .yarn/install-state.gz

FROM node:24.21.0-alpine3.24
ARG SOURCE_URL=https://github.com/Turbulentarius/Profundarium-HedgeDoc-Fork
ARG REVISION=unknown
ARG RELEASE=development
LABEL org.opencontainers.image.source="${SOURCE_URL}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.version="${RELEASE}" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
RUN addgroup -S -g 10000 hedgedoc \
    && adduser -S -D -u 10000 -G hedgedoc hedgedoc
WORKDIR /hedgedoc
COPY --from=build --chown=hedgedoc:hedgedoc /hedgedoc /hedgedoc
ENV NODE_ENV=production
USER hedgedoc
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=5 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.CMD_PORT||3000)+(process.env.CMD_URL_PATH?'/'+process.env.CMD_URL_PATH.replace(/^\/+|\/+$/g,''):'')+'/status',r=>{r.resume();process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "app.js"]
