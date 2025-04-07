FROM alpine

RUN apk add clang-extra-tools

WORKDIR /app

ENTRYPOINT [ "clang-tidy" ]
