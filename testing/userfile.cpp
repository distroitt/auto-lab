#include "googletest/googlemock/include/gmock/gmock.h"
#include "googletest/googletest/include/gtest/gtest.h"
#include "main.cpp"
using namespace std;

TEST(TestGroupName, Subtest_1) {
    Summer sum;
  sum.push_back(1);
  sum.push_back(2);
  EXPECT_EQ(sum.a[1], 2);
  EXPECT_EQ(sum.size, 1);
}

int main(int argc, char **argv)
{
  ::testing::InitGoogleTest(&argc, argv);

  return RUN_ALL_TESTS();
}