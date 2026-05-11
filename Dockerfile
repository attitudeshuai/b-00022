FROM nginx:stable-alpine

ARG VERSION="unknown"
ARG BUILD_DATE="unknown"
ARG GIT_COMMIT="unknown"

LABEL maintainer="Jump Game Team"
LABEL version="${VERSION}"
LABEL build-date="${BUILD_DATE}"
LABEL git-commit="${GIT_COMMIT}"
LABEL description="Jump Game - Cocos Creator 3.8.8"

ENV APP_VERSION="${VERSION}"
ENV APP_BUILD_DATE="${BUILD_DATE}"
ENV APP_GIT_COMMIT="${GIT_COMMIT}"

COPY build/web-desktop /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN echo "window.APP_VERSION = '${VERSION}';" > /usr/share/nginx/html/version.js && \
    echo "window.APP_BUILD_DATE = '${BUILD_DATE}';" >> /usr/share/nginx/html/version.js && \
    echo "window.APP_GIT_COMMIT = '${GIT_COMMIT}';" >> /usr/share/nginx/html/version.js

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
