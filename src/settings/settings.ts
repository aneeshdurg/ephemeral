import * as prod_settings from "./settings_prod.json";
import * as dev_settings from "./settings_dev.json";

export type Settings = typeof prod_settings;

let _settings: Settings | null = null;
if (process.env.NODE_ENV === "production") {
    _settings = prod_settings;
} else {
    _settings = dev_settings;
}

const settings: Settings = _settings!;
export default settings;
