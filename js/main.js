// ── Theme: apply immediately to avoid flash ───────────────────────────────
(function () {
  const t = localStorage.getItem('skillswap-theme') || 'light';
  if (t !== 'dark') document.documentElement.setAttribute('data-theme', 'light');
})();

document.addEventListener("DOMContentLoaded", () => {

  // ── Theme toggle button ─────────────────────────────────────────────────
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
    toggle.textContent = isLight() ? '☀️' : '🌙';

    toggle.addEventListener('click', () => {
      if (isLight()) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('skillswap-theme', 'dark');
        toggle.textContent = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('skillswap-theme', 'light');
        toggle.textContent = '☀️';
      }
    });
  }

  // ── Sticky navbar glow on scroll ────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // ── Section title underline on scroll ───────────────────────────────────
  const titles = document.querySelectorAll(".section-title");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("active"); });
  }, { threshold: 0.4 });
  titles.forEach(t => observer.observe(t));

  // ── Card expand / dim ────────────────────────────────────────────────────
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const parent = card.closest(".flex");
      if (!parent) return;
      const siblings = parent.querySelectorAll(".card");
      const expanded = card.classList.contains("expanded");
      siblings.forEach(c => c.classList.remove("expanded", "dimmed"));
      if (!expanded) {
        card.classList.add("expanded");
        siblings.forEach(c => { if (c !== card) c.classList.add("dimmed"); });
      }
    });
  });

  // ── FAQ accordion ────────────────────────────────────────────────────────
  document.querySelectorAll(".faq-question").forEach(q => {
    q.addEventListener("click", () => {
      const answer = q.nextElementSibling;
      answer.style.maxHeight = answer.style.maxHeight ? null : answer.scrollHeight + "px";
    });
  });

  // ── Checkbox / Radio visual state (JS fallback for :has() ─────────────────
  // Checkboxes — toggle .selected on click
  document.querySelectorAll(".check-item").forEach(label => {
    const input = label.querySelector("input[type='checkbox']");
    if (!input) return;
    // Reflect initial state
    label.classList.toggle("selected", input.checked);
    label.addEventListener("click", () => {
      // Defer so the browser updates input.checked first
      requestAnimationFrame(() => {
        label.classList.toggle("selected", input.checked);
      });
    });
  });

  // Radios — only one active per group; clear siblings when one is picked
  document.querySelectorAll(".radio-item").forEach(label => {
    const input = label.querySelector("input[type='radio']");
    if (!input) return;
    label.classList.toggle("selected", input.checked);
    label.addEventListener("click", () => {
      requestAnimationFrame(() => {
        // Clear all siblings in the same group
        const groupName = input.name;
        document.querySelectorAll(`.radio-item input[name="${groupName}"]`).forEach(inp => {
          inp.closest(".radio-item").classList.toggle("selected", inp.checked);
        });
      });
    });
  });

  // ── Close nav avatar dropdown on outside click ─────────────────────────
  document.addEventListener('click', e => {
    const wrap = document.getElementById('nav-avatar-wrap');
    if (wrap && !wrap.contains(e.target)) {
      wrap.classList.remove('open');
    }
  });

});