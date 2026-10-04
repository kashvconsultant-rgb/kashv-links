// Renders a per-offering page (/consulting/, /kooli/, ...) from content.json.
// Each page's HTML carries its own static <head> (title, description, canonical,
// JSON-LD) and <body data-offering="<key>">; everything visible is built here
// from content.offerings[<key>], so editing wording means editing content.json.
(function () {
  var TONE_VARS = {
    consulting: "var(--consulting)", contentpilot: "var(--contentpilot)", kooli: "var(--kooli)",
    club: "var(--club)", tuition: "var(--tuition)", gold: "var(--gold)", tournament: "var(--tournament)"
  };
  var API_BASE = "https://kashv-links.vercel.app/api/leads";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    for (var key in (attrs || {})) {
      if (key === "text") node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    }
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  var LOGO = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<rect x="30" y="14" width="14" height="72" rx="7" fill="var(--ink)"/>' +
    '<path d="M40 50 L70 24" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" fill="none"/>' +
    '<polygon points="66,16 84,20 72,34" fill="var(--accent)"/>' +
    '<path d="M40 50 L72 84" stroke="var(--ink)" stroke-width="14" stroke-linecap="round" fill="none"/></svg>';

  function section(cls, id, headEls, body) {
    var head = el("div", { class: "section-head" }, headEls);
    return el("section", { class: "section-block " + cls, id: id }, [el("div", { class: "wrap" }, [head, body])]);
  }

  function buildChrome(content, o) {
    var header = el("header", { class: "site-nav" }, [el("div", { class: "wrap" }, [
      el("a", { class: "brand", href: "/", "aria-label": "KashV Consultancy home" }),
      el("nav", { "aria-label": "Primary" }, [el("ul", { class: "nav-links" }, [
        el("li", {}, [el("a", { href: "/#proof", text: "All tools" })]),
        el("li", {}, [el("a", { href: "/consulting/", text: "Consulting" })]),
        el("li", {}, [el("a", { href: "#faq", text: "FAQ" })])
      ])]),
      el("div", { class: "nav-ctas" }, [
        el("a", { class: "btn btn-ghost btn-sm", href: content.hero.secondaryCtaHref, text: content.nav.callLabel }),
        el("a", { class: "btn btn-primary btn-sm", href: "#", "data-open-form": o.service, text: content.nav.bookLabel })
      ])
    ])]);
    var brand = header.querySelector(".brand");
    brand.innerHTML = LOGO;
    brand.appendChild(el("span", { class: "brand-word", text: "KashV Consultancy" }));
    return header;
  }

  function buildHero(o) {
    var actions = el("div", { class: "hero-actions" }, [
      el("a", { class: "btn btn-primary", href: "#", "data-open-form": o.service, text: o.primaryCtaLabel })
    ]);
    if (o.secondaryCta) {
      actions.appendChild(el("a", { class: "btn btn-ghost", href: o.secondaryCta.href, target: "_blank", rel: "noopener", text: o.secondaryCta.label + " →" }));
    }
    var crumbs = el("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, [el("ol", {}, [
      el("li", {}, [el("a", { href: "/", text: "Home" })]),
      el("li", { "aria-current": "page", text: o.name })
    ])]);
    var badge = el("div", { class: "hero-badge" }, [
      el("span", { class: "tone-dot", style: "--tone:" + (TONE_VARS[o.tone] || "var(--accent)") }),
      el("span", { class: "eyebrow", text: o.eyebrow })
    ]);
    return el("section", { class: "hero" }, [el("div", { class: "wrap" }, [
      crumbs, el("div", { style: "height:22px" }), badge,
      el("h1", { text: o.headline }),
      el("p", { class: "lede", text: o.lede }),
      actions
    ])]);
  }

  function buildScreens(o) {
    if (!o.screens || !o.screens.length) return null;
    var row = el("div", { class: "screens-row" });
    o.screens.forEach(function (s) {
      row.appendChild(el("figure", { class: "screen" }, [
        el("img", { src: s.src, alt: s.alt, width: s.width || 618, height: s.height || 610, loading: "lazy" }),
        el("figcaption", { text: s.caption })
      ]));
    });
    var node = el("section", { class: "screens", "aria-label": o.screensHeading || "App screens" }, [el("div", { class: "wrap" }, [row])]);
    return node;
  }

  function buildSports(o) {
    if (!o.sports || !o.sports.length) return null;
    var list = el("ul", { class: "chips sports" });
    o.sports.forEach(function (s) {
      list.appendChild(el("li", {}, [el("strong", { text: s.name }), document.createTextNode(" · " + s.detail)]));
    });
    return section("audience", "sports", [el("h2", { text: o.sportsHeading || "Sports supported" })], list);
  }

  function buildStory(o) {
    var s = o.story;
    if (!s || !s.paragraphs || !s.paragraphs.length) return null;
    var body = el("div", { class: "story-body" });
    s.paragraphs.forEach(function (p) { body.appendChild(el("p", { text: p })); });
    if (s.signature) body.appendChild(el("p", { class: "story-sign", text: s.signature }));
    return section("story", "story", [el("span", { class: "eyebrow", text: s.eyebrow }), el("h2", { text: s.heading })], body);
  }

  function buildAudience(o) {
    if (!o.audience || !o.audience.length) return null;
    var list = el("ul", { class: "chips" });
    o.audience.forEach(function (a) { list.appendChild(el("li", { text: a })); });
    return section("audience", "audience", [el("h2", { text: o.audienceHeading || "Built for" })], list);
  }

  function buildFeatures(o) {
    if (!o.features || !o.features.length) return null;
    var grid = el("div", { class: "feature-grid" });
    o.features.forEach(function (f) {
      grid.appendChild(el("article", { class: "feature-card" }, [el("h3", { text: f.title }), el("p", { text: f.body })]));
    });
    return section("features", "features", [el("h2", { text: o.featuresHeading || "What it does" })], grid);
  }

  function buildSteps(o) {
    if (!o.steps || !o.steps.length) return null;
    var list = el("ol", { class: "steps" });
    o.steps.forEach(function (s) {
      list.appendChild(el("li", {}, [el("h3", { text: s.title }), el("p", { text: s.body })]));
    });
    return section("how", "how", [el("h2", { text: o.stepsHeading || "How it works" })], list);
  }

  function buildFaq(o) {
    if (!o.faq || !o.faq.length) return null;
    var list = el("div", { class: "faq-list" });
    o.faq.forEach(function (item) {
      list.appendChild(el("details", { class: "faq-item" }, [
        el("summary", {}, [document.createTextNode(item.question), el("span", { class: "plus", text: "+" })]),
        el("p", { text: item.answer })
      ]));
    });
    return section("faq", "faq", [el("h2", { text: "Common questions" })], list);
  }

  function buildRelated(content, o) {
    if (!o.related || !o.related.length) return null;
    var grid = el("div", { class: "related-grid" });
    o.related.forEach(function (key) {
      var r = content.offerings[key];
      if (!r) return;
      grid.appendChild(el("a", { class: "related-card", "data-tone": r.tone, href: "/" + key + "/" }, [
        el("span", { class: "product-voice", text: r.name }),
        el("p", { text: r.eyebrow }),
        el("span", { class: "go", text: "Learn more →" })
      ]));
    });
    return section("related", "related", [el("h2", { text: "More from KashV" })], grid);
  }

  function buildFinalCta(content, o) {
    var d = content.finalCta || {};
    return el("section", { class: "section-block" }, [el("div", { class: "wrap" }, [
      el("div", { class: "final-cta-inner" }, [
        el("h2", { text: o.finalHeading || (o.service === "consulting" ? d.heading : "See how " + o.name + " would work for your business.") }),
        el("a", { class: "btn btn-ghost", href: "#", "data-open-form": o.service, text: o.primaryCtaLabel + " →" })
      ])
    ])]);
  }

  function buildFooter(content) {
    var c = content.contact;
    function col(title, items) {
      var ul = el("ul");
      items.forEach(function (i) { ul.appendChild(el("li", {}, [i])); });
      return el("div", { class: "footer-col" }, [el("h4", { text: title }), ul]);
    }
    var tools = content.sisterProjects.map(function (s) { return el("a", { href: s.pageHref, text: s.label }); });
    tools.unshift(el("a", { href: "/consulting/", text: "Business & IT Consulting" }));
    var social = content.social.map(function (s) { return el("a", { href: s.href, target: "_blank", rel: "noopener", text: s.label }); });

    var brandCol = el("div", {}, [
      el("div", { class: "footer-brand" }),
      el("p", { class: "footer-note", text: "Business strategy, IT consulting, and vendor connections for Coimbatore founders and SMEs, plus the software we built along the way." })
    ]);
    var fb = brandCol.querySelector(".footer-brand");
    fb.innerHTML = LOGO;
    fb.appendChild(el("span", { text: "KashV Consultancy" }));

    return el("footer", { class: "site-footer" }, [el("div", { class: "wrap" }, [
      el("div", { class: "footer-grid" }, [
        brandCol,
        col("Contact", [el("address", { text: c.addressLine }), el("a", { href: c.phoneHref, text: c.phoneDisplay }), el("a", { href: "mailto:" + c.email, text: c.email })]),
        col("What we offer", tools),
        col("Follow", social)
      ]),
      el("div", { class: "footer-meta" }, [el("span", { text: "© 2026 KashV Consultancy" }), el("span", { text: "Coimbatore, Tamil Nadu, India" })])
    ])]);
  }

  function buildMobileCta(content, o) {
    return el("div", { class: "mobile-cta" }, [
      el("a", { class: "btn btn-ghost", href: content.hero.secondaryCtaHref, text: content.nav.callLabel }),
      el("a", { class: "btn btn-primary", href: "#", "data-open-form": o.service, text: content.nav.bookLabel })
    ]);
  }

  function buildLeadForm(content) {
    var d = content.leadForm;
    var overlay = el("div", { class: "lead-overlay", id: "lead-overlay", hidden: "" });
    overlay.innerHTML =
      '<div class="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-form-heading">' +
      '<button type="button" class="lead-close" id="lead-close" aria-label="Close">✕</button>' +
      '<h2 id="lead-form-heading"></h2><p class="lede" id="lead-form-sub"></p>' +
      '<form class="lead-form" id="lead-form" novalidate>' +
      '<div class="lead-field"><label id="lead-name-label" for="lead-name"></label><input type="text" id="lead-name" name="name" required autocomplete="name"></div>' +
      '<div class="lead-field"><label id="lead-company-label" for="lead-company"></label><input type="text" id="lead-company" name="company" autocomplete="organization"></div>' +
      '<div class="lead-field"><label id="lead-phone-label" for="lead-phone"></label><input type="tel" id="lead-phone" name="phone" required autocomplete="tel"></div>' +
      '<div class="lead-field"><label id="lead-service-label" for="lead-service"></label><select id="lead-service" name="service" required></select></div>' +
      '<div class="lead-hp" aria-hidden="true"><label for="lead-website">Website</label><input type="text" id="lead-website" name="website" tabindex="-1" autocomplete="off"></div>' +
      '<button type="submit" class="btn btn-primary lead-submit" id="lead-submit"></button>' +
      '<p class="lead-status" id="lead-status" role="status" aria-live="polite"></p></form></div>';
    document.body.appendChild(overlay);

    function $(id) { return document.getElementById(id); }
    $("lead-form-heading").textContent = d.heading;
    $("lead-form-sub").textContent = d.subheading;
    $("lead-name-label").textContent = d.fields.name;
    $("lead-company-label").textContent = d.fields.company;
    $("lead-phone-label").textContent = d.fields.phone;
    $("lead-service-label").textContent = d.serviceLabel;
    $("lead-submit").textContent = d.submitLabel;

    var select = $("lead-service");
    select.appendChild(el("option", { value: "", text: d.servicePlaceholder }));
    d.serviceOptions.forEach(function (opt) { select.appendChild(el("option", { value: opt.value, text: opt.label })); });

    var form = $("lead-form"), status = $("lead-status"), submitBtn = $("lead-submit"), lastFocused = null;

    function onKeydown(e) { if (e.key === "Escape") closeForm(); }
    function openForm(service) {
      lastFocused = document.activeElement;
      status.textContent = ""; status.removeAttribute("data-state");
      form.reset();
      if (service) select.value = service;
      overlay.hidden = false;
      $("lead-name").focus();
      document.addEventListener("keydown", onKeydown);
    }
    function closeForm() {
      overlay.hidden = true;
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-open-form]");
      if (trigger) { e.preventDefault(); openForm(trigger.getAttribute("data-open-form") || null); }
    });
    $("lead-close").addEventListener("click", closeForm);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeForm(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = {
        name: $("lead-name").value.trim(), company: $("lead-company").value.trim(),
        phone: $("lead-phone").value.trim(), service: select.value, website: $("lead-website").value
      };
      if (!payload.name || !payload.phone || !payload.service) {
        status.textContent = d.errorMessage; status.setAttribute("data-state", "error"); return;
      }
      submitBtn.disabled = true; submitBtn.textContent = d.submittingLabel;
      status.textContent = ""; status.removeAttribute("data-state");
      fetch(API_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (res) { if (!res.ok) throw new Error("Request failed"); return res.json(); })
        .then(function () {
          status.textContent = d.successMessage; status.setAttribute("data-state", "ok");
          form.reset(); setTimeout(closeForm, 1800);
        })
        .catch(function () { status.textContent = d.errorMessage; status.setAttribute("data-state", "error"); })
        .finally(function () { submitBtn.disabled = false; submitBtn.textContent = d.submitLabel; });
    });
  }

  var key = document.body.getAttribute("data-offering");
  fetch("/content.json", { cache: "no-store" })
    .then(function (res) { return res.json(); })
    .then(function (content) {
      var o = content.offerings[key];
      if (!o) throw new Error("No offering '" + key + "' in content.json");
      var app = document.getElementById("app");
      app.innerHTML = "";
      document.body.insertBefore(buildChrome(content, o), app);
      app.appendChild(buildHero(o));
      [buildScreens(o), buildAudience(o), buildFeatures(o), buildStory(o), buildSteps(o), buildSports(o), buildFaq(o), buildRelated(content, o), buildFinalCta(content, o)]
        .forEach(function (node) { if (node) app.appendChild(node); });
      document.body.appendChild(buildFooter(content));
      document.body.appendChild(buildMobileCta(content, o));
      buildLeadForm(content);
    })
    .catch(function (err) { console.error("offering page failed to render:", err); });
})();
