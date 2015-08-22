class Knot {

    constructor(path, sampleInterval=40) {

        this.sampleInterval = sampleInterval;
        this.path = path;
        this.pathSegments = [];
        this.points = [];
        this.intersections = [];

        this.destSvg = document.getElementById("dest-svg");

        this.points = Gordium.getPointsFromPath(this.path, 0, this.path.getTotalLength(), this.sampleInterval);
    }

    /**
     * Break curve into curve segments on either side of intersections
     */
    segmentCurves() {
        var newPaths = [];
        var pathIndex = 0;
        var fromLength = 0;
        var toLength = this.intersections[0].distance1/2;

        console.log(this.path.pathSegList);

        for (var j=0; j<this.intersections.length; j++) {
            if (newPaths[pathIndex] == undefined) {
                newPaths[pathIndex] = {
                    intersection: this.intersections[j],
                    points: []
                };
            }

            var points = newPaths[pathIndex].points;
            for (var i = fromLength; i < toLength; i += this.sampleInterval) {

                var currentSegmentIndex = this.path.getPathSegAtLength(i),
                    nextSegmentIndex = i + this.sampleInterval > toLength ?
                            this.path.getPathSegAtLength(toLength) :
                            this.path.getPathSegAtLength(i+this.sampleInterval);

                // if we're crossing to the next segment
                if (currentSegmentIndex !== nextSegmentIndex) {

                    var previousSegmentIndex = currentSegmentIndex-1,
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
                            var coords = Gordium.calculateAbsoluteValueOfSegmentEnd(this.path, currentSegmentIndex);
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
            toLength = j===this.intersections.length-1 ? this.path.getTotalLength() : (this.intersections[j].distance1 + this.intersections[j+1].distance1)/2;
        }

        pathIndex = 0;
        var points = newPaths[pathIndex].points;
        for (var i = toLength; i > fromLength; i -= this.sampleInterval) {
            points.unshift(this.path.getPointAtLength(i).y);
            points.unshift(this.path.getPointAtLength(i).x);

        }
        points.unshift(this.path.getPointAtLength(fromLength).y);
        points.unshift(this.path.getPointAtLength(fromLength).x);

        this.pathSegments = newPaths;


        /*
         paths[paths.length] = newPath;
         path.setAttribute("stroke-dasharray", length+","+length);

         knot.intersections.sort(function(a,b){return a-b});
         var dashArray = [];
         if (i%2!=0) {
         dashArray.push(1);
         }
         dashArray.push(knot.intersections[0]/2);
         for (var j=1; j<knot.intersections.length; j++) {
         dashArray.push(knot.intersections[j]-knot.intersections[j-1]);
         }
         if (i%2==0) {
         dashArray.push(1);
         }
         dashArray.push(length);
         newPath.setAttribute("stroke-dasharray", dashArray.join(","));
         newPath.setAttribute("stroke-dashoffset", 0);
         */

    }

    overUnderCurves() {
        var self = this;
        function indexOfIntersectionOnOtherKnot(knot, x, y) {
            for (var i=0; i<knot.intersections.length; i++) {
                var intersection = knot.intersections[i];
                if (intersection.x == x && intersection.y == y /*&& intersection.knot1 == self*/) {
                    return i;
                }
            }
        }

        var intersectionIndex = -1,
            startIntersectionIndex,
            over,
            startOver;
        for (var i=0; i<this.intersections.length; i++) {
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
            var intersection = this.intersections[0]
            intersection.over = over;
            if (intersection.knot1 !== intersection.knot2) {
                var idx = indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y);
                if (intersection.knot2.intersections[idx].over === undefined) {
                    intersection.knot2.intersections[idx].over = -over;
                }
            }
        }

        while(intersectionIndex > 0) {
            over = !over;
            var intersection = this.intersections[--intersectionIndex];
            if (intersection.over !== undefined) {
                continue;
            }
            intersection.over = over;


            if (intersection.knot1 !== intersection.knot2) {
                var idx = indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y);
                if (intersection.knot2.intersections[idx].over === undefined) {
                    intersection.knot2.intersections[idx].over = !over;
                }
            }
        }
        over = startOver;
        intersectionIndex = startIntersectionIndex;

        while(intersectionIndex < this.intersections.length-1) {
            over = !over;
            var intersection = this.intersections[++intersectionIndex];
            if (intersection.over !== undefined) {
                continue;
            }
            intersection.over = over;


            if (intersection.knot1 !== intersection.knot2) {
                var idx = indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y);
                if (intersection.knot2.intersections[idx].over === undefined) {
                    intersection.knot2.intersections[idx].over = !over;
                }

            }
        }
    }

