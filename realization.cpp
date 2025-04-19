#include "my_interface.h"
#include <stdexcept> // Для исключений

class Vector : IVector {
private:
    size_t currentSize;
    size_t currentCapacity;
    int* data;

    // Увеличение емкости массива
    void resizeCapacity(size_t newCapacity) {
        int* newData = new int[newCapacity];
        for (size_t i = 0; i < currentSize; ++i) {
            newData[i] = data[i];
        }
        delete[] data;
        data = newData;
        currentCapacity = newCapacity;
    }

public:
    // Конструктор
    Vector(size_t initialCapacity = 10)
        : currentSize(0), currentCapacity(initialCapacity), data(new int[initialCapacity]) {}

    // Деструктор
    ~Vector() override {
        delete[] data;
    }

    // Возвращает количество элементов
    size_t size() const override {
        return currentSize;
    }

    // Проверить, пуст ли вектор
    bool isEmpty() const override {
        return currentSize == 0;
    }

    // Текущая емкость вектора
    size_t capacity() const override {
        return currentCapacity;
    }

    // Добавить элемент в конец
    void pushBack(int value) override {
        if (currentSize == currentCapacity) {
            resizeCapacity(currentCapacity * 2); // Увеличиваем вместимость
        }
        data[currentSize++] = value;
    }

    // Удалить последний элемент
    void popBack() override {
        if (isEmpty()) {
            throw std::runtime_error("Vector is empty");
        }
        --currentSize;
    }

    // Получить элемент по индексу
    int get(size_t index) const override {
        if (index >= currentSize) {
            throw std::out_of_range("Index out of range");
        }
        return data[index];
    }

    // Установить значение элемента по индексу
    void set(size_t index, int value) override {
        if (index >= currentSize) {
            throw std::out_of_range("Index out of range");
        }
        data[index] = value;
    }

    // Удалить элемент из указанной позиции
    void erase(size_t index) override {
        if (index >= currentSize) {
            throw std::out_of_range("Index out of range");
        }
        for (size_t i = index; i < currentSize - 1; ++i) {
            data[i] = data[i + 1];
        }
        --currentSize;
    }

    // Вставить элемент в указанную позицию
    void insert(size_t index, int value) override {
        if (index > currentSize) {
            throw std::out_of_range("Index out of range");
        }
        if (currentSize == currentCapacity) {
            resizeCapacity(currentCapacity * 2); // Увеличиваем вместимость
        }
        for (size_t i = currentSize; i > index; --i) {
            data[i] = data[i - 1];
        }
        data[index] = value;
        ++currentSize;
    }

    // Очистить весь вектор
    void clear() override {
        currentSize = 0;
    }

    // Вывести элементы вектора на экран
    void print() const override {
        std::cout << "[";
        for (size_t i = 0; i < currentSize; ++i) {
            std::cout << data[i];
            if (i != currentSize - 1) {
                std::cout << ", ";
            }
        }
        std::cout << "]" << std::endl;
    }
};
