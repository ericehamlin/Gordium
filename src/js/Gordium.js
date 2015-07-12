class Gordium {

    /**
     *
     * @param filename
     */
    static loadSvg(filename) {

        var request = new XMLHttpRequest();
        var promise = new Promise(function (resolve, reject) {
            request.open('GET', filename, true);
            request.onreadystatechange = onResponse;
            request.send(null);

            function onResponse(event) {
                if (request.readyState === 4) { // request finished and response is ready
                    if (request.status !== 200) {
                        reject("couldn't load file")
                    }
                    var element = document.createElement("div");
                    var svgXml = request.responseText.replace(/^(.|\n|\r)*?(<svg)/im, "$2");
                    element.insertAdjacentHTML("afterbegin", svgXml);
                    resolve(element);
                }
            }
        });
        return promise;
    }

    /**
     *
     * @param svg
     * @returns {NodeList}
     */
    static getPathsFromSvg(svg) {
        let paths = svg.getElementsByTagName("path");
        return paths;
    }

    /**
     * Approximate curves with Polylines
     * TODO: If straight lines, don't approximate. Use lines
     * TODO: If there are corners, keep them
     *
     * @param path
     * @param fromLength
     * @param toLength
     * @param sampleInterval
     * @returns {Array}
     */
    static getPointsFromPath(path, fromLength, toLength, sampleInterval) {
        let points = [];
        for (var i=fromLength ; i<toLength ; i+=sampleInterval) {
            points.push({
                x: path.getPointAtLength(i).x,
                y: path.getPointAtLength(i).y,
                pathLength: i
            });
        }
        points.push({
            x: path.getPointAtLength(toLength).x,
            y: path.getPointAtLength(toLength).y,
            pathLength: i
        });

        return points;
    }

    /**
     * Find all intersections and associate them with points on curve
     *
     * slope-intercept form
     * y = mx + b
     * m = slope of line
     * b = intercept: point where line crosses y-axis
     * OR
     * point-slope form
     * y = m(x-Px)+Py  (Px and Py are x and y of a point on line)
     */
    static findIntersectionsForKnots(knots, sampleInterval=10) {
        for (var i = 0; i < knots.length; i++) {
            let knot = knots[i],
                points = knot.points;

            for (var j = 0; j < points.length - 1; j++) {
                var segment1 = Gordium.defineSegment(points[j], points[j+1]);

                Gordium.drawSegment(points[j], points[j+1]);


                // see if path intersects itself
                for (var k = j + 1; k < points.length - 1; k++) {
                    var segment2 = Gordium.defineSegment(points[k], points[k+1]);
                    var intersection = Gordium.linesIntersect(segment1, segment2);
                    if (intersection) {
                        var distance1 = (j * sampleInterval)  + (intersection.segment1Percent * sampleInterval / 100);
                        var distance2 = (k * sampleInterval) + (intersection.segment2Percent * sampleInterval / 100);

                        let newIntersection = new Intersection(knot, distance1, knot, distance2, intersection.x, intersection.y);
                        let newIntersection2 = new Intersection(knot, distance2, knot, distance1,  intersection.x, intersection.y);

                        knot.intersections.push(newIntersection);
                        knot.intersections.push(newIntersection2);
                    }
                }


                for (var x = i + 1; x < knots.length; x++) {
                    let knot2 = knots[x],
                        points2 = knot2.points;

                    for (var y = 0; y < points2.length - 1; y++) {
                        var segment2 = Gordium.defineSegment(points2[y], points2[y+1]);
                        var intersection = Gordium.linesIntersect(segment1, segment2);
                        if (intersection) {
                            var distance1 = (j * sampleInterval)  + (intersection.segment1Percent * sampleInterval / 100);
                            var distance2 = (x * sampleInterval) + (intersection.segment2Percent * sampleInterval / 100);
                            let newIntersection = new Intersection(knot, distance1, knot2, distance2, intersection.x, intersection.y);
                            let newIntersection2 = new Intersection(knot2, distance2, knot, distance1, intersection.x, intersection.y);
                            knot.intersections.push(newIntersection);
                            knot2.intersections.push(newIntersection2)
                        }
                    }
                }
            }

            knot.intersections.sort(function(a, b) {
                    return a.distance1 > b.distance1;
                });
        }
    }

    static drawSegment(point1, point2) {
        var colors = [
            "#cc0000",
            "#00cc00",
            "#0000cc",
            "#990066"
        ];
        var currentColor = Math.round(Math.random() * 3);
        var showSvg = document.getElementById("show-svg");
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", point1.x);
        line.setAttribute("x2", point2.x);
        line.setAttribute("y1", point1.y);
        line.setAttribute("y2", point2.y);
        line.setAttribute("stroke", colors[currentColor]);
        document.getElementsByTagName("svg")[1].appendChild(line);

    }

    static defineSegment(point1, point2) {
        return {
            x1: point1.x,
            y1: point1.y,
            x2: point2.x,
            y2: point2.y
        };
    }

    static linesIntersect(segment1, segment2) {

        var m1 = Gordium.getSlope(segment1);
        var m2 = Gordium.getSlope(segment2);

        if (m1==m2) return null; // lines are parallel


        var x = (segment2.y1 - segment1.y1 + (m1 * segment1.x1) - (m2 * segment2.x1)) / (m1-m2);
        var y = (m1*(x-segment1.x1))+segment1.y1;


        /*var maxX = Math.min (Math.max(segment1.x1, segment1.x2), Math.max(segment2.x1, segment2.x2))-1;
        var minX = Math.max (Math.min(segment1.x1, segment1.x2), Math.min(segment2.x1, segment2.x2))+1;

        if (x < minX || x > maxX) return null; // intersection is out of the range of the segment
*/

        let maxX1 = Math.max(segment1.x1, segment1.x2),
            minX1 = Math.min(segment1.x1, segment1.x2),
            maxX2 = Math.max(segment2.x1, segment2.x2),
            minX2 = Math.min(segment2.x1, segment2.x2);

        if (x >= maxX1 || x >= maxX2 || x <= minX1 || x <= minX2) return null;
        return {
            x:x,
            y:y,
            segment1Percent:(Math.abs(x-segment1.x1)*100)/Math.abs(segment1.x1-segment1.x2),
            segment2Percent:(Math.abs(x-segment2.x1)*100)/Math.abs(segment2.x1-segment2.x2)
        };
    }

    static getSlope(segment) {
        var slope = (segment.y2 - segment.y1) / (segment.x2 - segment.x1);
        return slope;
    }

    static getSubpath(path, from, to) {
        return Raphael.getSubpath(path, from, to);
    }

    static randomInteger(max) {
        return Math.round(Math.random() * max);
    }

    static randomColor() {
        return "rgb(" + Gordium.randomInteger(256) + "," + Gordium.randomInteger(256) + "," + Gordium.randomInteger(256) + ")";
    }
}