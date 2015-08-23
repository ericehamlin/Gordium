class Knotwork {

    /**
     *
     * @param filename
     * @param srcSvg
     * @param sampleInterval
     * @param config
     */
    constructor(filename=null, srcSvg=null, sampleInterval=10, config={}) {
        let self = this;

        this.filename = filename;
        this.srcSvg = srcSvg;
        this.knots = [];
        this.sampleInterval = sampleInterval;
        this.config = new Gordium.Config(config);

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

    /**
     *
     */
    processKnotwork() {
        this.getPathsFromSvg();
        Gordium.findIntersectionsForKnots(this.knots, this.sampleInterval);

        this.drawDebugIntersections(); // debug

        this.segmentCurves();

        // find curves from path segments

        this.overUnderCurves(); // find Over/Under for path segments

        this.draw(); // animate each curve

        //this.drawDebugCurveSegments();
    }

    /**
     *
     */
    getPathsFromSvg() {
        var paths = Gordium.getPathsFromSvg(this.srcSvg);
        for (var i = 0; i < paths.length; i++) {
            this.knots.push(new Gordium.Knot(paths[i], this.sampleInterval, this.config.knots[i] ? this.config.knots[i] : undefined));
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

    overUnderCurves() {
        for (var i=0; i<this.knots.length; i++) {
            this.knots[i].overUnderCurves();
        }
    }

    draw() {
        var overGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        overGroup.setAttribute("id", "over");
        var underGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        underGroup.setAttribute("id", "under");

        this.destSvg.appendChild(underGroup);
        this.destSvg.appendChild(overGroup);

        for (var i=0; i<this.knots.length; i++) {
            this.knots[i].draw();
        }
    }

    /**
     * TODO debug only
     */
    drawDebugIntersections() {
        for (var i = 0; i < this.knots.length; i++) {
            this.knots[i].drawDebugIntersections();
        }
    }

    /**
     * TODO debug only
     */
    drawDebugCurveSegments() {
        for (var i = 0; i < this.knots.length; i++) {
            this.knots[i].drawDebugCurveSegments();
        }
    }
}

Gordium.Knotwork = Knotwork;