FROM alpine

WORKDIR /test

RUN apk add --no-cache git cmake make gcc g++

RUN git clone https://github.com/google/googletest.git

CMD ["sh", "-c", "cmake . . && make && ./test_app --gtest_color=no"]