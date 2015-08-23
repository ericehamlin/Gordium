class Config {

    constructor(defaultConfig = {}, config = {}) {
        this.config = defaultConfig;

        overrideProperties(defaultConfig, config);
    }

    overrideProperties(defaultConfig, config) {
        for (let key in config) {
            this.config[key] = config[key];
        }
    }
}