(function(Gordium) {

    class Knotwork {

        /**
         *
         * @param filename
         * @param srcSvg
         * @param sampleInterval
         * @param config
         */
        constructor(filename = null, srcSvg = null, sampleInterval = 10, config = {}) {
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

                Gordium.loadSvg(filename).then(function (svg) {
                    self.srcSvg = svg;
                    self.showSvg.insertAdjacentHTML("afterbegin", svg.innerHTML);
                    self.processKnotwork();
                })
                /*.catch(function(error) {
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

            this.convertStrokesToShapes();

            this.draw(); // animate each curve

            this.animate();
            //this.drawDebugCurveSegments();
        }

        /**
         *
         */
        getPathsFromSvg() {
            let paths = Gordium.getPathsFromSvg(this.srcSvg);
            for (let i = 0; i < paths.length; i++) {
                this.knots.push(new Gordium.Knot(paths[i], this.sampleInterval, this.config.knots[i] ? this.config.knots[i] : undefined));
            }
        }

        /**
         * Break curves into curve segments on either side of intersections
         */
        segmentCurves() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].segmentCurves();
            }
        }

        overUnderCurves() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].overUnderCurves();
            }
        }

        convertStrokesToShapes() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].convertStrokesToShapes();
            }
        }

        draw() {
            let overGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            overGroup.setAttribute("id", "over");
            let underGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            underGroup.setAttribute("id", "under");

            this.destSvg.appendChild(underGroup);
            this.destSvg.appendChild(overGroup);

            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].draw();
            }
        }

        animate() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].beginAnimate();
            }
        }

        /**
         * TODO debug only
         */
        drawDebugIntersections() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].drawDebugIntersections();
            }
        }

        /**
         * TODO debug only
         */
        drawDebugCurveSegments() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].drawDebugCurveSegments();
            }
        }
    }

    Gordium.Knotwork = Knotwork;

})(Gordium);