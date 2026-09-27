// Floating chat widget, shared by every page (index.html + the six /<offering>/
// pages). Scripted, not AI: a fixed question flow that ends in the same
// /api/leads endpoint the modal form already posts to, tagged source:"chatbot"
// so admin.html can tell them apart. All wording lives in content.json's
// "chatbot" block (plus leadForm.serviceOptions, reused rather than duplicated).
//
// Voice welcome: the very first time a visitor opens the chat in a tab, it
// asks /api/geo (a tiny Vercel function that reads Vercel's own geo headers —
// no IP-lookup service) whether they're in Tamil Nadu, then speaks the
// greeting with the browser's built-in speech synthesis — Tamil voice if
// they're in Tamil Nadu AND the browser/OS actually has a Tamil voice
// installed, English otherwise. This is a nice-to-have, not a system: geo
// headers are approximate, and speechSynthesis quietly does nothing on
// browsers that don't support it. No audio files, no paid API, no server cost.
(function () {
  var API_BASE = "https://kashv-links.vercel.app/api/leads";
  var GEO_BASE = "https://kashv-links.vercel.app/api/geo";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    for (var key in (attrs || {})) {
      if (key === "text") node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function fmt(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; });
  }

  function validPhone(v) {
    var digits = v.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }

  // ---------- geo + voice ----------

  function detectLanguage(cb) {
    var cached;
    try { cached = sessionStorage.getItem("kashv_geo_lang"); } catch (e) {}
    if (cached) { cb(cached); return; }
    fetch(GEO_BASE, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var lang = data.country === "IN" && data.region === "TN" ? "ta" : "en";
        try { sessionStorage.setItem("kashv_geo_lang", lang); } catch (e) {}
        cb(lang);
      })
      .catch(function () { cb("en"); });
  }

  // Confirms a Tamil voice actually exists on this device before committing to
  // a Tamil greeting; falls back to English (text and speech together) rather
  // than showing Tamil text with no voice, or speaking English over Tamil text.
  function resolveGreetingLanguage(requestedLang, cb) {
    if (requestedLang !== "ta" || !("speechSynthesis" in window)) {
      cb(requestedLang === "ta" ? "en" : requestedLang);
      return;
    }
    var done = false;
    function finish(voices) {
      if (done) return;
      done = true;
      var hasTamil = voices.some(function (v) { return v.lang && v.lang.toLowerCase().indexOf("ta") === 0; });
      cb(hasTamil ? "ta" : "en");
    }
    var voices = window.speechSynthesis.getVoices();
    if (voices.length) { finish(voices); return; }
    window.speechSynthesis.onvoiceschanged = function () { finish(window.speechSynthesis.getVoices()); };
    setTimeout(function () { finish(window.speechSynthesis.getVoices()); }, 700);
  }

  function isMuted() {
    try { return localStorage.getItem("kashv_chat_muted") === "1"; } catch (e) { return false; }
  }
  function setMuted(v) {
    try { localStorage.setItem("kashv_chat_muted", v ? "1" : "0"); } catch (e) {}
  }

  function speak(text, lang) {
    if (isMuted() || !("speechSynthesis" in window)) return;
    var voices = window.speechSynthesis.getVoices();
    var voice = voices.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf(lang) === 0; });
    var utter = new SpeechSynthesisUtterance(text);
    if (voice) { utter.voice = voice; utter.lang = voice.lang; } else { utter.lang = lang === "ta" ? "ta-IN" : "en-IN"; }
    utter.rate = 0.98;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // ---------- icons ----------

  var ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    speakerOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    speakerOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>'
  };
  var K_MARK = '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="30" y="14" width="14" height="72" rx="7" fill="currentColor"/><path d="M40 50 L70 24" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" fill="none"/><polygon points="66,16 84,20 72,34" fill="var(--accent)"/><path d="M40 50 L72 84" stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"/></svg>';

  fetch("/content.json", { cache: "no-store" })
    .then(function (res) { return res.json(); })
    .then(function (content) { init(content); })
    .catch(function (err) { console.error("chatbot: content.json failed to load:", err); });

  function init(content) {
    var d = content.chatbot;
    if (!d) return;

    var state = { step: "greeting", name: "", phone: "", company: "", service: "", greeted: false };

    // ---------- shell ----------

    var launcher = el("button", { class: "chat-launcher", type: "button", "aria-label": d.launcherLabel, "aria-haspopup": "dialog" });
    launcher.innerHTML = ICONS.chat;

    var nudge = el("button", { class: "chat-nudge", type: "button", text: d.nudgeText });

    var panel = el("div", { class: "chat-panel", role: "dialog", "aria-modal": "false", "aria-label": d.title, hidden: "" });
    var head = el("div", { class: "chat-head" });
    var headTitle = el("div", { class: "chat-head-title" });
    headTitle.innerHTML = K_MARK;
    headTitle.appendChild(el("span", { text: d.title }));
    var muteBtn = el("button", { class: "chat-icon-btn", type: "button", "data-muted": isMuted() ? "true" : "false" });
    muteBtn.innerHTML = '<span class="icon-on">' + ICONS.speakerOn + '</span><span class="icon-off">' + ICONS.speakerOff + "</span>";
    muteBtn.setAttribute("aria-label", isMuted() ? d.unmuteLabel : d.muteLabel);
    var closeBtn = el("button", { class: "chat-icon-btn", type: "button", "aria-label": d.closeLabel });
    closeBtn.innerHTML = ICONS.close;
    var headActions = el("div", { class: "chat-head-actions" }, [muteBtn, closeBtn]);
    head.appendChild(headTitle);
    head.appendChild(headActions);

    var messages = el("div", { class: "chat-messages", "aria-live": "polite" });
    var quickReplies = el("div", { class: "chat-quick-replies" });
    var inputRow = el("div", { class: "chat-input-row", hidden: "" });
    var input = el("input", { type: "text" });
    var sendBtn = el("button", { type: "button", text: d.sendLabel });
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    panel.appendChild(head);
    panel.appendChild(messages);
    panel.appendChild(quickReplies);
    panel.appendChild(inputRow);

    document.body.appendChild(launcher);
    document.body.appendChild(nudge);
    document.body.appendChild(panel);

    // ---------- transcript helpers ----------

    function scrollToEnd() { messages.scrollTop = messages.scrollHeight; }

    function addMessage(who, text) {
      var row = el("div", { class: "chat-row " + who });
      row.appendChild(el("div", { class: "chat-bubble", text: text }));
      messages.appendChild(row);
      scrollToEnd();
    }

    function showTyping(cb, delay) {
      var row = el("div", { class: "chat-row bot" });
      var bubble = el("div", { class: "chat-bubble" });
      bubble.innerHTML = '<span class="chat-typing"><span></span><span></span><span></span></span>';
      row.appendChild(bubble);
      messages.appendChild(row);
      scrollToEnd();
      setTimeout(function () { row.remove(); cb(); }, delay || 550);
    }

    function say(text, cb) {
      showTyping(function () { addMessage("bot", text); if (cb) cb(); });
    }

    function setChips(items) {
      quickReplies.innerHTML = "";
      items.forEach(function (item) {
        var chip = el("button", { class: "chat-chip", type: "button", text: item.label });
        chip.addEventListener("click", item.onClick);
        quickReplies.appendChild(chip);
      });
    }

    function setInput(opts) {
      if (!opts) { inputRow.hidden = true; return; }
      inputRow.hidden = false;
      input.type = opts.type || "text";
      input.placeholder = opts.placeholder || "";
      input.value = "";
      input.disabled = false;
      sendBtn.disabled = false;
      sendBtn.textContent = d.sendLabel;
      setTimeout(function () { input.focus(); }, 50);

      function submit() {
        var value = input.value.trim();
        opts.onSubmit(value);
      }
      sendBtn.onclick = submit;
      input.onkeydown = function (e) { if (e.key === "Enter") submit(); };
    }

    // ---------- flow ----------

    function serviceChips(onPick) {
      var chips = content.leadForm.serviceOptions.map(function (opt) {
        return { label: opt.label, onClick: function () { onPick(opt.value, opt.label); } };
      });
      chips.push({ label: d.questionOption, onClick: function () { onPick("__question__", d.questionOption); } });
      return chips;
    }

    function startGreeting() {
      setChips([]);
      setInput(null);
      if (state.greeted) {
        // Re-opened later in the same tab: pick up where the conversation
        // left off rather than repeating the whole flow.
        showStep();
        return;
      }
      detectLanguage(function (requestedLang) {
        resolveGreetingLanguage(requestedLang, function (lang) {
          var text = lang === "ta" ? d.greetingTa : d.greeting;
          say(text, function () {
            speak(text, lang);
            setChips(serviceChips(handleServicePick));
          });
        });
      });
      state.greeted = true;
    }

    function handleServicePick(value, label) {
      addMessage("user", label);
      setChips([]);
      if (value === "__question__") {
        say(d.questionResponse, function () {
          setChips(serviceChips(handleServicePick));
        });
        return;
      }
      state.service = value;
      state.step = "askName";
      say(fmt(d.askName, {}), promptName);
    }

    function promptName() {
      setInput({
        placeholder: "Your name",
        onSubmit: function (value) {
          if (!value) return;
          addMessage("user", value);
          state.name = value;
          setInput(null);
          askPhone();
        }
      });
    }

    function askPhone() {
      state.step = "askPhone";
      say(fmt(d.askPhone, { name: state.name }), promptPhone);
    }

    function promptPhone() {
      setInput({
        type: "tel",
        placeholder: "+91...",
        onSubmit: function (value) {
          if (!validPhone(value)) {
            addMessage("user", value || "");
            setInput(null);
            say(d.invalidPhone, promptPhone);
            return;
          }
          addMessage("user", value);
          state.phone = value;
          setInput(null);
          askCompany();
        }
      });
    }

    function askCompany() {
      state.step = "askCompany";
      say(d.askCompany, promptCompany);
    }

    function promptCompany() {
      setInput({
        placeholder: "Optional",
        onSubmit: function (value) {
          addMessage("user", value || d.skipLabel);
          state.company = value;
          setInput(null);
          setChips([]);
          submitLead();
        }
      });
      setChips([{ label: d.skipLabel, onClick: function () {
        addMessage("user", d.skipLabel);
        state.company = "";
        setInput(null);
        setChips([]);
        submitLead();
      } }]);
    }

    function submitLead() {
      state.step = "submitting";
      showTyping(function () {
        fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: state.name, phone: state.phone, company: state.company,
            service: state.service, source: "chatbot"
          })
        })
          .then(function (res) { if (!res.ok) throw new Error("failed"); return res.json(); })
          .then(function () {
            addMessage("bot", fmt(d.successMessage, { name: state.name }));
            setChips([{ label: d.restartLabel, onClick: resetConversation }]);
          })
          .catch(function () {
            addMessage("bot", d.errorMessage);
            setChips([
              { label: "Try again", onClick: submitLead },
              { label: d.restartLabel, onClick: resetConversation }
            ]);
          });
      }, 700);
    }

    function resetConversation() {
      state.step = "greeting";
      state.name = ""; state.phone = ""; state.company = ""; state.service = "";
      setChips([]);
      setInput(null);
      say(d.greeting, function () { setChips(serviceChips(handleServicePick)); });
    }

    function showStep() {
      // Re-render the current step's controls after reopening a resumed chat
      // (conversation state lives in memory only, so this covers close/reopen
      // within the same page view, not a full page reload).
      if (state.step === "greeting") { setChips(serviceChips(handleServicePick)); }
      else if (state.step === "askName") { promptName(); }
      else if (state.step === "askPhone") { promptPhone(); }
      else if (state.step === "askCompany") { promptCompany(); }
    }

    // ---------- open / close ----------

    var lastFocused = null;

    function openPanel() {
      lastFocused = document.activeElement;
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      nudge.hidden = true;
      try { localStorage.setItem("kashv_chat_nudge_seen", "1"); } catch (e) {}
      if (!messages.childElementCount) startGreeting();
      document.addEventListener("keydown", onKeydown);
    }
    function closePanel() {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    function onKeydown(e) { if (e.key === "Escape") closePanel(); }

    launcher.addEventListener("click", function () { panel.hidden ? openPanel() : closePanel(); });
    closeBtn.addEventListener("click", closePanel);
    nudge.addEventListener("click", openPanel);
    muteBtn.addEventListener("click", function () {
      var next = !isMuted();
      setMuted(next);
      muteBtn.setAttribute("data-muted", next ? "true" : "false");
      muteBtn.setAttribute("aria-label", next ? d.unmuteLabel : d.muteLabel);
      if (next) window.speechSynthesis && window.speechSynthesis.cancel();
    });

    var nudgeSeen = false;
    try { nudgeSeen = localStorage.getItem("kashv_chat_nudge_seen") === "1"; } catch (e) {}
    if (!nudgeSeen) {
      setTimeout(function () { if (panel.hidden) nudge.hidden = false; }, 4000);
    }
  }
})();
