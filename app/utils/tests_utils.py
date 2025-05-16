from fastapi import HTTPException


async def check_valid_content(text: str):
    """Перед сохранением файла тестов проверяет, чтобы пользователь не удалил
    необходимые для корректной работы тестов строки"""
    required_lines = [
        '#include "../googletest/googletest/include/gtest/gtest.h"',
        '#ifndef IMPLEMENTATION',
        '# error "You must define IMPLEMENTATION (e.g. -DIMPLEMENTATION=MyImpl) when compiling the tests"',
        '#endif',
        'using ImplUnderTest = IMPLEMENTATION;',
        'template <typename T>',
        'class MyInterfaceTest : public ::testing::Test {',
        'protected:',
        '  T impl;',
        '};',
        'TYPED_TEST_SUITE(MyInterfaceTest, ::testing::Types<ImplUnderTest>);'
    ]
    for line in required_lines:
        if line not in text:
            raise HTTPException(status_code=400,
                                detail="Ошибка: нельзя удалять текст, отвечающий за логику тестирования")
