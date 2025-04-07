#include <iostream>
#include <vector>
#include <string>
#include <cmath>

// Глобальная переменная (нарушение cppcoreguidelines-avoid-non-const-global-variables)
int GLOBAL_CONSTANT = 42;

// Класс с нарушениями именования (readability-identifier-naming)
class badNAMING {
private:
    // Некорректное именование переменных
    int UserAge;
    std::string full_Name;

public:
    // Конструктор с пустым телом (readability-emptybraces)
    badNAMING() {}

    // Функция с goto (cppcoreguidelines-avoid-goto)
    void processData(int data) {
        if (data < 0) 
            goto error_handler;  // Использование goto

        std::cout << "Processing: " << data << std::endl;
        return;

    error_handler:
        std::cout << "Error: Invalid data" << std::endl;
    }

    // Функция с многочисленными проблемами
    bool checkAndProcessValue(int x) {
        // Присваивание в условии (bugprone-assignment-in-if-condition)
        if (x = 10) {
            std::cout << "Assigned and checked" << std::endl;
        }

        // Магические числа (readability-magic-numbers)
        if (x > 100 && x < 200) {
            return true;
        }

        // Redundant branch condition (bugprone-redundant-branch-condition)
        if (x > 0) {
            if (x > 0) {  // Повторное условие
                return false;
            }
        }

        return true;
    }
};

// Функция с множеством антипаттернов
void complicatedFunction() {
    // Небезопасное использование функций (bugprone-unsafe-functions)
    char buffer[50];
    strcpy(buffer, "Unsafe string copy");  // Небезопасная функция

    // Потенциальное переполнение (bugprone-too-small-loop-variable)
    for (char i = 0; i < 200; i++) {  // Char может переполниться
        // Какие-то действия
    }

    // Пустой блок catch (bugprone-empty-catch)
    try {
        // Какой-то код, который может бросить исключение
        throw std::runtime_error("Test exception");
    } catch (...) {
        // Пустой catch-блок
    }

    // Неправильное округление (bugprone-incorrect-roundings)
    double value = 3.7;
    int rounded = (int)(value + 0.5);  // Неточное округление
}

// Функция с проблемными сравнениями
void compareFunction() {
    int a = 5, b = 10, c = 15;

    // Цепочка сравнений (bugprone-chained-comparison)
    if (a < b < c) {  // Неправильное сравнение
        std::cout << "Chained comparison" << std::endl;
    }

    // Подозрительное присваивание (bugprone-string-integer-assignment)
    std::string str;
    str = 42;  // Неявное преобразование
}

// Функция с проблемами в циклах
void loopProblems() {
    std::vector<int> vec = {1, 2, 3, 4, 5};

    // Копирование в цикле (performance-for-range-copy)
    for (auto elem : vec) {
        std::cout << elem << std::endl;  // Unnecessary copy
    }

    // Неэффективное использование nullptr (modernize-use-nullptr)
    int* ptr = NULL;  // Старый стиль, вместо nullptr
    delete ptr;  // Небезопасное удаление (readability-delete-null-pointer)
}

int main() {
    badNAMING obj;
    obj.processData(10);
    obj.checkAndProcessValue(150);
    
    complicatedFunction();
    compareFunction();
    loopProblems();

    return 0;
}
