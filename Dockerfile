FROM alpine

RUN apk add --no-cache clang-extra-tools llvm

WORKDIR /app

CMD clang-tidy files/*.cpp --config-file=configs/.clang-tidy --use-color=False --export-fixes=res.yaml