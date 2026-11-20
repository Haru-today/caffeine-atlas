(function () {
  "use strict";

  const carousel = document.querySelector("[data-home-carousel]");
  if (!carousel) return;

  const stage = carousel.querySelector("[data-home-stage]");
  const controls = carousel.querySelector("[data-home-controls]");
  const announcement = carousel.querySelector("[data-home-announcement]");
  const banners = [...stage.querySelectorAll("[data-home-banner]")];
  const indicators = [...controls.querySelectorAll("[data-home-dot]")];
  const homeLinks = document.querySelectorAll('.home-menu a[href^="#"]');
  let activeIndex = 0;
  let gesture;
  let ignoreTapUntil = 0;

  function showBanner(index) {
    activeIndex = (index + banners.length) % banners.length;
    banners.forEach((banner, number) => {
      banner.hidden = activeIndex !== number;
    });
    indicators.forEach((indicator, number) => {
      if (activeIndex === number) indicator.setAttribute("aria-current", "true");
      else indicator.removeAttribute("aria-current");
    });
    announcement.textContent = indicators[activeIndex].getAttribute("aria-label");
  }

  controls.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-home-dot")) showBanner(Number(button.dataset.homeDot));
    else if (button.hasAttribute("data-home-step")) showBanner(activeIndex + Number(button.dataset.homeStep));
  });

  controls.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showBanner(activeIndex + (event.key === "ArrowLeft" ? -1 : 1));
  });
  stage.setAttribute("data-carousel-ready", "");
  controls.hidden = false;

  stage.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    ignoreTapUntil = 0;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  stage.addEventListener("pointercancel", event => {
    if (gesture?.id === event.pointerId) gesture = undefined;
  });
  stage.addEventListener("pointerup", event => {
    if (gesture?.id !== event.pointerId) return;
    const distance = event.clientX - gesture.x;
    const verticalDistance = Math.abs(event.clientY - gesture.y);
    gesture = undefined;
    if (Math.abs(distance) < 46 || Math.abs(distance) < verticalDistance * 1.3) return;
    ignoreTapUntil = performance.now() + 350;
    showBanner(activeIndex + (distance < 0 ? 1 : -1));
  });
  stage.addEventListener("click", event => {
    if (performance.now() < ignoreTapUntil) event.preventDefault();
  }, true);

  function updateHomeLocation() {
    const hash = window.location.hash;
    const target = document.getElementById(hash.slice(1));
    const guide = target?.closest("[data-home-guide]");
    if (guide) guide.open = true;

    let active = "#home";
    if (hash === "#report") active = "#report";
    else if (guide || hash === "#support") active = "#support";
    homeLinks.forEach(link => {
      if (link.getAttribute("href") === active) {
        link.setAttribute("aria-current", active === "#home" ? "page" : "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener("hashchange", updateHomeLocation);
  updateHomeLocation();
}());
