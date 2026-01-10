import Ajv from "ajv";
import waybarSchema from "../schemas/waybar.json";

const ajv = new Ajv({ allErrors: true });

const validateWaybar = ajv.compile(waybarSchema);

export function validateConfig(config) {
    const valid = validateWaybar(config);
    return valid ? [] : validateWaybar.errors ?? [];
}
