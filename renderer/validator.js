const fs = require("fs");
const Ajv = require("ajv");

const ajv = new Ajv({ allErrors: true });

function loadSchema(path) {
    return JSON.parse(fs.readFileSync(path, "utf8"));
}

const waybarSchema = loadSchema("./schemas/waybar.json");
const validateWaybar = ajv.compile(waybarSchema);

function validateConfig(config) {
    const valid = validateWaybar(config);
    return valid ? [] : validateWaybar.errors;
}

module.exports = { validateConfig };
