# auto-lab
Команда для получения количества warnings и errors: docker run --rm -t -v ~/auto-lab/testing/:/app -v ~/auto-lab/.clang-tidy:/app/.clang-tidy lint main.cpp --quiet -- | awk '/warning:/{w++} /error:/{e++} END{print "Warnings: " w, "Errors: " e}'

Экспортировать ошибки: --export-fixes=test.yaml