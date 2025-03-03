/* eslint-disable no-invalid-this */

function factoryReset() {
    console.log("[Steam Web Integration] Performing factory reset...");
    return chrome.storage.local.clear();
}

async function setSettings(newSettings) {
    let settings = await chrome.runtime.sendMessage({ "action": "getSettings" });
    settings = { ...settings, ...newSettings };
    await chrome.storage.local.set({ "swi_settings": settings });
    return true;
}

function showToast() {
    const toast = document.getElementById("snackbar");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2900);
}

function getSelectValues(select) {
    let result = [];
    let options = select && select.options;
    let opt;

    for (let i = 0, iLen = options.length; i < iLen; i++) {
        opt = options[i];

        if (opt.selected) {
            result.push(opt.value || opt.text);
        }
    }
    return result;
}

function onChange(elem) {
    const { value, type, checked } = elem;
    const name = elem.dataset.setting;
    const newSettings = {};

    if (type === "checkbox") {
        newSettings[name] = Boolean(checked);
        if (name === "whiteListMode") {
            const blackListText = document.querySelector("#blackListText");
            blackListText.innerHTML = elem.checked ? "Whitelist" : "Blacklist";
        } else if (name === "boxed") {
            if (elem.checked) {
                document.querySelectorAll(".boxDisable").forEach((x) => {
                    x.removeAttribute("disabled");
                });
            } else {
                document.querySelectorAll(".boxDisable").forEach((x) => {
                    x.setAttribute("disabled", "");
                });
            }
        }
    } else if (type === "select-multiple") {
        newSettings[name] = getSelectValues(elem);
    } else {
        if (name === "dynamicContent") {
            if (elem.value === "ping") {
                document.querySelectorAll(".buttonDisable").forEach((x) => {
                    if (x.id === "factoryReset") { return; }
                    x.setAttribute("disabled", "");
                    x.style.opacity = "0.5";
                });
            } else {
                document.querySelectorAll(".buttonDisable").forEach((x) => {
                    x.removeAttribute("disabled");
                    x.style.opacity = "1";
                });
            }
        }
        newSettings[name] = Number.isFinite(value) ? Number(value) : value;
    }

    setSettings(newSettings);
    showToast();
}

function openModal(modal, overlay) {
    document.querySelector(`#${modal}`).classList.add("active");
    overlay.classList.add("active");
}

function closeModal(modal, overlay) {
    modal.classList.remove("active");
    overlay.classList.remove("active");
}

