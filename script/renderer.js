import { parse } from "jsonc-parser";
import { validateConfig } from "./validator.js";

const openBtn = document.getElementById("openFile");
const editor = document.getElementById("editor");
const cssEditor = document.getElementById("cssEditor");
const openCss = document.getElementById("openCss");
const errorsEl = document.getElementById("errors");
const previewEl = document.getElementById("waybar");
const cssLink = document.getElementById("cssStyle");
const placeholderEditor = document.getElementById("placeholderEditor");
const applyBtn = document.getElementById("applyPlaceholders");

const defaultPlaceholders = {
    "{icon}": "❔",
    "{text}": "",
    "{name}": "",
    "{count}": "0",
    "{capacity}": "100%",
    "{temperatureC}": "42",
    "{stateIcon}": "",
    "{volume}": "50",
    "{app}": "App",
    "{title}": "Title",
    "{elapsedTime:%M:%S}": "01:23",
    "{totalTime:%M:%S}": "03:45",
    "{songPosition}": "1",
    "{queueLength}": "5",
    "{format_source}": "Src",
    "{profile}": "default",
    "{ifname}": "eth0",
    "{ipaddr}": "192.168.0.1",
    "{cidr}": "24",
    "{essid}": "WiFi",
    "{percent}": "35"
};

placeholderEditor.value = JSON.stringify(defaultPlaceholders, null, 4);

// ---------- JSONC Config Handling ----------

openBtn.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const content = await file.text();
    editor.value = content;
    onConfigChange(content);
});

editor.addEventListener("input", () => onConfigChange(editor.value));

async function loadDefaultConfig() {
    try {
        const res = await fetch("test/json/default.jsonc"); // relative path for GH Pages
        if (!res.ok) throw new Error(`Failed to load JSONC: ${res.status}`);
        const content = await res.text();
        editor.value = content;
        onConfigChange(content);
    } catch (err) {
        console.error(err);
    }
}

function onConfigChange(rawJsonc) {
    let parsed;
    const parseErrors = [];

    try {
        parsed = parse(rawJsonc, parseErrors, { allowTrailingComma: true });
    } catch (e) {
        showErrors([e.message]);
        return;
    }

    if (parseErrors.length > 0) {
        showErrors(parseErrors.map(e => `Parse error at offset ${e.offset}`));
        return;
    }

    const errors = validateConfig(parsed);
    if (errors.length > 0) {
        showErrors(errors);
    } else {
        clearErrors();
        renderPreview(parsed);
        styleSet(parsed);
    }
}

function showErrors(errors) {
    errorsEl.textContent = errors.map(err => typeof err === "string" ? err : JSON.stringify(err)).join("\n");
}

function clearErrors() {
    errorsEl.textContent = "";
}

// ---------- Waybar Preview Rendering ----------

function renderPreview(config) {
    previewEl.innerHTML = "";

    function renderModuleList(list, containerName) {
        const container = document.createElement("div");
        container.className = containerName;

        if (!list) return;
        if (!Array.isArray(list) && typeof list === "object") list = Object.keys(list);

        list.forEach(name => {
            const moduleEl = document.createElement("div");
            let id = name.includes("/") ? name.split("/").pop() : name;
            if (name.startsWith("custom/")) id = name.replace("custom/", "custom-");
            moduleEl.id = id;

            const moduleConfig = config[name];
            if (!moduleConfig || Object.keys(moduleConfig).length === 0) {
                moduleEl.style.display = "none";
                moduleEl.textContent = name;
            } else {
                let text = moduleConfig.format || name;
                let placeholders = getPlaceholders(moduleConfig, name);

                for (const [key, value] of Object.entries(placeholders)) {
                    text = text.replaceAll(key, value);
                }

                if (text.length >= 20) text = `text too long (${text.length})`;
                moduleEl.textContent = text;
            }

            container.appendChild(moduleEl);
        });

        previewEl.appendChild(container);
    }

    renderModuleList(config["modules-left"], "left");
    renderModuleList(config["modules-center"], "center");
    renderModuleList(config["modules-right"], "right");
}

function styleSet(config) {
    if (config.height) previewEl.style.maxHeight = config.height + "px";
}

// ---------- CSS Handling ----------

// Create live <style> element for editor/live updates
let liveStyle = document.getElementById("live-css");
if (!liveStyle) {
    liveStyle = document.createElement("style");
    liveStyle.id = "live-css";
    document.head.appendChild(liveStyle);
}

function applyCss(cssText) {
    liveStyle.textContent = cssText;
}

function loadCss(filePath) {
    if (!cssLink) return console.error("#cssStyle element not found");
    cssLink.href = filePath;
}

async function loadDefaultCss() {
    try {
        const res = await fetch("styles/default.css"); // relative path
        if (!res.ok) throw new Error(`Failed to load CSS: ${res.status}`);
        const css = await res.text();

        cssEditor.value = css;
        applyCss(css);
        loadCss("styles/default.css"); // fallback <link>
    } catch (err) {
        console.error(err);
    }
}

// ---------- Placeholders ----------

function getPlaceholders(moduleConfig, name) {
    let userPlaceholders = {};
    if (placeholderEditor) {
        try {
            userPlaceholders = JSON.parse(placeholderEditor.value);
        } catch {
            console.warn("Invalid placeholders JSON");
        }
    }

    return {
        ...defaultPlaceholders,
        ...userPlaceholders,
        "{icon}": moduleConfig["format-icons"]?.default || (userPlaceholders["{icon}"] ?? "❔"),
        "{text}": moduleConfig.text || (userPlaceholders["{text}"] ?? "")
    };
}

// ---------- Event Listeners ----------

openCss.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    cssEditor.value = text;
    applyCss(text);
});

cssEditor.addEventListener("input", () => applyCss(cssEditor.value));

applyBtn.addEventListener("click", () => {
    let currentConfig;
    try {
        currentConfig = parse(editor.value, [], { allowTrailingComma: true });
    } catch {
        console.warn("Invalid JSONC in config editor");
        return;
    }

    renderPreview(currentConfig);
});

// ---------- DOMContentLoaded ----------

document.addEventListener("DOMContentLoaded", () => {
    loadDefaultCss();
    loadDefaultConfig();
});
