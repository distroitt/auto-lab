FROM alpine

RUN apk add --no-cache clang-extra-tools

WORKDIR /app

ENTRYPOINT [ "clang-tidy" ]
