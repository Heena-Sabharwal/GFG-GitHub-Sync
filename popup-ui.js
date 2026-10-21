(() => {
    const panels = [...document.querySelectorAll("[data-panel]")];
    const navItems = [...document.querySelectorAll(".nav-item[data-open-tab]")];
    const tabTriggers = [...document.querySelectorAll("[data-open-tab]")];
    const updateReview = document.getElementById("updateReview");

    function openTab(name) {
        // Never strand a pending overwrite review on a hidden screen.
        if (updateReview && !updateReview.hidden && name !== "home") {
            name = "home";
        }

        for (const panel of panels) {
            const active = panel.dataset.panel === name;
            panel.hidden = !active;
            panel.classList.toggle("is-active", active);
        }

        for (const item of navItems) {
            const active = item.dataset.openTab === name;
            item.classList.toggle("is-active", active);
            if (active) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        }
    }

    for (const trigger of tabTriggers) {
        trigger.addEventListener("click", () => openTab(trigger.dataset.openTab));
    }

    if (updateReview) {
        const observer = new MutationObserver(() => {
            if (!updateReview.hidden) openTab("home");
        });
        observer.observe(updateReview, { attributes: true, attributeFilter: ["hidden"] });
    }

    openTab("home");
})();
