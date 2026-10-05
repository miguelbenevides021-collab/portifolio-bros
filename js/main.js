// Tema, rolagem, serviços e apresentações da dupla.

const root = document.documentElement,
  toggle = document.querySelector(".theme-toggle"),
  reduce = matchMedia("(prefers-reduced-motion: reduce)");
let themeBusy = false;
function syncTheme() {
  const dark = root.dataset.theme === "dark";
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute("aria-label", dark ? "Ativar modo claro" : "Ativar modo escuro");
  toggle.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
}
syncTheme();
function changeTheme() {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("bros-theme", root.dataset.theme);
  } catch (e) {}
  syncTheme();
}
toggle.addEventListener("click", async () => {
  if (themeBusy) return;
  if (reduce.matches || !document.startViewTransition) {
    changeTheme();
    return;
  }
  themeBusy = true;
  const rect = toggle.getBoundingClientRect(),
    x = rect.left + rect.width / 2,
    y = rect.top + rect.height / 2,
    r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add("theme-changing");
  try {
    const t = document.startViewTransition(changeTheme);
    await t.ready;
    await root.animate(
      {
        clipPath: [
          "circle(0px at " + x + "px " + y + "px)",
          "circle(" + r + "px at " + x + "px " + y + "px)",
        ],
      },
      {
        duration: 720,
        easing: "cubic-bezier(.22,.61,.36,1)",
        pseudoElement: "::view-transition-new(root)",
        fill: "both",
      },
    ).finished;
    await t.finished;
  } catch (e) {
  } finally {
    root.classList.remove("theme-changing");
    themeBusy = false;
  }
});
if ("IntersectionObserver" in window && !reduce.matches) {
  root.classList.add("js");
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("pending");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(
      ".project,.story>*,.about-aside,.footer h2,.contact-intro,.contact-actions,.offerings-heading,.service-row,.tech-strip,.why-heading,.reasons article",
    )
    .forEach((el) => {
      el.classList.add("reveal", "pending");
      observer.observe(el);
    });
  reduce.addEventListener("change", () => {
    if (reduce.matches) {
      document.querySelectorAll(".pending").forEach((el) => el.classList.remove("pending"));
      observer.disconnect();
    }
  });
}
let ticking = false;
function progress() {
  const max = root.scrollHeight - innerHeight;
  document.querySelector(".reading-progress").style.transform =
    "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
  if (!reduce.matches && innerWidth > 800)
    document.querySelectorAll(".preview").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const shift = Math.max(-7, Math.min(7, (r.top + r.height / 2 - innerHeight / 2) * 0.015));
        el.style.setProperty("--image-shift", shift + "px");
      }
    });
  ticking = false;
}
addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(progress);
      ticking = true;
    }
  },
  { passive: true },
);
addEventListener("resize", progress);
progress();
// Wheel inertia on desktops; touch, keyboard and reduced-motion remain native.
let target = scrollY,
  scrollFrame = 0,
  lastFrame = 0;
