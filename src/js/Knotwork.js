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

            this.srcSvg = srcSvg;
            this.knots = [];
            this.sampleInterval = sampleInterval;
            this.config = new Gordium.Config(config);
            console.log(this.config);

            if (filename !== null) {

                Gordium.loadSvg(filename).then(function (svg) {
                    self.srcSvg = svg;
                    self.processKnotwork();
                });
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

            this.createDestSvg();

            this.createDebugSvg();

            this.createKnotsFromSvgPaths();

            this.findIntersections();

            this.drawDebugIntersections(); // debug

            this.divideCurves();

            this.overUnderCurves();

            this.draw();

            this.animate();
        }

        /**
         * todo option to use existing svg
         */
        createDestSvg() {
            this.destSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.destSvg.setAttribute('id', "dest-svg");
            this.destSvg.setAttribute('width', '1500');
            this.destSvg.setAttribute('height', '1500');
            document.body.appendChild(this.destSvg);
        }

        /**
         *
         */
        createKnotsFromSvgPaths() {
            let paths = Gordium.getPathsFromSvg(this.srcSvg);
            for (let i = 0; i < paths.length; i++) {
                this.knots.push(new Gordium.Knot(paths[i], this.sampleInterval, this.config.knots[i] ? this.config.knots[i] : undefined));
            }
        }

        /**
         * @description
         * Find all intersections and associate them with points on curve
         *
         * slope-intercept form
         * y = mx + b
         * m = slope of line
         * b = intercept: point where line crosses y-axis
         * OR
         * point-slope form
         * y = m(x-Px)+Py  (Px and Py are x and y of a point on line)
         *
         */
        findIntersections() {
            let knots = this.knots,
                sampleInterval = this.sampleInterval
            for (let i = 0; i < knots.length; i++) {
                let knot = knots[i],
                    points = knot.points;

                for (let j = 0; j < points.length - 1; j++) {
                    let segment1 = Gordium.defineSegment(points[j], points[j + 1]);

                    Gordium.drawDebugSegment(points[j], points[j + 1]);

                    // see if path intersects itself
                    for (let k = j + 2; k < points.length - 1; k++) {
                        if (j === 0 && k === points.length - 2) {
                            continue;
                        }
                        let segment2 = Gordium.defineSegment(points[k], points[k + 1]);
                        let intersection = Gordium.linesIntersect(segment1, segment2);
                        if (intersection) {
                            let distance1 = (j * sampleInterval) + (intersection.segment1Percent * sampleInterval / 100);
                            let distance2 = (k * sampleInterval) + (intersection.segment2Percent * sampleInterval / 100);

                            let newIntersection = new Gordium.Intersection(knot, distance1, knot, distance2, intersection.x, intersection.y);
                            let newIntersection2 = new Gordium.Intersection(knot, distance2, knot, distance1, intersection.x, intersection.y);

                            knot.intersections.push(newIntersection);
                            knot.intersections.push(newIntersection2);
                        }
                    }

                    for (let x = i + 1; x < knots.length; x++) {
                        let knot2 = knots[x],
                            points2 = knot2.points;

                        for (let y = 0; y < points2.length - 1; y++) {
                            let segment2 = Gordium.defineSegment(points2[y], points2[y + 1]);
                            let intersection = Gordium.linesIntersect(segment1, segment2);
                            if (intersection) {
                                let distance1 = (j * sampleInterval) + (intersection.segment1Percent * sampleInterval / 100);
                                let distance2 = (y * sampleInterval) + (intersection.segment2Percent * sampleInterval / 100);
                                let newIntersection = new Gordium.Intersection(knot, distance1, knot2, distance2, intersection.x, intersection.y);
                                let newIntersection2 = new Gordium.Intersection(knot2, distance2, knot, distance1, intersection.x, intersection.y);
                                knot.intersections.push(newIntersection);
                                knot2.intersections.push(newIntersection2)
                            }
                        }
                    }
                }

                knot.intersections.sort(function (a, b) {
                    return a.distance1 > b.distance1 ? 1 : -1;
                });
            }
        }

        /**
         * @description
         * Break paths into dividedCurves (polylines) on either side of intersections
         */
        divideCurves() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].divideCurves();
            }
        }

        /**
         * @description
         * find Over/Under for path segments
         */
        overUnderCurves() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].overUnderCurves();
            }
        }

        /**
         * @description
         * draw each knot, hidden, in preparation for animation
         */
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

        /**
         * @description
         * animate each knot
         */
        animate() {
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].beginAnimate();
            }
        }

        /**
         *
         */
        createDebugSvg() {
            if (!this.config.debug) {
                return;
            }
            this.debugSvgContainer = document.createElementNS("http://www.w3.org/2000/svg", "div");
            this.debugSvgContainer.setAttribute('id', "debug-svg-container");

            this.debugSvgContainer.insertAdjacentHTML("beforeend", this.srcSvg.innerHTML);
            document.body.appendChild(this.debugSvgContainer);

        }

        /**
         */
        drawDebugIntersections() {
            if (!this.config.debug) {
                return;
            }
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].drawDebugIntersections();
            }
        }

        /**
         */
        drawDebugCurveSegments() {
            if (!this.config.debug) {
                return;
            }
            for (let i = 0; i < this.knots.length; i++) {
                this.knots[i].drawDebugCurveSegments();
            }
        }
    }

    Gordium.Knotwork = Knotwork;

})(Gordium);