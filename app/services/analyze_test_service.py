import json
import re
import bisect


def extract_test_block(lines, line_number):
    patterns = [
        re.compile(r'^\s*TYPED_TEST\s*\('),
    ]

    start = line_number - 1
    while start >= 0:
        for pat in patterns:
            if pat.search(lines[start]):
                break
        else:
            start -= 1
            continue
        break

    open_braces = 0
    block_started = False
    end = line_number - 1
    for i in range(start, len(lines)):
        line = lines[i]
        open_braces += line.count("{")
        open_braces -= line.count("}")
        if "{" in line:
            block_started = True
        if block_started and open_braces == 0:
            end = i
            break
    code_block = ''.join(lines[start:end + 1])
    return code_block


def analyze_test_results(test_result_str: str):
    tests_summary = {}
    test_starts = []
    test_names = []
    for m in re.finditer(r'^\[ RUN\s+\] (.+)$', test_result_str, re.MULTILINE):
        test_starts.append(m.start())
        test_names.append(m.group(1).strip())
    for test_name in test_names:
        tests_summary[test_name] = {'status': 'passed', 'errors': []}
    total_match = re.search(r'\[==========\] Running (\d+) tests? from', test_result_str)
    total = int(total_match.group(1)) if total_match else 0

    passed_match = re.search(r'\[\s*PASSED\s*\] (\d+) tests?', test_result_str)
    passed = int(passed_match.group(1)) if passed_match else 0

    failed_match = re.search(r'\[\s*FAILED\s*\] (\d+) tests?, listed below:', test_result_str)
    failed = int(failed_match.group(1)) if failed_match else 0

    error_pattern = (
        r'([^\r\n]+):(\d+): Failure\r\n'
        r'([\s\S]*?)'
        r'^\s*\[\s*FAILED\s*\]'
    )
    detailed_errors = []
    for match in re.finditer(error_pattern, test_result_str, re.MULTILINE | re.DOTALL):
        filename = match.group(1).strip()
        line_number = int(match.group(2))
        error_text = match.group(3).strip()
        error_pos = match.start()
        idx = bisect.bisect_right(test_starts, error_pos) - 1
        test_name = test_names[idx] if idx >= 0 else None
        detailed_errors.append({
            'file': filename,
            'line': line_number,
            'error': error_text,
            'test': test_name,
        })
    for error in detailed_errors:
        test_name = error['test']
        if test_name in tests_summary:
            tests_summary[test_name]['status'] = 'failed'
            tests_summary[test_name]['errors'].append({
                'file': error['file'],
                'line': error['line'],
                'error': error['error']
            })

    test_blocks = re.split(r'^\[ RUN\s+\] ', test_result_str, flags=re.MULTILINE)[1:]
    for block in test_blocks:
        newline_pos = block.find('\n')
        if newline_pos == -1:
            continue
        test_name = block[:newline_pos].strip()
        body = block[newline_pos + 1:]

        failed_header_pattern = re.compile(r'^\[\s*FAILED\s*\] ' + re.escape(test_name), re.MULTILINE)
        if failed_header_pattern.search(test_result_str):
            error_lines = []
            lines = body.splitlines()
            collecting = False
            for line in lines:
                if re.search(r'(Failure|exception|error|throw)', line, re.I):
                    collecting = True
                if collecting:
                    error_lines.append(line)
                if re.match(r'^\[ *(OK|FAILED) *\]', line):
                    break

            error_text = '\n'.join(error_lines).strip()
            if error_text:
                detailed_errors.append({
                    'test': test_name,
                    'error': error_text,
                })

    failed_tests = []
    if failed > 0:
        listed_pos = test_result_str.find('listed below:')
        if listed_pos != -1:
            after = test_result_str[listed_pos + len('listed below:'):]
            failed_tests = [m.group(1).strip() for m in re.finditer(r'\[\s*FAILED\s*\] (.*)', after)]
    for test in failed_tests:
        if test in tests_summary:
            tests_summary[test]['status'] = 'failed'
    with open("gtest.json", "w") as f:
        json.dump({
            'total': total,
            'passed': passed,
            'failed': failed,
            'tests': tests_summary
        }, f)
    return {
        'total': total,
        'passed': passed,
        'failed': failed,
        'tests': tests_summary
    }
