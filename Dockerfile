FROM nginx:stable-alpine

ARG VERSION=1.0.0
ARG BUILD_TIME=unknown

LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.title="Jump Game" \
      org.opencontainers.image.description="Cocos Creator Jump Game"

ENV APP_VERSION="${VERSION}"

# 复制 Cocos Creator 构建的文件
COPY build/web-desktop /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 写入版本信息
RUN echo "Version: ${VERSION}" > /usr/share/nginx/html/version.txt && \
    echo "Build Time: ${BUILD_TIME}" >> /usr/share/nginx/html/version.txt

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
