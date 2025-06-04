import json
from threading import Event
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait

driver = None

reauth_in_progress = False
reauth_code_event = Event()
reauth_code_value = None

chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")

cookies = {}


def start_or_get_driver():
    global driver, reauth_in_progress
    if driver is None:
        driver = webdriver.Chrome(options=chrome_options)
        wait = WebDriverWait(driver, 20)
        driver.get("https://app.chathub.gg/sign-in")
        login_input = wait.until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div/div/div/div[1]/div[3]/div/div/input")))
        login_input.send_keys("shsshsovich@gmail.com")
        login_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div/div/div/div[1]/div[3]/div/button")))
        login_btn.click()
        reauth_in_progress = True
    return driver


def wait_for_code_and_confirm():
    global reauth_code_value, reauth_code_event, reauth_in_progress
    wait = WebDriverWait(driver, 300)
    reauth_code_event.clear()
    code_received = reauth_code_event.wait(timeout=300)
    if not code_received:
        reauth_in_progress = False
        return False
    code_input = wait.until(
        EC.element_to_be_clickable((By.XPATH, "/html/body/div/div/div/div[1]/div[3]/div/div/input")))
    code_input.clear()
    code_input.send_keys(reauth_code_value)

    confirm_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/div/div/div[1]/div[3]/div/button")))
    confirm_btn.click()
    while len(cookies) != 3:
        current_cookies = driver.get_cookies()
        for rar in current_cookies:
            if "token" in rar['name']:
                cookies[rar['name']] = rar['value']
        print(cookies)

    with open("admin/cookies.json", "w") as f:
        f.write(json.dumps(cookies, ensure_ascii=False))
    reauth_in_progress = False
    return True


def reauth():
    global reauth_in_progress, driver
    if not reauth_in_progress:
        driver = start_or_get_driver()
        from threading import Thread
        Thread(target=wait_for_code_and_confirm, daemon=True).start()
