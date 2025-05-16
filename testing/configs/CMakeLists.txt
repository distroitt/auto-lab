cmake_minimum_required(VERSION 3.10)
project(gtest_example LANGUAGES CXX)

enable_testing()
set(BUILD_GMOCK OFF CACHE BOOL "Build Google Mock" FORCE)
add_subdirectory(googletest)
set(IMPLEMENTATION_NAME $ENV{IMPLEMENTATION_NAME})
set(REALIZATION_FILE $ENV{REALIZATION_FILE})
add_executable(test_app
  test_files/testing.cpp
)

target_link_libraries(test_app
  PRIVATE
    gtest_main
)
target_compile_options(test_app PRIVATE
    -include "files/${REALIZATION_FILE}"
  )
target_compile_definitions(test_app
  PRIVATE
    IMPLEMENTATION=${IMPLEMENTATION_NAME}
)
