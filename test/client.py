from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

class Client:
    def __init__(self):
        options = webdriver.ChromeOptions()
        options.add_argument('ignore-certificate-errors')
        options.add_argument('headless')

        caps = DesiredCapabilities.CHROME
        caps['goog:loggingPrefs'] = {'browser': 'ALL'}

        self.driver = webdriver.Chrome(desired_capabilities=caps, options=options)

        self.driver.get('https://localhost:4443/dist/')

    def get_logs(self):
        return self.driver.get_log('browser')

    def close(self):
        self.driver.close()
        self.driver.quit()
