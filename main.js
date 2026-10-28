(function () {
  var STORAGE_KEY = "aila-blog-lang";
  var SUPPORTED = Object.keys(window.I18N);
  var PAGE = window.PAGE_I18N || {};
  var POSTS = window.POSTS || [];
  var body = document.body;
  var root = document.documentElement;
  var main = document.querySelector("main");
  var buttons = document.querySelectorAll(".lang-switch button");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dict = {};

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

  /* ---------- Soft fade-in on scroll ---------- */

  var FADE_SELECTOR = ".hero, .page-title, main section > h2, .post-header, .prose > p, .post-list li, .more-link";
  var fadeObserver = null;

  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("fade-ready");
    fadeObserver = new IntersectionObserver(function (entries) {
      entries.filter(function (e) { return e.isIntersecting; }).forEach(function (e, i) {
        e.target.style.transitionDelay = (i * 90) + "ms";
        e.target.classList.add("is-visible");
        fadeObserver.unobserve(e.target);
        // Clear the stagger so later transitions (like the reading highlight) aren't delayed.
        setTimeout(function () { e.target.style.transitionDelay = ""; }, 1200);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  }

  function observeFades() {
    if (!fadeObserver) return;
    document.querySelectorAll(FADE_SELECTOR).forEach(function (el) {
      if (el.classList.contains("fade")) return;
      el.classList.add("fade");
      fadeObserver.observe(el);
    });
  }

  /* ---------- Listen to this post (browser text-to-speech) ---------- */

  var speech = window.speechSynthesis;
  var listenBtn = document.querySelector(".listen");
  var listenLabel = listenBtn && listenBtn.querySelector("[data-listen-label]");
  var VOICE_LANG = { en: "en-US", es: "es-ES", ar: "ar-SA" };
  var listenState = "idle";   // idle | playing | paused
  var listenRun = 0;          // bumps on every stop/pause so stale callbacks are ignored
  var listenIndex = 0;
  var listenParts = [];

  function voicesFor(lang) {
    return speech.getVoices().filter(function (v) { return v.lang.toLowerCase().indexOf(lang) === 0; });
  }

  function updateListen() {
    if (!listenBtn) return;
    if (!speech) { listenBtn.hidden = true; return; }
    // Voices load asynchronously; until they do, assume the language is available.
    listenBtn.hidden = speech.getVoices().length > 0 && voicesFor(root.lang).length === 0;
    listenLabel.textContent = listenState === "playing" ? dict.listenPause
      : listenState === "paused" ? dict.listenResume : dict.listen;
    listenBtn.classList.toggle("is-playing", listenState === "playing");
  }

  function markReading(el) {
    document.querySelectorAll(".is-reading").forEach(function (p) { p.classList.remove("is-reading"); });
    if (el && el.tagName === "P") el.classList.add("is-reading");
  }

  function speakFrom(i) {
    if (i >= listenParts.length) { stopListening(); return; }
    listenIndex = i;
    markReading(listenParts[i]);
    var run = listenRun;
    var u = new SpeechSynthesisUtterance(listenParts[i].textContent);
    u.lang = VOICE_LANG[root.lang];
    var voices = voicesFor(root.lang);
    var exact = voices.filter(function (v) { return v.lang === VOICE_LANG[root.lang]; })[0];
    if (exact || voices[0]) u.voice = exact || voices[0];
    u.rate = 0.95;
    u.onend = function () { if (run === listenRun && listenState === "playing") speakFrom(i + 1); };
    speech.speak(u);
  }

  function stopListening() {
    if (!speech || !listenBtn) return;
    listenRun++;
    listenState = "idle";
    speech.cancel();
    markReading(null);
    updateListen();
  }

  if (listenBtn && speech) {
    listenBtn.addEventListener("click", function () {
      listenRun++;
      speech.cancel();
      if (listenState === "playing") {
        listenState = "paused";
      } else {
        if (listenState === "idle") {
          listenParts = [document.querySelector(".post-header h1")]
            .concat([].slice.call(document.querySelectorAll(".post .prose p")));
          listenIndex = 0;
        }
        listenState = "playing";
        speakFrom(listenIndex);
      }
      updateListen();
    });
    speech.addEventListener && speech.addEventListener("voiceschanged", updateListen);
    window.addEventListener("pagehide", function () { speech.cancel(); });
  }

  function render(lang) {
    var t = Object.assign({}, window.I18N[lang], PAGE[lang]);
    dict = t;
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

    updateListen();
    observeFades();
  }

  function switchTo(lang) {
    if (lang === root.lang) return;
    saveLang(lang);
    stopListening();
    if (reduceMotion) { render(lang); return; }
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
