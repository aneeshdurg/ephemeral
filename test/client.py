from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from time import sleep

class Client:
    def __init__(self, headless=True):
        options = webdriver.ChromeOptions()
        options.add_argument('ignore-certificate-errors')
        if headless:
            options.add_argument('headless')

        caps = DesiredCapabilities.CHROME
        caps['goog:loggingPrefs'] = {'browser': 'ALL'}

        self.driver = webdriver.Chrome(desired_capabilities=caps, options=options)

        self.driver.get('https://localhost:4443/dist/')

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc_value, _traceback):
        self.close()

    def get_logs(self):
        return self.driver.get_log('browser')

    @property
    def logged_out(self):
        return any([
            self.driver.current_url.endswith('/index.html'),
            self.driver.current_url.endswith('/')])

    def login(self, username, mode="guest"):
        assert self.logged_out, self.driver.current_url

        name_els = self.driver.find_elements_by_id("name")
        name_el = [e for e in name_els if e.tag_name == "input"][0]
        name_el.send_keys(username)

        # bug in login.tsx
        self.driver.find_elements_by_id(mode)[0].click()
        self.driver.find_elements_by_id(mode)[0].click()

        self.driver.find_elements_by_id("start")[0].click()
        sleep(1)

        assert not self.logged_out, self.driver.current_url


    def logout(self):
        assert not self.logged_out
        links = self.driver.find_elements_by_tag_name("a")
        link = [l for l in links if l.text == "Logout"][0]
        link.click()
        while not self.logged_out:
            sleep(0.5)

    @property
    def id(self):
        assert not self.logged_out, self.driver.current_url
        return self.driver.find_elements_by_id("id")[0].text

    def waitForUserSetup(self):
        while '?' in self.id:
            sleep(0.5)

    def close(self):
        self.driver.close()
        self.driver.quit()
