#include "../googletest/googletest/include/gtest/gtest.h"
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


// Проверка корректного добавления элементов и увеличения размера
TYPED_TEST(MyInterfaceTest, PushBackIncreasesSize) {
  EXPECT_EQ((int)this->impl.size(), 0);
  this->impl.pushBack(10);
  EXPECT_EQ((int)this->impl.size(), 1);
  this->impl.pushBack(-3);
  EXPECT_EQ((int)this->impl.size(), 2);
}

// Проверка получения элементов по индексу
TYPED_TEST(MyInterfaceTest, GetReturnsCorrectValues) {
  this->impl.pushBack(42);
  this->impl.pushBack(7);
  this->impl.pushBack(100);
  EXPECT_EQ(this->impl.get(0), 42);
  EXPECT_EQ(this->impl.get(1), 7);
  EXPECT_EQ(this->impl.get(2), 100);
}

// Проверка метода clear
TYPED_TEST(MyInterfaceTest, ClearResetsSizeToZero) {
  this->impl.pushBack(5);
  this->impl.pushBack(15);
  this->impl.pushBack(25);
  EXPECT_NE((int)this->impl.size(), 0);
  this->impl.clear();
  EXPECT_EQ((int)this->impl.size(), 0);
}

// Проверка исключения при некорректном индексе (если get/ remove кидает)
TYPED_TEST(MyInterfaceTest, GetThrowsOnInvalidIndex) {
  this->impl.pushBack(1);
  EXPECT_THROW(this->impl.get(5), std::out_of_range);
}

// Проверка добавления нескольких элементов подряд
TYPED_TEST(MyInterfaceTest, MultiplePushBacks) {
  for (int i = 0; i < 10; ++i) {
    this->impl.pushBack(i * i);
    EXPECT_EQ(this->impl.get(i), i * i);
    EXPECT_EQ((int)this->impl.size(), i + 1);
  }
}

// Проверка, что clear не вызывает ошибок на пустом контейнере
TYPED_TEST(MyInterfaceTest, ClearOnEmpty) {
  EXPECT_EQ((int)this->impl.size(), 0);
  EXPECT_NO_THROW(this->impl.clear());
  EXPECT_EQ((int)this->impl.size(), 0);
}

// Проверка, что pushBack/get работают с отрицательными числами
TYPED_TEST(MyInterfaceTest, CanStoreNegativeNumbers) {
  this->impl.pushBack(-7);
  this->impl.pushBack(-42);
  EXPECT_EQ(this->impl.get(0), -7);
  EXPECT_EQ(this->impl.get(1), -42);
}

// Проверка сохранения порядка добавления (если контейнер последовательный)
TYPED_TEST(MyInterfaceTest, MaintainsOrder) {
  this->impl.pushBack(3);
  this->impl.pushBack(1);
  this->impl.pushBack(4);
  this->impl.pushBack(1);
  this->impl.pushBack(5);
  EXPECT_EQ(this->impl.get(0), 3);
  EXPECT_EQ(this->impl.get(1), 1);
  EXPECT_EQ(this->impl.get(2), 4);
  EXPECT_EQ(this->impl.get(3), 1);
  EXPECT_EQ(this->impl.get(4), 5);
}

// Проверка метода isEmpty на пустом и непустом векторе
TYPED_TEST(MyInterfaceTest, IsEmptyWorksCorrectly) {
  EXPECT_TRUE(this->impl.isEmpty());
  this->impl.pushBack(1);
  EXPECT_FALSE(this->impl.isEmpty());
  this->impl.clear();
  EXPECT_TRUE(this->impl.isEmpty());
}

// Проверка метода capacity (емкость должна быть не меньше размера)
TYPED_TEST(MyInterfaceTest, CapacityAtLeastSize) {
  this->impl.pushBack(10);
  this->impl.pushBack(20);
  EXPECT_GE(this->impl.capacity(), this->impl.size());
}

// Проверка метода popBack уменьшает размер и удаляет последний элемент
TYPED_TEST(MyInterfaceTest, PopBackReducesSize) {
  this->impl.pushBack(5);
  this->impl.pushBack(7);
  EXPECT_EQ((int)this->impl.size(), 2);
  this->impl.popBack();
  EXPECT_EQ((int)this->impl.size(), 1);
  EXPECT_EQ(this->impl.get(0), 5);
}

