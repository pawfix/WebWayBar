const fs = require("fs");
const { ipcRenderer } = require("electron");
const { validateConfig } = require("./renderer/validator");

ipcRenderer.on("config-file-path", (_, data) => {
    if (!data || !data.path) return

    try {
        const content = fs.readFileSync(data.path, "utf8")
        editor.value = content
        onConfigChange(content)
    } catch (e) {
        showErrors([e.message])
    }
})


function onConfigChange(rawJson) {
    let parsed;

    try {
        parsed = JSON.parse(rawJson);
    } catch (e) {
        showErrors([e.message]);
        return;
    }

    const errors = validateConfig(parsed);

    if (errors.length > 0) {
        showErrors(errors);
    } else {
        renderPreview(parsed);
    }
}

function loadConfig(path) {
    try {
        const raw = fs.readFileSync(path, "utf8");
        return { data: JSON.parse(raw), errors: [] };
    } catch (e) {
        return { data: null, errors: [e.message] };
    }
}

const openBtn = document.getElementById("openFile");
const editor = document.getElementById("editor");

openBtn.addEventListener("click", async () => {
    const result = await ipcRenderer.invoke("open-config-file");

    if (result.canceled) return;

    const path = result.filePaths[0];
    const content = fs.readFileSync(path, "utf8");

    editor.value = content;
    onConfigChange(content);
});

const errorsEl = document.getElementById("errors");

function showErrors(errors) {
    if (!errors || errors.length === 0) {
        errorsEl.textContent = "";
        return;
    }

    // Convert errors array to readable string
    errorsEl.textContent = errors
        .map(err => {
            if (typeof err === "string") return err;
            if (err.message) return err.message;
            return JSON.stringify(err);
        })
        .join("\n");
}

function clearErrors() {
    errorsEl.textContent = "";
}

const previewEl = document.getElementById("waybar");

function renderPreview(config) {
    // Safety: config must be an object
    if (!config || typeof config !== "object") {
        previewEl.innerHTML = "";
        return;
    }

    // Clear existing preview
    previewEl.innerHTML = "";

    // Helper to render module lists
    function renderModuleList(list, containerName) {
        const container = document.createElement("div");
        container.className = containerName; // e.g., left, center, right
        if (!Array.isArray(list)) return; // safety

        list.forEach(name => {
            const moduleEl = document.createElement("div");
            let id;

            if (name.startsWith("custom/")) {
                id = name.replace("custom/", "custom-")
            } else if (name.includes("/")) {
                id = name.split("/").pop()
            } else {
                id = name
            }

            moduleEl.id = id

            moduleEl.textContent = name; // show the module name
            container.appendChild(moduleEl);
        });

        previewEl.appendChild(container);
    }

    // Render left, center, right
    renderModuleList(config["modules-left"], "left");
    renderModuleList(config["modules-center"], "center");
    renderModuleList(config["modules-right"], "right");
}
