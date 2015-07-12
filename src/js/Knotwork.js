class Knotwork {

    /**
     *
     * @param filename
     * @param srcSvg
     */
    constructor(filename=null, srcSvg=null, sampleInterval=10) {
        let self = this;

        this.filename = filename;
        this.srcSvg = srcSvg;
        this.knots = [];
        this.sampleInterval = sampleInterval;

        this.destSvg = document.getElementById("dest-svg");
        this.showSvg = document.getElementById("show-svg");

        if (filename !== null) {
            this.filename = filename;

            Gordium.loadSvg(filename).then(function(svg) {
                self.srcSvg = svg;
                self.showSvg.insertAdjacentHTML("afterbegin", svg.innerHTML);
                self.processKnotwork();
            })/*.catch(function(error) {
                throw new Error("Couldn't load source SVG!");
            });*/
        }
        else if (srcSvg !== null) {
            processKnotwork();
        }
        else {
            throw new Error("Hey, there's no source SVG!");
        }

    }

    processKnotwork() {
        this.getPathsFromSvg();
        Gordium.findIntersectionsForKnots(this.knots, this.sampleInterval);
        this.drawIntersections();
        this.segmentCurves();
        // find Over/Under for path segments
        // find curves from path segments
        // animate each curve
        this.drawCurveSegments();


    }

    /**
     *
     */
    getPathsFromSvg() {
        var paths = Gordium.getPathsFromSvg(this.srcSvg);
        for (var i = 0; i < paths.length; i++) {
            this.knots.push(new Knot(paths[i], this.sampleInterval));
        }
    }

    /**
     * Break curves into curve segments on either side of intersections
     */
    segmentCurves() {
        for (var i=0; i<this.knots.length; i++) {
            this.knots[i].segmentCurves();
        }
    }

    /**
     * TODO debug only
     */
    drawIntersections() {
        for (var i = 0; i < this.knots.length; i++) {
            this.knots[i].drawIntersections();
        }
    }

    /**
     * TODO debug only
     */
    drawCurveSegments() {
        for (var i = 0; i < this.knots.length; i++) {
            this.knots[i].drawCurveSegments();
        }
    }
}