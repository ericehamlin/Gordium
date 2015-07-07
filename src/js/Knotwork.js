class Knotwork {

    /**
     *
     * @param filename
     * @param svg
     */
    constructor(filename=null, svg=null) {
        let self = this;
        this.filename = filename;
        this.svg = svg;

        if (filename !== null) {
            this.filename = filename;

            Gordium.loadSvg(filename).then(function(svg) {
                self.svg = svg;
                var paths = Gordium.getPathsFromSvg(self.svg);
                console.log("PATHS3", paths);
            }).catch(function(error) {
                console.log(error);
            });
        }
        else if (svg !== null) {

        }
        else {
            throw new Error("hey, no svg!");
        }


    }
}