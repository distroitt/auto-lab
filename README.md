# auto-lab
Команда для запуска тестов: docker run -it -v test:/test/googletest -v ~/auto-lab/testing/:/test distroit/test
С реализациями: docker run -it --env IMPLEMENTATION_NAME=Vector -v test:/test/googletest -v ~/auto-lab/testing/:/test distroit/test