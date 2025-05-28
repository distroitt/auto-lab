import json
import time

import requests
import admin.services.auth_browser as auth_browser


def generate_ai_payload(messages) -> dict:
    while auth_browser.reauth_in_progress:
        time.sleep(3)

    payload = {
        "model": "openai/gpt-4.1",
        "messages": [
        ],
        "fileIds": [],
        "tools": ["web_search", "image_generation"]
    }
    for message in messages:
        payload["messages"].append(message)
    print(payload)
    return payload



def event_stream(payload):
    url = "https://app.chathub.gg/api/v3/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "x-app-id": "web",
        "x-model": "openai/gpt-4.1",
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0",
        "Referer": "https://app.chathub.gg/",
    }
    with open("admin/cookies.json", "r") as f:
        auth_browser.cookies = json.load(f)
    response = requests.post(url, json=payload, headers=headers, cookies=auth_browser.cookies, stream=True)
    if response.status_code == 403:
        yield '[REAUTH_REQUIRED]'
        auth_browser.reauth()
        return
    response.encoding = 'utf-8'
    for line in response.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            event_data = line[6:]
            try:
                data = json.loads(event_data)
                if data.get('type') == 'text-delta':
                    text = data.get('textDelta', '')
                    yield text
            except Exception as e:
                yield "[Ошибка парсинга]"
