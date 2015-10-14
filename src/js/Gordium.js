/**
 * TODO-xxx:
 * change linear paths to shapes
 * need to figure out some way to distinguish between right and left side
 *
 * TODO-XX
 * Some under/overs are incorrect
 *
 * increase length of paths just slightly so that they overlap
 *
 *
 * get corners at beginning and end of paths
 * default config for individual knots
 * match config to knots
 *
 * unit tests for some things
 *
 * strategy for how to animate
 */

let Gordium = {

    svgNS: "http://www.w3.org/2000/svg",

    /**
     *
     * @param filename
     * @returns {Promise}
     */
    loadSvg: function(filename) {

        let request = new XMLHttpRequest();
        let promise = new Promise(function (resolve, reject) {
            request.open('GET', filename, true);
            request.onreadystatechange = onResponse;
            request.send(null);

            function onResponse(event) {
                if (request.readyState === 4) { // request finished and response is ready
                    if (request.status !== 200) {
                        reject("couldn't load file")
                    }
                    let element = document.createElement("div");
                    let svgXml = request.responseText.replace(/^(.|\n|\r)*?(<svg)/im, "$2");
                    element.insertAdjacentHTML("afterbegin", svgXml);
                    resolve(element);
                }
            }
        });
        return promise;
    },

    createSvgElement(tag, attributes) {
        let element = document.createElementNS(Gordium.svgNS, tag);
        for (let key in attributes) {
            element.setAttribute(key, attributes[key]);
        }
        return element;
    },

    /**
     *
     * @param segment
     * @returns {boolean}
     */
    pathSegmentIsAbsolute: function(segment) {
        let type = segment.pathSegType;
        return     type === Gordium.SegmentTypes.PATHSEG_MOVETO_ABS
                || type === Gordium.SegmentTypes.PATHSEG_LINETO_ABS
                || type === Gordium.SegmentTypes.PATHSEG_CURVETO_CUBIC_ABS
                || type === Gordium.SegmentTypes.PATHSEG_CURVETO_QUADRATIC_ABS
                || type === Gordium.SegmentTypes.PATHSEG_ARC_ABS
                || type === Gordium.SegmentTypes.PATHSEG_LINETO_HORIZONTAL_ABS
                || type === Gordium.SegmentTypes.PATHSEG_LINETO_VERTICAL_ABS
                || type === Gordium.SegmentTypes.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS
                || type === Gordium.SegmentTypes.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS;
    },

    /**
     *
     * @param path
     * @param segmentIndex
     * @returns {{x: number, y: number}}
     */
    calculateAbsoluteValueOfSegmentEnd: function(path, segmentIndex) {
        let coords = {x:0, y:0},
                segments = path.pathSegList;

        for (let i=0; i<segmentIndex+1; i++) {
            if (Gordium.pathSegmentIsAbsolute(segments[i])) {
                coords.x = segments[i].x;
                coords.y = segments[i].y;
            }
            else {
                coords.x += segments[i].x;
                coords.y += segments[i].y;
            }
        }

        return coords
    },

    /**
     * these are svg segments, not gordium segments TODO: distinction
     * TODO don't use full segment length -- get angle close to point
     * @param segment1
     * @param segment2
     * @param segment3
     * @returns {number}
     */
    getAngleBetweenSegments: function(segment1, segment2, segment3){
        let x1 = segment2.x - segment1.x,
            x2 = segment3.x - segment2.x,
            y1 = segment2.y - segment1.y,
            y2 = segment3.y - segment2.y;

        return this.getAngleBetweenVectors(x1,y1, x2,y2)
    },

    dotProduct: function(x1,y1,x2,y2) {
        return x1*x2 + y1*y2;
    },

    /**
     *
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @returns {number}
     */
    getAngleBetweenVectors: function(x1, y1, x2, y2) {
        let cosine = ((x1 * x2) + (y1 * y2))
            /
            (Math.sqrt((x1 * x1) + (y1 * y1)) * Math.sqrt((x2 * x2) + (y2 * y2)));
        let angle = Math.acos(cosine);
//        if (cosine < 0) {
//            angle += Math.PI;
//        }
        return angle;
    },

    /**
     *
     * @param {number} angle (in radians)
     * @returns {boolean}
     */
    isAcuteAngle: function(angle) {
        let maxAngle = Math.PI / 2;
        return Math.abs(angle) < maxAngle;
    },

    /**
     *
     * @param svg
     * @returns {NodeList}
     */
    getPathsFromSvg: function(svg) {
        let paths = svg.getElementsByTagName("path");
        return paths;
    },

    /**
     * Approximate curves with Polylines
     *
     * @param path
     * @param fromLength
     * @param toLength
     * @param sampleInterval
     * @returns {Array}
     */
    getPointsFromPath: function(path, fromLength, toLength, sampleInterval) {
        let points = [];
        for (let i=fromLength ; i<toLength ; i+=sampleInterval) {
            let point = path.getPointAtLength(i);

            points.push({
                x: point.x,
                y: point.y,
                pathLength: i
            });
        }
        points.push({
            x: path.getPointAtLength(toLength).x,
            y: path.getPointAtLength(toLength).y,
            pathLength: toLength
        });
        return points;
    },

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
    findIntersectionsForKnots: function(knots, sampleInterval=10) {
        for (let i = 0; i < knots.length; i++) {
            let knot = knots[i],
                points = knot.points;

            for (let j = 0; j < points.length - 1; j++) {
                let segment1 = Gordium.defineSegment(points[j], points[j+1]);

                Gordium.drawDebugSegment(points[j], points[j+1]);

                // see if path intersects itself
                for (let k = j + 2; k < points.length - 1; k++) {
//                for (let k = j + 1; k < points.length - 1; k++) {
                    if (j===0 && k === points.length - 2) { continue; }
                    let segment2 = Gordium.defineSegment(points[k], points[k+1]);
                    let intersection = Gordium.linesIntersect(segment1, segment2);
                    if (intersection) {
                        let distance1 = (j * sampleInterval)  + (intersection.segment1Percent * sampleInterval / 100);
                        let distance2 = (k * sampleInterval) + (intersection.segment2Percent * sampleInterval / 100);

                        let newIntersection = new Gordium.Intersection(knot, distance1, knot, distance2, intersection.x, intersection.y);
                        let newIntersection2 = new Gordium.Intersection(knot, distance2, knot, distance1,  intersection.x, intersection.y);

                        knot.intersections.push(newIntersection);
                        knot.intersections.push(newIntersection2);
                    }
                }


                for (let x = i + 1; x < knots.length; x++) {
                    let knot2 = knots[x],
                        points2 = knot2.points;

                    for (let y = 0; y < points2.length - 1; y++) {
                        let segment2 = Gordium.defineSegment(points2[y], points2[y+1]);
                        let intersection = Gordium.linesIntersect(segment1, segment2);
                        if (intersection) {
                            let distance1 = (j * sampleInterval)  + (intersection.segment1Percent * sampleInterval / 100);
                            let distance2 = (y * sampleInterval) + (intersection.segment2Percent * sampleInterval / 100);
                            let newIntersection = new Gordium.Intersection(knot, distance1, knot2, distance2, intersection.x, intersection.y);
                            let newIntersection2 = new Gordium.Intersection(knot2, distance2, knot, distance1, intersection.x, intersection.y);
                            knot.intersections.push(newIntersection);
                            knot2.intersections.push(newIntersection2)
                        }
                    }
                }
            }

            knot.intersections.sort(function(a, b) {
                    return a.distance1 > b.distance1 ? 1 : -1;
                });
        }
    },

    /**
     *
     * @param point1
     * @param point2
     * @returns {{x1: *, y1: *, x2: *, y2: *}}
     */
    defineSegment: function(point1, point2) {
        return {
            x1: point1.x,
            y1: point1.y,
            x2: point2.x,
            y2: point2.y
        };
    },

    /**
     *
     * @param segment1
     * @param segment2
     * @returns {*}
     */
    linesIntersect: function(segment1, segment2) {

        let m1 = Gordium.getSlope(segment1);
        let m2 = Gordium.getSlope(segment2);

        if (m1==m2) return null; // lines are parallel

        let x = (segment2.y1 - segment1.y1 + (m1 * segment1.x1) - (m2 * segment2.x1)) / (m1-m2);
        let y = (m1*(x-segment1.x1))+segment1.y1;


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
    },

    /**
     *
     * @param segment
     * @returns {number}
     */
    getSlope: function(segment) {
        let slope = (segment.y2 - segment.y1) / (segment.x2 - segment.x1);
        return slope;
    },

    /**
     *
     * @param {number} rad
     * @returns {number}
     */
    radToDeg: function(rad) {
        return rad * 180 / Math.PI;
    },

    randomInteger: function(max) {
        return Math.round(Math.random() * max);
    },

    randomColor: function() {
        return "rgb(" + Gordium.randomInteger(256) + "," + Gordium.randomInteger(256) + "," + Gordium.randomInteger(256) + ")";
    },

    /**
     * TODO debugOnly
     * @param point1
     * @param point2
     */
    drawDebugSegment: function(point1, point2) {
        let currentColor = Gordium.randomColor();
        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", point1.x);
        line.setAttribute("x2", point2.x);
        line.setAttribute("y1", point1.y);
        line.setAttribute("y2", point2.y);
        line.setAttribute("stroke", currentColor);
        document.getElementsByTagName("svg")[1].appendChild(line);

    },

    drawDebugPoint: function(x, y, r, style={}) {
        let currentColor = Gordium.randomColor();
        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", r);
        circle.setAttribute("fill", currentColor);
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);

        // TODO global debug svg
        document.getElementsByTagName("svg")[1].appendChild(circle);
    }
};