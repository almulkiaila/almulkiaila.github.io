(function () {
  var STORAGE_KEY = "aila-blog-lang";
  var SUPPORTED = Object.keys(window.I18N);
  var PAGE = window.PAGE_I18N || {};
  var POSTS = window.POSTS || [];
  var body = document.body;
  var root = document.documentElement;
  var main = document.querySelector("main");
  var buttons = document.querySelectorAll(".lang-switch button");

  function savedLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable */ }
  }

  function initialLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (SUPPORTED.indexOf(fromUrl) !== -1) return fromUrl;
    var stored = savedLang();
    if (SUPPORTED.indexOf(stored) !== -1) return stored;
    return "en";
  }

  function readingTime(lang, n) {
    if (lang === "es") return n + " min de lectura";
    if (lang === "ar") {
      var d = n.toLocaleString("ar-SY");
      if (n === 1) return "دقيقة قراءة";
      if (n === 2) return "دقيقتين قراءة";
      if (n <= 10) return d + " دقايق قراءة";
      return d + " دقيقة قراءة";
    }
    return n + " min read";
  }

  function render(lang) {
    var t = Object.assign({}, window.I18N[lang], PAGE[lang]);
    var current = POSTS.filter(function (p) { return p.slug === body.dataset.post; })[0];
    if (current) {
      t.postDate = current[lang].date;
      t.postTitle = current[lang].title;
      t.postReading = readingTime(lang, current.minutes);
    }
    root.lang = lang;
    root.dir = t.dir;
    document.title = t[body.dataset.titleKey] || t.title;

    document.querySelectorAll("[data-posts]").forEach(function (list) {
      var limit = list.dataset.posts === "all" ? Infinity : Number(list.dataset.posts);
      var section = list.dataset.section || "writing";
      var posts = POSTS.filter(function (p) { return p.section === section; });
      list.innerHTML = posts.slice(0, limit).map(function (p) {
        var x = p[lang];
        return '<li><a href="posts/' + p.slug + '.html">' +
          '<span class="post-meta"><time datetime="' + p.date + '">' + x.date + '</time>' +
          '<span aria-hidden="true"> · </span>' + readingTime(lang, p.minutes) + '</span>' +
          '<span class="post-title">' + x.title + '</span>' +
          '<span class="post-excerpt">' + x.excerpt + '</span>' +
          '<span class="read-more">' + t.readMore + '</span>' +
          '</a></li>';
      }).join("");
    });

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (t[key] !== undefined) el.innerHTML = t[key];
    });

    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
  }

  function switchTo(lang) {
    if (lang === root.lang) return;
    saveLang(lang);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { render(lang); return; }
    main.classList.add("is-switching");
    setTimeout(function () {
      render(lang);
      main.classList.remove("is-switching");
    }, 220);
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { switchTo(b.dataset.lang); });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  render(initialLang());
})();