// Проверка метода set изменяет нужный элемент
TYPED_TEST(MyInterfaceTest, SetChangesValue) {
  this->impl.pushBack(100);
  this->impl.set(0, 200);
  EXPECT_EQ(this->impl.get(0), 200);
}

// Проверка метода erase удаляет элемент по индексу
TYPED_TEST(MyInterfaceTest, EraseRemovesCorrectElement) {
  this->impl.pushBack(1);
  this->impl.pushBack(2);
  this->impl.pushBack(3);
  this->impl.erase(1);
  EXPECT_EQ((int)this->impl.size(), 2);
  EXPECT_EQ(this->impl.get(0), 1);
  EXPECT_EQ(this->impl.get(1), 3);
}

// Проверка метода insert вставляет элемент по индексу
TYPED_TEST(MyInterfaceTest, InsertAddsElementAtIndex) {
  this->impl.pushBack(10);
  this->impl.pushBack(30);
  this->impl.insert(1, 20);
  EXPECT_EQ((int)this->impl.size(), 3);
  EXPECT_EQ(this->impl.get(0), 10);
  EXPECT_EQ(this->impl.get(1), 20);
  EXPECT_EQ(this->impl.get(2), 30);
}

// Проверка popBack на пустом векторе (должен бросать исключение или быть защищён)
TYPED_TEST(MyInterfaceTest, PopBackThrowsOnEmpty) {
    EXPECT_TRUE(this->impl.isEmpty());
    EXPECT_THROW(this->impl.popBack(), std::out_of_range);
}

// Проверка erase на первом и последнем элементах
TYPED_TEST(MyInterfaceTest, EraseFirstAndLastElement) {
    this->impl.pushBack(1);
    this->impl.pushBack(2);
    this->impl.pushBack(3);
    this->impl.erase(0); // удаляем первый
    EXPECT_EQ(this->impl.get(0), 2);
    this->impl.erase(this->impl.size() - 1); // удаляем последний
    EXPECT_EQ(this->impl.get(0), 2);
    EXPECT_EQ((int)this->impl.size(), 1);
}

// Проверка insert в начало и в конец
TYPED_TEST(MyInterfaceTest, InsertAtBeginAndEnd) {
    this->impl.pushBack(100);
    this->impl.insert(0, 42); // В начало
    EXPECT_EQ(this->impl.get(0), 42);
    this->impl.insert(this->impl.size(), 7); // В конец
    EXPECT_EQ(this->impl.get(this->impl.size() - 1), 7);
}

// Проверка set на несуществующий индекс вызывает исключение
TYPED_TEST(MyInterfaceTest, SetThrowsOnInvalidIndex) {
    EXPECT_THROW(this->impl.set(0, 123), std::out_of_range);
    this->impl.pushBack(1);
    EXPECT_THROW(this->impl.set(5, 123), std::out_of_range);
}

// Проверка capacity не уменьшается после clear (или корректно работает)
TYPED_TEST(MyInterfaceTest, ClearDoesNotReduceCapacity) {
    this->impl.pushBack(1);
    this->impl.pushBack(2);
    size_t cap = this->impl.capacity();
    this->impl.clear();
    EXPECT_GE(this->impl.capacity(), cap);
    EXPECT_EQ((int)this->impl.size(), 0);
}

// Проверка цепочки команд: pushBack-erase-insert-set-popBack
TYPED_TEST(MyInterfaceTest, SequenceOfOperationsIsConsistent) {
    this->impl.pushBack(1);
    this->impl.pushBack(2);
    this->impl.pushBack(3);
    this->impl.erase(1);
    EXPECT_EQ(this->impl.get(1), 3);
    this->impl.insert(1, 5);
    EXPECT_EQ(this->impl.get(1), 5);
    this->impl.set(1, 10);
    EXPECT_EQ(this->impl.get(1), 10);
    this->impl.popBack();
    EXPECT_EQ((int)this->impl.size(), 2);
}