//    xoverUnderCurves(intersectionIndex, over=true) {
//        var startIntersectionIndex = intersectionIndex;
//        var startOver = over;
//
//        function indexOfIntersectionOnOtherKnot(knot, x, y) {
//            for (var i=0; i<knot.intersections.length; i++) {
//                var intersection = knot.intersections[i];
//                if (intersection.x == x && intersection.y == y) {
//                    return i;
//                }
//            }
//        }
//
//        var intersection = this.intersections[intersectionIndex];
//        if (intersection.over !== undefined) {
//            return;
//        }
//        intersection.over = over;
//        over = !over;
//
//        while(intersectionIndex > 0) {
//            var intersection = this.intersections[--intersectionIndex];
//            if (intersection.over !== undefined) {
//                break;
//            }
//            intersection.over = over;
//            over = !over;
//
//            /*if (intersection.knot1 !== intersection.knot2) {
//                intersection.knot2.overUnderCurves(indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y), over);
//            }*/
//        }
//        over = !startOver;
//        intersectionIndex = startIntersectionIndex;
//
//        while(intersectionIndex < this.intersections.length-1) {
//            var intersection = this.intersections[++intersectionIndex];
//            if (intersection.over !== undefined) {
//                break;
//            }
//            intersection.over = over;
//            over = !over;
//
//            /*if (intersection.knot1 !== intersection.knot2) {
//                intersection.knot2.overUnderCurves(indexOfIntersectionOnOtherKnot(intersection.knot2, intersection.x, intersection.y), over);
//            }*/
//        }
//
//    }

    draw() {
        var overGroup = document.getElementById("over");
        var underGroup = document.getElementById("under");
        var color = Gordium.randomColor();
        for(var x=0; x<this.pathSegments.length; x++) {
            var polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyLine.setAttribute("id", "path-segment-"+x);
            polyLine.setAttribute("points", this.pathSegments[x].points);
            polyLine.setAttribute("fill", "none");
            polyLine.setAttribute("stroke-width", "5");
            polyLine.setAttribute("stroke-linejoin", "round");

            //color = Gordium.randomColor();
            polyLine.setAttribute("stroke", color);
            if (this.pathSegments[x].intersection.over) {
                console.debug("over");
                overGroup.appendChild(polyLine);
            }
            else {
                console.debug("under");
                underGroup.appendChild(polyLine);
            }
        }
    }

    /**
     * TODO debug only
     */
    drawIntersections() {
        for (var j = 0; j < this.intersections.length; j++) {
            var intersection = this.intersections[j];
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", 5);
            circle.setAttribute("fill", Gordium.randomColor());
            var point = this.path.getPointAtLength(intersection.distance1);
            circle.setAttribute("cx", point.x);
            circle.setAttribute("cy", point.y);
//            circle.setAttribute("cx", intersection.x);
//            circle.setAttribute("cy", intersection.y);

            // TODO global debug svg
            document.getElementsByTagName("svg")[1].appendChild(circle);

        }
    }

    drawCurveSegments() {
        for(var x=0; x<this.pathSegments.length; x++) {
            var polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyLine.setAttribute("points", this.pathSegments[x].points);
            polyLine.setAttribute("fill", "none");
            polyLine.setAttribute("stroke-width", "3");
            polyLine.setAttribute("stroke", Gordium.randomColor());
            this.destSvg.appendChild(polyLine);

        }
    }
}