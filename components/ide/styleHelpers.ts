export function restyleSuggestPanes() {
    const forceDocPane = () => {
        const details = document.querySelector(".suggest-details.no-type") as HTMLElement | null;
        if (details) {
            details.style.width = "auto";
            details.style.maxWidth = "600px";
            details.style.height = "auto";
            details.style.maxHeight = "none";
            details.style.fontSize = "14px";
            details.style.padding = "4px";
            details.style.overflow = "visible";
            details.style.boxSizing = "border-box";
            details.style.margin = "0";
        }

        const container = document.querySelector(".suggest-details-container") as HTMLElement | null;
        if (container) {
            container.style.display = "block";
            container.style.width = "600px";
            container.style.padding = "1px";
            container.style.overflow = "visible";
            container.style.alignItems = "flex-start";
        }

        const scrollable = details?.querySelector(".monaco-scrollable-element") as HTMLElement | null;
        if (scrollable) {
            scrollable.style.overflow = "visible";
            scrollable.style.maxHeight = "none";
            scrollable.style.boxShadow = "none";
        }

        const shadow = details?.querySelector(".scrollbar-shadow-top") as HTMLElement | null;
        if (shadow) {
            shadow.style.display = "none";
        }

        const widget = document.querySelector(".suggest-widget") as HTMLElement | null;
        if (widget && !widget.classList.contains("shows-details")) {
            widget.classList.add("shows-details");
        }
    };
    const observer = new MutationObserver(forceDocPane);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    return () => observer.disconnect();
}
