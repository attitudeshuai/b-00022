FROM nginx:stable-alpine

ARG APP_VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

LABEL maintainer="" \
      org.opencontainers.image.title="jump-game" \
      org.opencontainers.image.description="跳一跳游戏 - Cocos Creator 3.8.8" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}"

RUN echo "{\"version\":\"${APP_VERSION}\",\"buildDate\":\"${BUILD_DATE}\",\"vcsRef\":\"${VCS_REF}\"}" > /usr/share/nginx/html/version.json

COPY build/web-desktop /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
