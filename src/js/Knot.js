(function(Gordium) {

    class Knot {

        constructor(path, sampleInterval = 40, config = {}) {

            this.sampleInterval = sampleInterval;
            this.path = path;
            this.pathSegments = [];
            this.drawnSegments = [];
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
         * Break curve into curve segments on either side of intersections
         */
        segmentCurves() {
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
                        // if the next segment is a line
                        // if the segment length ends before the line does
                        // segment to full length
                        // else
                        // entire line and push fromLength to end of line

                        // check for corner.
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

            this.pathSegments = newPaths;
        }


        /**
         *
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
                let intersection = this.intersections[0]
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

            for (let i = 0; i < this.pathSegments.length; i++) {
                let points = this.pathSegments[i].points;

                let clipPath = document.createElementNS(Gordium.svgNS, "clipPath");
                clipPath.setAttribute("id", this.id + "-path-segment-" + i + "-clip-path");
                for(let j=0; j< this.pathSegments[i].points.length/2; j++) {
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
                if (this.pathSegments[i].intersection.over) {
                    overGroup.appendChild(group);
                }
                else {
                    underGroup.appendChild(group);
                }

                this.drawnSegments.push(group);
            }
        }

        beginAnimate() {
//            for (let i = 0; i < this.pathSegments.length; i++) {
                let points = this.pathSegments[0].points;

                // get angle of first sub-segment
                let angle = Math.atan(Gordium.getSlope({
                        x1: points[0],
                        y1: points[1],
                        x2: points[2],
                        y2: points[3]
                    }));

//                for(let j=0; j<this.pathSegments[i].points.length; j++) {
                    let rect = document.getElementById(this.id + "-path-segment-" + 0 + "-clip-path-rect-" + 0);

//                    if (!rect) {
//                        continue;
//                    }
                    this.placeClipPathRectBehindPoint(rect, angle, points[0], points[1]);
//                }
//            }
            this.animate(0, 0);
        }

        placeClipPathRect(rect, angle, x, y) {
            console.log(angle);
            // rotate clipping rect
            rect.setAttribute("transform", "rotate(" + Gordium.radToDeg(angle) + "," + x + "," + y + ") translate(0, -"+((this.config["width"] + 10)/2)+")");

            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
        }

        placeClipPathRectBehindPoint(rect, angle, x, y) {
            // subtract width from initial placement
            let cosine = isNaN(angle) ? 0 : Math.cos(angle);
            let sine = isNaN(angle) ? 1 : Math.sin(angle);
            let transX = x - (this.sampleInterval * cosine);
            let transY = y - (this.sampleInterval * sine);

            this.placeClipPathRect(rect, angle, transX, transY);
        }

        animate(segmentIndex, subSegmentIndex){
            let self = this;
            let rect = document.getElementById(this.id + "-path-segment-" + segmentIndex + "-clip-path-rect-" + subSegmentIndex);
            let points = this.pathSegments[segmentIndex].points;
            let m = Gordium.getSlope({
                x1: points[subSegmentIndex*2],
                y1: points[(subSegmentIndex*2) + 1],
                x2: points[(subSegmentIndex*2) + 2],
                y2: points[(subSegmentIndex*2) + 3]
            });

            let angle = Math.atan(isNaN(m) ? 0 : m);

            this.placeClipPathRectBehindPoint(rect, angle, points[(subSegmentIndex*2)], points[(subSegmentIndex*2) + 1]);
            if ((subSegmentIndex*2) < points.length - 4) {
                setTimeout(function() {self.animate(segmentIndex, subSegmentIndex+1);}, this.config.animateTimeout);
            }
            else if (segmentIndex < this.pathSegments.length-1) {
                let id = this.id + "-path-segment-" + segmentIndex + "-clip-path-rect-" + (subSegmentIndex+1);
                rect = document.getElementById(id);
                m = Gordium.getSlope({
                    x1: points[(subSegmentIndex*2) + 2],
                    y1: points[(subSegmentIndex*2) + 3],
                    x2: this.pathSegments[segmentIndex+1].points[0],
                    y2: this.pathSegments[segmentIndex+1].points[1]
                });
                angle = Math.atan(isNaN(m) ? 0 : m);
                this.placeClipPathRectBehindPoint(rect, angle, points[(subSegmentIndex*2) + 2], points[(subSegmentIndex*2) + 3]);

                setTimeout(function() { self.animate(segmentIndex+1, 0); }, this.config.animateTimeout);
            }
            else {
                let id = this.id + "-path-segment-" + segmentIndex + "-clip-path-rect-" + (subSegmentIndex+1);
                rect = document.getElementById(id);
                m = Gordium.getSlope({
                    x1: points[(subSegmentIndex*2) + 2],
                    y1: points[(subSegmentIndex*2) + 3],
                    x2: this.pathSegments[0].points[0],
                    y2: this.pathSegments[0].points[1]
                });
                angle = Math.atan(isNaN(m) ? 0 : m);
                this.placeClipPathRectBehindPoint(rect, angle, points[(subSegmentIndex*2) + 2], points[(subSegmentIndex*2) + 3]);
            }

            // move clipping rect n units along sub-segment
            // allow for units > sampleInterval
            // so that we can animate through several sub-segments at one time
            // if will pass beyond end of sub-segment
                // move to end of segment
                // if there are more sub-segments in this segment
                    // position next clipping rect on top of previous
                    // move next clipping rect remainder of units
                    // increase current sub-segment-index
                // else
                    // if there are more segments
                        // increase segment index
                        // set sub-segment index to 0
                        // move next clipping rect remainder of units
                    // else end animate loop
            // call animate again after time interval
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
            for (let x = 0; x < this.pathSegments.length; x++) {
                let polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                polyLine.setAttribute("points", this.pathSegments[x].points);
                polyLine.setAttribute("fill", "none");
                polyLine.setAttribute("stroke-width", "3");
                polyLine.setAttribute("stroke", Gordium.randomColor());
                this.destSvg.appendChild(polyLine);

            }
        }
    }

    Gordium.Knot = Knot;

})(Gordium);