document.addEventListener("DOMContentLoaded", async() => {
    console.log("[Steam Web Integration] Popup loaded");
    /* Collapsibles */
    const colaps = document.querySelectorAll(".collapsible");
    const overlay = document.querySelector("#overlay");
    const openModalButtons = document.querySelectorAll("[data-modal]");
    const closeModalButtons = document.querySelectorAll("[data-closemodal]");
    for (let i = 0; i < colaps.length; i++) {
        // eslint-disable-next-line func-names
        colaps[i].addEventListener("click", function() {
            this.classList.toggle("active");
            let content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = `${content.scrollHeight}px`;
            }
        });
    }
    /* Collapsibles */

    const permissions = {
        "origins": ["https://store.steampowered.com/*", "http://*/*", "https://*/*"],
        // "permissions": ["storage", "unlimitedStorage", "contextMenus"],
    };

    let granted = await chrome.permissions.contains(permissions);
    if (!granted) {
        openModal("permmodal", overlay);
        document.getElementById("setup").addEventListener("click", () => {
            chrome.permissions.request(permissions, (granted) => {
                if (granted) {
                    location.reload();
                } else {
                    // eslint-disable-next-line no-alert
                    alert("You must grant the permissions to use this extension.");
                }
            });
            window.close();
        });
        return;
    }

    let settings = await chrome.runtime.sendMessage({ "action": "getSettings" });
    document.getElementById("blackList").placeholder = "example.com\nftp://\n/bundle/";
    for (let node of document.querySelectorAll("[data-setting]")) {
        const name = node.dataset.setting;
        const value = settings[name];

        if (typeof value === "boolean") {
            node.checked = value;
            if (name === "whiteListMode") {
                const blackListText = document.querySelector("#blackListText");
                blackListText.innerHTML = node.checked ? "Whitelist" : "Blacklist";
            } else if (name === "boxed") {
                if (node.checked) {
                    document.querySelectorAll(".boxDisable").forEach((x) => {
                        x.removeAttribute("disabled");
                    });
                } else {
                    document.querySelectorAll(".boxDisable").forEach((x) => {
                        x.setAttribute("disabled", "");
                    });
                }
            }
        } else if (Array.isArray(value)) {
            for (let option of node.options) {
                option.selected = value.includes(option.value);
            }
        } else {
            node.value = value;
            if (name === "dynamicContent" && node.value === "ping") {
                document.querySelectorAll(".buttonDisable").forEach((x) => {
                    if (x.id === "factoryReset") { return; }
                    x.setAttribute("disabled", "");
                    x.style.opacity = "0.5";
                });
            }
            node.dispatchEvent(new Event("input", { "bubbles": true }));
        }

        node.addEventListener("change", () => onChange(node));
    }

    /* Buttons */
    document.getElementById("run").addEventListener("click", () => {
        chrome.runtime.sendMessage({ "action": "runSWI" });
    });

    document.getElementById("reload").addEventListener("click", () => {
        chrome.runtime.sendMessage({ "action": "reloadSWI" });
    });

    document.getElementById("clear").addEventListener("click", () => {
        chrome.runtime.sendMessage({ "action": "clearSWI" });
    });

    document.getElementById("factoryReset").addEventListener("click", async() => {
        await factoryReset();
        location.reload();
    });
    /* Buttons */

    /* Icon Group */
    for (let node of document.querySelectorAll("[data-check]")) {
        const name = node.dataset.check;
        if (!node.checked) {
            document.querySelectorAll(`.${name}Disable`).forEach((x) => {
                x.setAttribute("disabled", "");
            });
        }
    }
    for (let node of document.querySelectorAll("[data-colorinput]")) {
        const name = node.dataset.colorinput;
        const value = settings[name];
        node.style.color = value;
    }
    document.getElementById("ignoredCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".ignoredDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("followedCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".followedDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("dlcCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".dlcDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("decommissionedCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".decommissionedDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("limitedCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".limitedDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("cardCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".cardDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("bundleCheck").addEventListener("change", (a) => {
        document.querySelectorAll(".bundleDisable").forEach((x) => {
            // eslint-disable-next-line no-unused-expressions
            a.target.checked ? x.removeAttribute("disabled") : x.setAttribute("disabled", "");
        });
    });
    document.getElementById("ignoredIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#ignoredIconColor").style.color = a.target.value;
    });
    document.getElementById("followedIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#followedIconColor").style.color = a.target.value;
    });
    document.getElementById("dlcIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#dlcIconColor").style.color = a.target.value;
    });
    document.getElementById("decommissionedIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#decommissionedIconColor").style.color = a.target.value;
    });
    document.getElementById("limitedIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#limitedIconColor").style.color = a.target.value;
    });
    document.getElementById("cardIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#cardIconColor").style.color = a.target.value;
    });
    document.getElementById("bundleIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#bundleIconColor").style.color = a.target.value;
    });
    document.getElementById("ownedIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#ownedIconColor").style.color = a.target.value;
    });
    document.getElementById("unownedIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#unownedIconColor").style.color = a.target.value;
    });
    document.getElementById("wishlistIconColorInput").addEventListener("change", (a) => {
        document.querySelector("#wishlistIconColor").style.color = a.target.value;
    });
    /* Icon Group */

    /* Modal */
    openModalButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const { modal } = button.dataset;
            openModal(modal, overlay);
        });
    });
    closeModalButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const modal = button.closest(".modal");
            closeModal(modal, overlay);
        });
    });
    /* Modal */
});

// eslint-disable-next-line no-undef
jscolor.presets.default = { "backgroundColor": "#192533", "borderColor": "transparent" };
