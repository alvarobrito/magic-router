// @Alvaro Brito Romero

/**
 * Router - Class to convert a web page to a SPA
 */

class Router {

  /**
   * constructor - Receive options and enables the router if enabled property is true
   *
   * @param {Object}
   * routes: ['*.html', '/site/*']
   * enabled: true
   *
   */
  constructor(options) {
    this.options = options || {};
    if (this.options.enabled) {
      this.scriptsStore = [];
      this.initialScripts = [].slice.call(document.scripts);
      this.initialize();
    }
  }

  /**
   * routes - Getter for routes
   *
   * @return {array} Array of routes
   */
  get routes() {
    return this.options.routes;
  }

  /**
   * initialize - Start SPA enabling and Register the initial route path
   *
   */
  initialize() {
    this.addRouteListener();
    this.enableSPA();
    history.pushState({url: document.location.pathname}, document.title, document.location.pathname);
  }

  /**
   * addRouteListener - Add popstate listener to get browser navigation
   *
   */
  addRouteListener() {
    window.onpopstate = event => this.navigate(event.state.url);
  }

  /**
   * enableSPA -  Enables the SPA, adding listeners for links to be able to navigate without page refreshing
   *
   */
  enableSPA() {
    [].slice.call(document.links).filter(link => this.checkRoutes.apply(link, [this.routes])).map(link => link.addEventListener('click', this.navigate.bind(this), false));
  }

  /**
   * getPage - Get page content using native fetch
   *
   * @param {string} generated url path from getUrl()
   *
   * @return {string} html string
   */
  getPage(url) {
    return fetch(url).then(response => {
      if (response.ok) {
        return response.text().catch(() => response);
      }
      let error = new Error(response.statusText);
      error.status = response.status;
      error.response = response;
      throw error;
    });
  }

  /**
   * getUrl - Get a URL string if is an event or not to be used in getPage function
   *
   * @param {string|event} url path name | event from a link
   *
   * @return {string} url generated pathname
   */
  getUrl(url) {
    return url.target ? url.currentTarget.pathname : url;
  }

  /**
   * navigate - Browse the app using the path.
   * Load html and run imported (externals or inlines from the 'head' or 'body' document) scripts
   *
   * @param {string|event} url path | event from a link
   *
   */
  navigate(url) {
    url.target && url.preventDefault();
    url = this.getUrl(url);

    this.getPage(url).then(htmlString => {
      const $html = this.parseHTML(htmlString);
      this.clear()
          .loadHTML($html)
          .runScripts(...[].slice.call(document.scripts), ...[].slice.call($html.scripts))
          .enableSPA();

      history.pushState({url}, document.title, url);
    })
    .catch(function(error) {
      console.error(`There has been a problem with your fetch operation: ${error.message}`);
    });
  }

  /**
   * loadHTML - Add HTML content into the current document
   *
   * @param {Object} $html DOM object with the HTML
   *
   * @return {Object} this class instance
   */
  loadHTML($html) {
    document.body = $html.body;
    document.title = $html.title;
    return this;
  }

  /**
   * runScripts - Description
   *
   * @param {array} $scripts Spread operator with a Array of scripts
   *
   * @return {Object} this class instance
   */
  runScripts(...$scripts) {
    $scripts.forEach($sc => {
      const callbacks = {
        HEAD: this.loadHeadScripts,

        BODY: this.loadBodyScripts,

        default() {
          return false;
        }
      };
      return (callbacks[$sc.parentNode.tagName] || callbacks.default).call(this, $sc);
    });
    return this;
  }

  /**
   * loadHeadScripts - Description
   *
   * @param {type} $sc Description
   *
   * @return {Object} this class instance
   */
  loadHeadScripts($sc) {
    if (this.isNotInitialScript($sc)) {
      this.scriptsStore.push($sc);
      document.head.appendChild($sc);
    }
    return this;
  }

  /**
   * isNotInitialScript - Check if any scripts what you add from new content was loaded in index page (initial)
   *
   * @param {Object} $sc DOM object, script element
   *
   * @return {boolean} true if is not an initial script
   */
  isNotInitialScript($sc) {
    return (!this.initialScripts.some($initSc => $initSc.src === $sc.src) || !this.initialScripts.some($initSc => $initSc.textContent === $sc.textContent));
  }

  /**
   * loadBodyScripts - Load found scripts in the body
   *
   * @param {Object} $sc DOM object, script element
   *
   */
  loadBodyScripts($sc) {
    let $script = document.createElement('script');
    $script.type = $sc.type || 'text/javascript';

    $sc.src ? $script.src = $sc.src : $script.textContent = $sc.innerText;
    $sc.parentNode.insertBefore($script, $sc);
    $sc.remove();
  }

  /**
   * clear - Clear previous scripts loaded, except initial scripts
   *
   * @return {Object} this class instance
   */
  clear() {
    this.scriptsStore.forEach($sc => $sc.remove());
    return this;
  }

  /**
   * checkRoutes - Check if the found links 'can be converted to SPA links'
   *
   * @param {Array} routes Array of strings
   *
   * @return {boolean} Return true if matchs
   */
  checkRoutes(routes) {
    //TODO - checkRoutes: improve using advanced regex to register and manage paths
    //TODO - checkRoutes: better use a property class to specific a data attribute in the instance (eg. dataAttrNoSpa: 'no-spa')
    return !!~routes.findIndex(route => (new RegExp(route.replace('*', ''), 'i')).test(this.pathname)) && !this.dataset.hasOwnProperty('noSpa');
  }

  /**
   * parseHTML - Parse HTML string to DOM Object
   *
   * @param {string} html content
   *
   * @return {Object} DOM Object with the HTML content
   */
  parseHTML(html) {
     return (new DOMParser()).parseFromString(html, 'text/html');
  }

}