const fine = matchMedia("(pointer:fine)");
function cancelSmooth() {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
  lastFrame = 0;
  target = scrollY;
}
function smoothStep(time) {
  const dt = lastFrame ? Math.min(time - lastFrame, 50) : 16.7;
  lastFrame = time;
  const current = scrollY,
    next = current + (target - current) * (1 - Math.exp(-dt / 75));
  window.scrollTo({ top: Math.abs(target - current) < 0.7 ? target : next, behavior: "instant" });
  if (Math.abs(target - scrollY) > 0.7) scrollFrame = requestAnimationFrame(smoothStep);
  else {
    scrollFrame = 0;
    lastFrame = 0;
  }
}
function hasScrollParent(node, dy) {
  for (let el = node; el && el !== document.body; el = el.parentElement) {
    if (el.matches?.('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return true;
    const style = getComputedStyle(el);
    if (
      /auto|scroll/.test(style.overflowY) &&
      el.scrollHeight > el.clientHeight &&
      ((dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight) || (dy < 0 && el.scrollTop > 0))
    )
      return true;
  }
  return false;
}
addEventListener(
  "wheel",
  (e) => {
    if (
      reduce.matches ||
      !fine.matches ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ||
      hasScrollParent(e.target, e.deltaY)
    )
      return;
    const max = root.scrollHeight - innerHeight,
      dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!dy || max <= 0) return;
    if (!scrollFrame) target = scrollY;
    const next = Math.max(0, Math.min(max, target + dy));
    if (next === target) return;
    e.preventDefault();
    target = next;
    if (!scrollFrame) scrollFrame = requestAnimationFrame(smoothStep);
  },
  { passive: false },
);
addEventListener("keydown", cancelSmooth);
addEventListener("touchstart", cancelSmooth, { passive: true });
addEventListener("pointerdown", cancelSmooth, { passive: true });
reduce.addEventListener("change", cancelSmooth);
addEventListener("resize", cancelSmooth);

// Native details semantics, with interruptible open AND close animations.
const accordionRows = [...document.querySelectorAll(".service-row")];
const accordionState = new Map();
const accordionReduced = matchMedia("(prefers-reduced-motion: reduce)");
function settleRow(row, expanded) {
  const s = accordionState.get(row);
  if (s?.heightAnimation) {
    s.heightAnimation.onfinish = null;
    s.heightAnimation.cancel();
  }
  if (s?.contentAnimation) s.contentAnimation.cancel();
  row.open = expanded;
  row.style.height = "";
  row.style.overflow = "";
  row.dataset.expanded = String(expanded);
  row.querySelector("summary").setAttribute("aria-expanded", String(expanded));
  accordionState.set(row, { expanded, heightAnimation: null, contentAnimation: null });
}
function animateRow(row, expanded) {
  const previous = accordionState.get(row);
  const start = row.getBoundingClientRect().height;
  if (previous?.heightAnimation) {
    previous.heightAnimation.onfinish = null;
    previous.heightAnimation.cancel();
  }
  if (previous?.contentAnimation) previous.contentAnimation.cancel();
  row.style.height = "";
  row.style.overflow = "";
  row.open = true;
  row.dataset.expanded = String(expanded);
  const summary = row.querySelector("summary"),
    content = row.querySelector(".service-content");
  summary.setAttribute("aria-expanded", String(expanded));
  const borders =
    parseFloat(getComputedStyle(row).borderTopWidth) +
    parseFloat(getComputedStyle(row).borderBottomWidth);
  const end = expanded
    ? row.getBoundingClientRect().height
    : summary.getBoundingClientRect().height + borders;
  if (accordionReduced.matches || !row.animate) {
    settleRow(row, expanded);
    return;
  }
  row.style.overflow = "hidden";
  const heightAnimation = row.animate(
    { height: [start + "px", end + "px"] },
    { duration: expanded ? 480 : 390, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" },
  );
  const contentAnimation = content.animate(
    expanded
      ? { opacity: [0, 1], transform: ["translateY(-7px)", "translateY(0)"] }
      : { opacity: [1, 0], transform: ["translateY(0)", "translateY(-4px)"] },
    { duration: expanded ? 370 : 180, easing: "ease-out", fill: "both" },
  );
  accordionState.set(row, { expanded, heightAnimation, contentAnimation });
  heightAnimation.onfinish = () => {
    if (accordionState.get(row)?.heightAnimation === heightAnimation) settleRow(row, expanded);
  };
}
accordionRows.forEach((row, i) => {
  const summary = row.querySelector("summary"),
    content = row.querySelector(".service-content");
  content.id = "service-panel-" + i;
  summary.setAttribute("aria-controls", content.id);
  settleRow(row, row.open);
  summary.addEventListener("click", (e) => {
    e.preventDefault();
    const expanded = !accordionState.get(row).expanded;
    if (expanded)
      accordionRows.forEach((other) => {
        if (other !== row && accordionState.get(other).expanded) animateRow(other, false);
      });
    animateRow(row, expanded);
  });
});
function settleAccordions() {
  accordionRows.forEach((row) => settleRow(row, accordionState.get(row).expanded));
}
addEventListener("resize", settleAccordions);
accordionReduced.addEventListener("change", settleAccordions);

(() => {
  const aside = document.querySelector(".about-aside"),
    reduce = matchMedia("(prefers-reduced-motion: reduce)"),
    profiles = [
      ["allan", ".allan-trigger", "#allan-bio"],
      ["miguel", ".miguel-trigger", "#miguel-bio"],
    ].map(([id, trigger, panel]) => ({
      id,
      button: document.querySelector(trigger),
      panel: document.querySelector(panel),
      parts: [],
    }));
  let active = null,
    pinned = null,
    frame = 0,
    run = 0;
  profiles.forEach((profile) => {
    profile.panel.querySelectorAll("p").forEach((p) => {
      const text = p.textContent;
      p.textContent = "";
      p.classList.add("typing-paragraph");
      const sr = document.createElement("span");
      sr.className = "profile-sr";
      sr.textContent = text;
      const ghost = document.createElement("span");
      ghost.className = "typing-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.textContent = text;
      const visual = document.createElement("span");
      visual.className = "typing-visual";
      visual.setAttribute("aria-hidden", "true");
      p.append(sr, ghost, visual);
      profile.parts.push({ text, visual });
    });
  });
  function stop() {
    run++;
    cancelAnimationFrame(frame);
    profiles.forEach((p) =>
      p.parts.forEach((x) => x.visual.classList.remove("is-typing", "is-complete")),
    );
  }
  function type(profile) {
    stop();
    profile.parts.forEach((x) => (x.visual.textContent = reduce.matches ? x.text : ""));
    if (reduce.matches) {
      profile.parts.at(-1).visual.classList.add("is-complete");
      return;
    }
    const token = run,
      start = performance.now(),
      count = profile.parts.reduce((n, p) => n + p.text.length, 0),
      duration = Math.min(4400, Math.max(2300, count * 8));
    function tick(now) {
      if (token !== run) return;
      let available = Math.floor((Math.max(0, now - start - 120) / duration) * count);
      let cursor = false;
      profile.parts.forEach((part) => {
        const length = Math.min(part.text.length, Math.max(0, available));
        part.visual.textContent = part.text.slice(0, length);
        const current = !cursor && length < part.text.length;
        part.visual.classList.toggle("is-typing", current);
        if (current) cursor = true;
        available -= part.text.length;
      });
      if (now - start < duration + 120) frame = requestAnimationFrame(tick);
      else
        profile.parts.forEach((x, index) => {
          x.visual.textContent = x.text;
          x.visual.classList.remove("is-typing");
          x.visual.classList.toggle("is-complete", index === profile.parts.length - 1);
        });
    }
    frame = requestAnimationFrame(tick);
  }
  function show(profile) {
    if (active === profile) return;
    stop();
    active = profile;
    profiles.forEach((p) => {
      const open = p === profile;
      p.button.setAttribute("aria-expanded", String(open));
      p.panel.setAttribute("aria-hidden", String(!open));
      p.panel.inert = !open;
      p.panel.classList.toggle("is-open", open);
    });
    if (profile) type(profile);
  }
  profiles.forEach((profile) => {
    profile.button.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") {
        pinned = null;
        show(profile);
      }
    });
    profile.button.addEventListener("focus", () => {
      if (profile.button.matches(":focus-visible")) {
        pinned = null;
        show(profile);
      }
    });
    profile.button.addEventListener("click", () => {
      if (pinned === profile) {
        pinned = null;
        show(null);
      } else {
        pinned = profile;
        show(profile);
      }
    });
    profile.button.addEventListener("blur", () => {
      if (!pinned && !aside.matches(":hover")) show(null);
    });
  });
  aside.addEventListener("pointerleave", () => {
    if (!pinned) show(null);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!aside.contains(e.target)) {
      pinned = null;
      show(null);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      pinned = null;
      show(null);
    }
  });
  reduce.addEventListener("change", () => {
    if (active) type(active);
  });
})();

// Discreet sticky navigation: the page remains visible behind the menu.
{
  const header = document.querySelector(".site-header");
  function updateHeader() {
    header.classList.toggle("is-scrolled", scrollY > 15);
  }
  addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}
