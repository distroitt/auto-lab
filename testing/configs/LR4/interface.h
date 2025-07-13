#pragma once
#ifndef INTERFACE_H
#define INTERFACE_H

#ifndef DYNAMIC_VECTOR_H
#define DYNAMIC_VECTOR_H

#include <iostream>
class IVector {
public:
    // Виртуальный деструктор для корректного удаления
    virtual ~IVector() = default;

    // Получить количество элементов в векторе
    virtual size_t size() const = 0;

    // Проверить, пуст ли вектор
    virtual bool isEmpty() const = 0;

    // Получить текущую емкость (capacity) вектора
    virtual size_t capacity() const = 0;

    // Добавить элемент в конец
    virtual void pushBack(int value) = 0;

    // Удалить последний элемент
    virtual void popBack() = 0;

    // Получить элемент по индексу
    virtual int get(size_t index) const = 0;

    // Установить значение элемента по индексу
    virtual void set(size_t index, int value) = 0;

    // Удалить элемент в указанной позиции
    virtual void erase(size_t index) = 0;

    // Вставить элемент в указанную позицию
    virtual void insert(size_t index, int value) = 0;

    // Очистить весь вектор
    virtual void clear() = 0;

    // Вывести элементы вектора на экран
    virtual void print() const = 0;
};

#endif // DYNAMIC_VECTOR_H

#endif // INTERFACE_H
