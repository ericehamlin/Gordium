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

            /** default config -- can't use Object.assign for some reason */
            this.config = {
                'color': config.color ? config.color : Gordium.randomColor(),
                'stroke-width': config['stroke-width'] ? config['stroke-width'] : 10
            };

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

        convertStrokesToShapes() {
            return;
            var width = 20;
            function oneForNaN(val) {
                return isNaN(val) ? 0 : val;
            }

            function addPoints(x1,y1, x2,y2, anchorX, anchorY, outsidePoints, insidePoints) {
                var perpendicular = getPerpendicular(x1,y1, x2,y2);
                var xDiffOut = width * oneForNaN(Math.cos(perpendicular));
                var yDiffOut = width * oneForNaN(Math.sin(perpendicular));
                var xDiffIn = -width * oneForNaN(Math.cos(perpendicular));
                var yDiffIn = -width * oneForNaN(Math.sin(perpendicular));

                var angleBetween = Gordium.getAngleBetweenVectors(anchorX-x1, anchorY-y1, xDiffOut, yDiffOut);
                if (angleBetween > Math.PI) {
                    xDiffOut = -xDiffOut;
                    yDiffOut = -yDiffOut;
                    xDiffIn = -xDiffIn;
                    yDiffIn = -yDiffIn;
                }



                outsidePoints.push(xDiffOut + anchorX);
                outsidePoints.push(yDiffOut + anchorY);
                insidePoints.unshift(yDiffIn + anchorY);
                insidePoints.unshift(xDiffIn + anchorX);
            }

            function getPerpendicular(x1,y1, x2,y2) {
                var x3 = x2 - x1,
                    y3 = y2 - y1;
                var perpendicular = Math.atan(y3/x3) + (Math.PI/2);
                return perpendicular;
            }

            var strokeColor =  Gordium.randomColor();
            var fillColor = Gordium.randomColor();

            for (let i = 0; i < this.pathSegments.length; i++) {
                let points = this.pathSegments[i].points;
                let polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                let insidePoints = [],
                    outsidePoints = [];


                if (i>0) {
                    var lastSegmentPoints = this.pathSegments[i-1].points;
                    var secondToLastY = lastSegmentPoints[lastSegmentPoints.length - 3];
                    var secondToLastX = lastSegmentPoints[lastSegmentPoints.length - 4];

                    addPoints(secondToLastX, secondToLastY, points[2], points[3], points[0], points[1], outsidePoints, insidePoints);
                }

                for(let j=0; j < points.length-2; j+=2) {
                    if (j>2) {
                        addPoints(points[j-2], points[j-1], points[j+2], points[j+3], points[j], points[j+1], outsidePoints, insidePoints);
                    }
                }
                if (i < this.pathSegments.length-1) {
                    var nextSegmentPoints = this.pathSegments[this.pathSegments.length-1].points;
                    var secondToNextY = nextSegmentPoints[3];
                    var secondToNextX = nextSegmentPoints[2];
                    addPoints(points[points.length-4],points[points.length-3], secondToNextX, secondToNextY, points[points.length-2], points[points.length-3], outsidePoints, insidePoints);

                }
                var polyPoints = outsidePoints.concat(insidePoints);
                polyLine.setAttribute("points", polyPoints);
                polyLine.setAttribute("fill", fillColor);
                polyLine.setAttribute("stroke-width", "1");
                polyLine.setAttribute("stroke", strokeColor);
                this.destSvg.appendChild(polyLine);
            }
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

            let defs = document.createElementNS(Gordium.svgNS, "g");
            this.destSvg.appendChild(defs);

            for (let i = 0; i < this.pathSegments.length; i++) {
                let points = this.pathSegments[i].points;

                let clipPath = document.createElementNS(Gordium.svgNS, "g");
                clipPath.setAttribute("id", this.id + "-path-segment-" + i + "-clip-path");
                for(let j=0; j< this.pathSegments[i].points.length/2; j++) {
                    let rect = Gordium.createSvgElement("rect", {
                        "id"     : this.id + "-path-segment-" + i + "-clip-path-rect-" + j,
                        "width"  : this.sampleInterval,
                        "height" : this.config["stroke-width"] + 10
                    });
                    clipPath.appendChild(rect);
                }
                defs.appendChild(clipPath);

                let polyLine = Gordium.createSvgElement("polyline", {
                    "id": this.id + "-path-segment-" + i,
                    "points": points,
                    "fill": "none",
                    "stroke-width": this.config['stroke-width'],
                    "stroke-linejoin": "round",
                    "stroke": this.config.color,
//                    "clip-path": "url(#" + this.id + "-path-segment-" + i + "-clip-path)"
                });

                if (this.pathSegments[i].intersection.over) {
                    console.debug("over");
                    overGroup.appendChild(polyLine);
                }
                else {
                    console.debug("under");
                    underGroup.appendChild(polyLine);
                }

                this.drawnSegments.push(polyLine);
            }
        }

        beginAnimate() {
            for (let i = 0; i < this.pathSegments.length; i++) {
                let points = this.pathSegments[i].points;

                // get angle of first sub-segment
                let angle = Math.atan(Gordium.getSlope({
                        x1: points[0],
                        y1: points[1],
                        x2: points[2],
                        y2: points[3]
                    }));

                for(let j=0; j<this.pathSegments[i].points.length; j++) {
                    let rect = document.getElementById(this.id + "-path-segment-" + i + "-clip-path-rect-" + j);

                    if (!rect) {
                        continue;
                    }
                    this.placeClipPathRectAtBeginningOfSegment(rect, angle, points[0], points[1]);
                }
            }
            this.animate(0, 0);
        }

        placeClipPathRectAtBeginningOfSegment(rect, angle, x, y) {
            // rotate clipping rect
            rect.setAttribute("transform", "rotate(" + Gordium.radToDeg(angle) + "," + x + "," + y + ") translate(-"+ (this.sampleInterval/2)+",-"+((this.config["stroke-width"] + 10)/2)+")");

            // subtract width from initial placement
            rect.setAttribute("x", x /*- (this.sampleInterval * Math.cos(angle + (Math.PI/2)))*/);
            rect.setAttribute("y", y /*- (this.sampleInterval * Math.sin(angle + (Math.PI/2)))*/);
        }

        animate(segmentIndex, subSegmentIndex){
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
                let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("r", 5);
                circle.setAttribute("fill", Gordium.randomColor());
                let point = this.path.getPointAtLength(intersection.distance1);
                circle.setAttribute("cx", point.x);
                circle.setAttribute("cy", point.y);

                // TODO global debug svg
                document.getElementsByTagName("svg")[1].appendChild(circle);

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