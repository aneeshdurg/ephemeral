from concurrent.futures import ThreadPoolExecutor
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.common.keys import Keys
from time import sleep


class Post:
    def __init__(self, element, children):
        self.element = element
        self.children = children

    @property
    def postid(self):
        return self.element.get_attribute("id")

    @property
    def contents(self):
        return self.element.find_element_by_class_name("post-contents").text


class Client:
    def __init__(self, headless=True):
        options = webdriver.ChromeOptions()
        options.add_argument('ignore-certificate-errors')
        if headless:
            options.add_argument('headless')

        caps = DesiredCapabilities.CHROME
        caps['goog:loggingPrefs'] = {'browser': 'ALL'}

        self.driver = webdriver.Chrome(
            desired_capabilities=caps,
            options=options
        )

        self.driver.get('https://localhost:4443/dist/')

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc_value, _traceback):
        self.close()

    def close(self):
        self.driver.close()
        self.driver.quit()

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
        for _ in range(len(name_el.get_attribute("value"))):
            name_el.send_keys(Keys.BACKSPACE)
        name_el.send_keys(username)

        # bug in login.tsx requires clicking twice
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

    def reset(self):
        name_to_clear = None
        if not self.logged_out:
            name_to_clear = self.name
            self.logout()

        self.driver.execute_script('sessionStorage.clear()')
        self.driver.execute_script('localStorage.clear()')
        if name_to_clear:
            self.driver.execute_script(f"""
                (async () => {{
                    const db = debug.localforage.createInstance({{
                        name: "{name_to_clear}"
                    }});
                    await db.clear();
                }})();
            """)

    def post_login_get_element_text(self, elementID):
        assert not self.logged_out, self.driver.current_url
        return self.driver.find_elements_by_id(elementID)[0].text

    @property
    def id(self):
        return self.post_login_get_element_text("id")

    @property
    def name(self):
        return self.post_login_get_element_text("name")

    @property
    def peerid(self):
        return self.post_login_get_element_text("peerid")

    @property
    def activeconnections(self):
        return self.post_login_get_element_text("activeconnections")

    @property
    def totalconnections(self):
        return self.post_login_get_element_text("totalconnections")

    def waitForUserSetup(self):
        while '?' in self.id:
            sleep(0.5)

    @property
    def _page_element(self):
        return self.driver.find_element_by_id("page")

    def newPost(self, contents):
        editor = None
        for el in self.driver.find_elements_by_id("new-post"):
            if el.find_element_by_xpath("./..") == self._page_element:
                editor = el
                break
        assert editor, "Editor not found"
        safe_contents = contents.replace("\n", "<br>")
        editor.find_element_by_tag_name("textarea").send_keys(safe_contents)
        editor.find_element_by_tag_name("textarea").send_keys("\n")

    def getPosts(self):
        posts = dict()
        for post in self.driver.find_elements_by_class_name("post"):
            postid = post.get_attribute("id")
            if postid in posts:
                continue
            children = []
            for child in post.find_elements_by_class_name("post"):
                # Only consider children, not grandchildren
                if child.find_element_by_xpath("./..") != post:
                    continue
                children.append(child.get_attribute("id"))
            posts[postid] = Post(post, children)

        return posts

class ClientPool:
    def __init__(self, count):
        self.clients = [None] * count
        def createClient(idx):
            self.clients[idx] = Client()

        with ThreadPoolExecutor() as executor:
            for idx in range(count):
                executor.submit(createClient, idx)

    def destroy(self):
        # for c in self.clients:
        #     c.close()
        self.clients = []

    def reset(self, n):
        assert n <= len(self.clients), "{} <= {}".format(n, len(self.clients))
        for i in range(n):
            self.clients[i].reset()

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc_value, _traceback):
        self.destroy()