// Проверка isEmpty после разных действий
TYPED_TEST(MyInterfaceTest, IsEmptyAfterSequence) {
    EXPECT_TRUE(this->impl.isEmpty());
    this->impl.pushBack(123);
    EXPECT_FALSE(this->impl.isEmpty());
    this->impl.popBack();
    EXPECT_TRUE(this->impl.isEmpty());
    this->impl.pushBack(1);
    this->impl.clear();
    EXPECT_TRUE(this->impl.isEmpty());
}

// Проверка get на отрицательном индексе (если реализовано через size_t — опционально)
TYPED_TEST(MyInterfaceTest, GetThrowsOnNegativeIndex) {
    this->impl.pushBack(5);
    EXPECT_THROW(this->impl.get(-1), std::out_of_range); // в C++ size_t, но если сигнатуру изменить на int — понадобится
}

// Проверка insert вне пределов (слишком большой индекс)
TYPED_TEST(MyInterfaceTest, InsertThrowsOnInvalidIndex) {
    this->impl.pushBack(5);
    EXPECT_THROW(this->impl.insert(3, 10), std::out_of_range);
}

// Проверка, что print не бросает исключение на непустом и пустом векторе
TYPED_TEST(MyInterfaceTest, PrintDoesNotThrow) {
  EXPECT_NO_THROW(this->impl.print());
  this->impl.pushBack(1);
  this->impl.pushBack(2);
  EXPECT_NO_THROW(this->impl.print());
}

// Проверка, что popBack после одного pushBack делает вектор пустым
TYPED_TEST(MyInterfaceTest, PopBackMakesVectorEmpty) {
  this->impl.pushBack(99);
  EXPECT_FALSE(this->impl.isEmpty());
  this->impl.popBack();
  EXPECT_TRUE(this->impl.isEmpty());
}

// Проверка последовательной вставки в начало и корректности порядка
TYPED_TEST(MyInterfaceTest, MultipleInsertAtBeginMaintainsOrder) {
  this->impl.insert(0, 10);
  this->impl.insert(0, 20);
  this->impl.insert(0, 30);
  EXPECT_EQ(this->impl.get(0), 30);
  EXPECT_EQ(this->impl.get(1), 20);
  EXPECT_EQ(this->impl.get(2), 10);
}

// Проверка erase на единственном элементе
TYPED_TEST(MyInterfaceTest, EraseSingleElementResultsEmptyVector) {
  this->impl.pushBack(1234);
  EXPECT_EQ((int)this->impl.size(), 1);
  this->impl.erase(0);
  EXPECT_EQ((int)this->impl.size(), 0);
  EXPECT_TRUE(this->impl.isEmpty());
}

// Проверка, что set на последнем индексе не влияет на предыдущие
TYPED_TEST(MyInterfaceTest, SetLastDoesNotAffectOthers) {
  this->impl.pushBack(1);
  this->impl.pushBack(2);
  this->impl.pushBack(3);
  this->impl.set(2, 42);
  EXPECT_EQ(this->impl.get(0), 1);
  EXPECT_EQ(this->impl.get(1), 2);
  EXPECT_EQ(this->impl.get(2), 42);
}

// Проверка, что erase на некорректном индексе бросает исключение
TYPED_TEST(MyInterfaceTest, EraseThrowsOnInvalidIndex) {
  this->impl.pushBack(9);
  EXPECT_THROW(this->impl.erase(10), std::out_of_range);
  EXPECT_THROW(this->impl.erase(-1), std::out_of_range);
}

// Проверка корректного размера после комбинации insert/erase
TYPED_TEST(MyInterfaceTest, SizeAfterInsertAndErase) {
  this->impl.pushBack(15);
  this->impl.insert(1, 25);
  EXPECT_EQ((int)this->impl.size(), 2);
  this->impl.erase(0);
  EXPECT_EQ(this->impl.get(0), 25);
  EXPECT_EQ((int)this->impl.size(), 1);
}

// Проверка правильного восстановления состояния после clear и повторного использования
TYPED_TEST(MyInterfaceTest, ReusableAfterClear) {
  this->impl.pushBack(11);
  this->impl.pushBack(22);
  this->impl.clear();
  this->impl.pushBack(33);
  EXPECT_EQ((int)this->impl.size(), 1);
  EXPECT_EQ(this->impl.get(0), 33);
}