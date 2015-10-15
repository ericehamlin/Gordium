(function(Gordium) {

    class Knot {

        constructor(path, sampleInterval = 40, config = {}) {

            this.sampleInterval = sampleInterval;

            /**
             * @description
             * the original path as it appears in the source file
             */
            this.path = path;

            /**
             * @description
             * path broken into polylines on either side of intersections -- result of divideCurves()
             */
            this.dividedCurves = [];

            this.points = [];
            this.intersections = [];

            this.id = "knot-" + Gordium.randomInteger(1000);

            let defaultConfig = {
                'color': Gordium.randomColor(),
                'width': 10,
                'stroke': Gordium.randomColor(),
                'stroke-width': 10,
                'animateTimeout': 20
            };
            this.config = Gordium.assign(defaultConfig, config);

            this.destSvg = document.getElementById("dest-svg");

            this.points = Gordium.getPointsFromPath(this.path, 0, this.path.getTotalLength(), this.sampleInterval);
        }

        /**
         * @description
         * Break path into dividedCurves on either side of intersections
         */
        divideCurves() {
            let newPaths = [];
            let pathIndex = 0;
            let fromLength = 0;
            let toLength = this.intersections[0].distance1 / 2;

            for (let j = 0; j < this.intersections.length; j++) {
                if (newPaths[pathIndex] == undefined) {
                    newPaths[pathIndex] = {
                        intersection: this.intersections[j],
                        points: []
                    };
                }

                let points = newPaths[pathIndex].points;
                for (let i = fromLength; i < toLength; i += this.sampleInterval) {

                    let currentSegmentIndex = this.path.getPathSegAtLength(i),
                            nextSegmentIndex = i + this.sampleInterval > toLength ?
                                    this.path.getPathSegAtLength(toLength) :
                                    this.path.getPathSegAtLength(i + this.sampleInterval);

                    // if we're crossing to the next segment
                    if (currentSegmentIndex !== nextSegmentIndex) {

                        let previousSegmentIndex = currentSegmentIndex - 1,
                                previousSegment = this.path.pathSegList[previousSegmentIndex],
                                currentSegment = this.path.pathSegList[currentSegmentIndex],
                                nextSegment = this.path.pathSegList[nextSegmentIndex];

                        // check for corner.
                        // todo -- i don't think this is working as expected
                        if (previousSegment) { // if this is not the first segment
                            let angle = Gordium.getAngleBetweenSegments(previousSegment, currentSegment, nextSegment);
                            if (Gordium.isAcuteAngle(angle)) {
                                let coords = Gordium.calculateAbsoluteValueOfSegmentEnd(this.path, currentSegmentIndex);
                                points.push(coords.x);
                                points.push(coords.y);
                            }

                        }
                    }
                    points.push(this.path.getPointAtLength(i).x);
                    points.push(this.path.getPointAtLength(i).y);
                }

                points.push(this.path.getPointAtLength(toLength).x);
                points.push(this.path.getPointAtLength(toLength).y);

                // overlap the next segment slightly so as to avoid gaps
                if (j !== this.intersections.length - 1) {
                    points.push(this.path.getPointAtLength(toLength + this.sampleInterval/2).x);
                    points.push(this.path.getPointAtLength(toLength + this.sampleInterval/2).y);
                }

                pathIndex++;
                fromLength = toLength;
                toLength = j === this.intersections.length - 1 ? this.path.getTotalLength() : (this.intersections[j].distance1 + this.intersections[j + 1].distance1) / 2;
            }

            pathIndex = 0;
            let points = newPaths[pathIndex].points;
            for (let i = toLength; i > fromLength; i -= this.sampleInterval) {
                points.unshift(this.path.getPointAtLength(i).y);
                points.unshift(this.path.getPointAtLength(i).x);

            }
            points.unshift(this.path.getPointAtLength(fromLength).y);
            points.unshift(this.path.getPointAtLength(fromLength).x);

            this.dividedCurves = newPaths;
        }


        /**
         * @description
         * calculates which dividedCurves should be on top and which should be on the bottom
         */
        overUnderCurves() {
            let self = this;

            function indexOfIntersectionOnOtherKnot(knot, x, y) {
                for (let i = 0; i < knot.intersections.length; i++) {
                    let intersection = knot.intersections[i];
                    if (intersection.x == x && intersection.y == y /*&& intersection.knot1 == self*/) {
                        return i;
                    }
                }
            }

            let intersectionIndex = -1,
                    startIntersectionIndex,
                    over,
                    startOver;
            for (let i = 0; i < this.intersections.length; i++) {
                if (this.intersections[i].over !== undefined) {
                    intersectionIndex = i;
                }
            }

            if (intersectionIndex > -1) {
                startIntersectionIndex = intersectionIndex;
                startOver = over = this.intersections[intersectionIndex].over;
            }
            else {
                startIntersectionIndex = intersectionIndex = 0;
                startOver = over = true;
                let intersection = this.intersections[0];
                intersection.over = over;
                if (intersection.knot1 !== intersection.knot2) {
                    let idx = indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y);
                    if (intersection.knot2.intersections[idx].over === undefined) {
                        intersection.knot2.intersections[idx].over = -over;
                    }
                }
            }

            while (intersectionIndex > 0) {
                over = !over;
                let intersection = this.intersections[--intersectionIndex];
                if (intersection.over !== undefined) {
                    continue;
                }
                intersection.over = over;

                if (intersection.knot1 !== intersection.knot2) {
                    let idx = indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y);
                    if (intersection.knot2.intersections[idx].over === undefined) {
                        intersection.knot2.intersections[idx].over = !over;
                    }
                }
            }
            over = startOver;
            intersectionIndex = startIntersectionIndex;

            while (intersectionIndex < this.intersections.length - 1) {
                over = !over;
                let intersection = this.intersections[++intersectionIndex];
                if (intersection.over !== undefined) {
                    continue;
                }
                intersection.over = over;

                if (intersection.knot1 !== intersection.knot2) {
                    let idx = indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y);
                    if (intersection.knot2.intersections[idx].over === undefined) {
                        intersection.knot2.intersections[idx].over = !over;
                    }
                }
            }
        }

        /**
         *
         */
        draw() {
            let overGroup = document.getElementById("over");
            let underGroup = document.getElementById("under");

            let defs = document.createElementNS(Gordium.svgNS, "defs");
            this.destSvg.appendChild(defs);

            for (let i = 0; i < this.dividedCurves.length; i++) {
                let points = this.dividedCurves[i].points;

                let clipPath = document.createElementNS(Gordium.svgNS, "clipPath");
                clipPath.setAttribute("id", this.id + "-path-segment-" + i + "-clip-path");
                for(let j=0; j< this.dividedCurves[i].points.length/2; j++) {
                    let rect = Gordium.createSvgElement("rect", {
                        "id"     : this.id + "-path-segment-" + i + "-clip-path-rect-" + j,
                        "width"  : this.sampleInterval * 3,
                        "height" : this.config["width"] + 10
                    });
                    clipPath.appendChild(rect);
                }
                defs.appendChild(clipPath);

                let group = Gordium.createSvgElement("g", {
                    "id": this.id + "-path-segment-" + i,
                    "clip-path": "url(#" + this.id + "-path-segment-" + i + "-clip-path)"
                });

                let outline = Gordium.createSvgElement("polyline", {
                    "points": points,
                    "fill": "none",
                    "stroke-width": this.config['width'] + 4, //this.config['stroke-width']*2,
                    "stroke": this.config.stroke
                });

                let polyline = Gordium.createSvgElement("polyline", {
                    "points": points,
                    "fill": "none",
                    "stroke-width": this.config['width'],
                    "stroke-linejoin": "round",
                    "stroke": this.config.color
                });

                group.appendChild(outline);
                group.appendChild(polyline);
                if (this.dividedCurves[i].intersection.over) {
                    overGroup.appendChild(group);
                }
                else {
                    underGroup.appendChild(group);
                }
            }
        }

        /**
         *
         */
        beginAnimate() {
            let points = this.dividedCurves[0].points;

            // get angle of first sub-segment
            let angle = Math.atan(Gordium.getSlope({
                x1: points[0],
                y1: points[1],
                x2: points[2],
                y2: points[3]
            }));

            // get the first clipping path
            let clipPathRect = document.getElementById(this.id + "-path-segment-" + 0 + "-clip-path-rect-" + 0);

            this.placeClipPathRectBehindPoint(clipPathRect, angle, points[0], points[1]);
            this.animate(0, 0);
        }

        /**
         *
         * @param {HTMLElement} clipPathRect
         * @param {number} angle
         * @param {number} x
         * @param {number} y
         */
        placeClipPathRect(clipPathRect, angle, x, y) {

            // rotate clipPathRect
            clipPathRect.setAttribute("transform", "rotate(" + Gordium.radToDeg(angle) + "," + x + "," + y + ") translate(0, -"+((this.config["width"] + 10)/2)+")");

            clipPathRect.setAttribute("x", x);
            clipPathRect.setAttribute("y", y);
        }

        /**
         * todo "behind" is misleading
         *
         * @param {HTMLElement} clipPathRect
         * @param {number} angle
         * @param {number} x
         * @param {number} y
         */
        placeClipPathRectBehindPoint(clipPathRect, angle, x, y) {

            // subtract width from initial placement
            let cosine = isNaN(angle) ? 0 : Math.cos(angle);
            let sine = isNaN(angle) ? 1 : Math.sin(angle);
            let transX = x - (this.sampleInterval * cosine);
            let transY = y - (this.sampleInterval * sine);

            this.placeClipPathRect(clipPathRect, angle, transX, transY);
        }

        /**
         * @description
         * moves one clipping rectangle to the leading edge of the animated polyline
         * exposing a little bit of the line and making it look as though it's growing
         *
         * @param {int} segmentIndex
         * @param {int} subSegmentIndex
         */
        animate(segmentIndex, subSegmentIndex){
            let self = this;
            let rect = document.getElementById(this.id + "-path-segment-" + segmentIndex + "-clip-path-rect-" + subSegmentIndex);
            let points = this.dividedCurves[segmentIndex].points;
            let m = Gordium.getSlope({
                x1: points[subSegmentIndex*2],
                y1: points[(subSegmentIndex*2) + 1],
                x2: points[(subSegmentIndex*2) + 2],
                y2: points[(subSegmentIndex*2) + 3]
            });

            let angle = Math.atan(isNaN(m) ? 0 : m);

            this.placeClipPathRectBehindPoint(rect, angle, points[(subSegmentIndex*2)], points[(subSegmentIndex*2) + 1]);


            if ((subSegmentIndex*2) < points.length - 4) { // if there are more points in this segment
                // increase current sub-segment-index
                // call animate again after time interval
                setTimeout(function() {self.animate(segmentIndex, subSegmentIndex+1);}, this.config.animateTimeout);
            }
            else if (segmentIndex < this.dividedCurves.length-1) { // if there are more segments
                let id = this.id + "-path-segment-" + segmentIndex + "-clip-path-rect-" + (subSegmentIndex+1);
                rect = document.getElementById(id);
                m = Gordium.getSlope({
                    x1: points[(subSegmentIndex*2) + 2],
                    y1: points[(subSegmentIndex*2) + 3],
                    x2: this.dividedCurves[segmentIndex+1].points[0],
                    y2: this.dividedCurves[segmentIndex+1].points[1]
                });
                angle = Math.atan(isNaN(m) ? 0 : m);
                this.placeClipPathRectBehindPoint(rect, angle, points[(subSegmentIndex*2) + 2], points[(subSegmentIndex*2) + 3]);

                // increase segment index
                // set sub-segment index to 0
                // call animate again after time interval
                setTimeout(function() { self.animate(segmentIndex+1, 0); }, this.config.animateTimeout);
            }
            else { // else end animate loop -- everything is in place
                let id = this.id + "-path-segment-" + segmentIndex + "-clip-path-rect-" + (subSegmentIndex+1);
                rect = document.getElementById(id);
                m = Gordium.getSlope({
                    x1: points[(subSegmentIndex*2) + 2],
                    y1: points[(subSegmentIndex*2) + 3],
                    x2: this.dividedCurves[0].points[0],
                    y2: this.dividedCurves[0].points[1]
                });
                angle = Math.atan(isNaN(m) ? 0 : m);

                // move final clipping path to the end of the curve, revealing the last bit
                this.placeClipPathRectBehindPoint(rect, angle, points[(subSegmentIndex*2) + 2], points[(subSegmentIndex*2) + 3]);
            }
        }

        /**
         * TODO debug only
         */
        drawDebugIntersections() {
            for (let j = 0; j < this.intersections.length; j++) {
                let intersection = this.intersections[j];
                let point = this.path.getPointAtLength(intersection.distance1);
                Gordium.drawDebugPoint(point.x, point.y, 5);

            }
        }

        /**
         * TODO debug only
         */
        drawDebugCurveSegments() {
            for (let x = 0; x < this.dividedCurves.length; x++) {
                Gordium.drawDebugPolyline(this.dividedCurves[x].points);
            }
        }
    }

    Gordium.Knot = Knot;

})(Gordium);