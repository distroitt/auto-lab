#include "googletest/googletest/include/gtest/gtest.h"
#ifndef IMPLEMENTATION
# error "You must define IMPLEMENTATION (e.g. -DIMPLEMENTATION=MyImpl) when compiling the tests"
#endif
using ImplUnderTest = IMPLEMENTATION;
template <typename T>
class MyInterfaceTest : public ::testing::Test {
protected:
  T impl;
};

TYPED_TEST_SUITE(MyInterfaceTest, ::testing::Types<ImplUnderTest>);
TYPED_TEST(MyInterfaceTest, ComputeIsConsistent) {
  this->impl.pushBack(5);
  
  EXPECT_EQ((int)this->impl.size(), 1);
  EXPECT_EQ(this->impl.get(0), 5);
}