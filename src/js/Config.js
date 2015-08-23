class Config {

    constructor(config = {}) {
        this.sampleInterval = 10,
        this.knots = []

        this.overrideProperties(config);
    }

    overrideProperties(config) {
        for (let key in config) {
            this[key] = config[key];
        }
    }
}

Gordium.Config = Config;