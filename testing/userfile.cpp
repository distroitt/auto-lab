#include "googletest/googlemock/include/gmock/gmock.h"
#include "googletest/googletest/include/gtest/gtest.h"
#include "main.cpp"
using namespace std;

template <typename T>
class TemplateTest : public ::testing::Test {
public:
    T obj;
};
typedef ::testing::Types<Summer> Implementations;
TYPED_TEST_SUITE(TemplateTest, Implementations);

TYPED_TEST(TemplateTest, PushBackTest) {
  this->obj.push_back(1);
  this->obj.push_back(2);
  
  EXPECT_EQ(this->obj.a[1], 2); 
  EXPECT_EQ(this->obj.size, 2); 
}


int main(int argc, char **argv)
{
  ::testing::InitGoogleTest(&argc, argv);

  return RUN_ALL_TESTS();
}