/* ============================================================
   余洋 Yang Yu — 个人学术主页交互
   1. 滚动显现（JS 可用时）  2. 目录高亮  3. 锚点平滑滚动
   无第三方脚本、无统计、无外部请求
   ============================================================ */
(function () {
  "use strict";

  // 刷新时回到顶部，避免滚动位置累积偏移
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 0. 鼠标光斑 ---------- */
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer && !reducedMotion) {
    var spot = document.querySelector(".spotlight");
    if (spot) {
      var spotRaf = null;
      window.addEventListener(
        "mousemove",
        function (e) {
          if (spotRaf) return;
          spotRaf = requestAnimationFrame(function () {
            spot.style.setProperty("--mx", e.clientX + "px");
            spot.style.setProperty("--my", e.clientY + "px");
            spotRaf = null;
          });
        },
        { passive: true }
      );
    }
  }

  /* ---------- 1. 滚动显现 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    var revealIO = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add("visible");
            revealIO.unobserve(entries[i].target);
          }
        }
      },
      { threshold: 0.06 }
    );
    for (var j = 0; j < revealEls.length; j++) revealIO.observe(revealEls[j]);
  } else {
    for (var k = 0; k < revealEls.length; k++) revealEls[k].classList.add("visible");
  }

  /* ---------- 2. 目录高亮 + 3. 平滑滚动 ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  navLinks.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var target = id && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", id);
    });
  });

  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + entries[i].target.id);
          });
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 4. 带 hash 打开时定位到目标 ---------- */
  window.addEventListener("load", function () {
    if (location.hash) {
      var t = document.querySelector(location.hash);
      if (t) { t.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  });
})();
