/**
 * @description
 * utilities and general functions for Gordium
 *
 * TODO
 * Some under/overs are incorrect
 * turn radius at ends of
 * get corners at beginning and end of paths
 * match config to knots
 * unit tests for some things
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

    /**
     * @description
     * wrapper for Object.assign, because it wasn't working with Babel
     *
     * @param {object} dest
     * @param {object} src
     * @returns {*|void}
     */
    assign: function(dest, src) {
        return Object.assign(dest, src);
    },

    /**
     *
     * @param {string} tag
     * @param {object} attributes
     * @returns {HTMLElement}
     */
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
     * @param {int} segmentIndex
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

        return coords;
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

    /**
     *
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {number}
     */
    getAngleBetweenVectors: function(x1, y1, x2, y2) {
        let cosine = ((x1 * x2) + (y1 * y2))
            /
            (Math.sqrt((x1 * x1) + (y1 * y1)) * Math.sqrt((x2 * x2) + (y2 * y2)));
        let angle = Math.acos(cosine);
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
     * @description
     * Approximate curves with polylines
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
     * @description
     * define a Gordium-style Segment
     * TODO use only svg segments
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
     * @param {number} rad radians
     * @returns {number} degrees
     */
    radToDeg: function(rad) {
        return rad * 180 / Math.PI;
    },

    /**
     *
     * @param {int} max
     * @returns {int}
     */
    randomInteger: function(max) {
        return parseInt(Math.round(Math.random() * max));
    },

    /**
     *
     * @returns {string}
     */
    randomColor: function() {
        return "rgb(" + Gordium.randomInteger(256) + "," + Gordium.randomInteger(256) + "," + Gordium.randomInteger(256) + ")";
    },

    getDebugSvg: function() {
        return document.getElementById("debug-svg-container").getElementsByTagName("svg")[0];
    },

    /**
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
        Gordium.getDebugSvg().appendChild(line);

    },

    drawDebugPolyline: function(points, style={}) {
        let polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyLine.setAttribute("points", points);
        polyLine.setAttribute("fill", "none");
        polyLine.setAttribute("stroke-width", "3");
        polyLine.setAttribute("stroke", Gordium.randomColor());
        Gordium.getDebugSvg().appendChild(polyLine);
    },

    drawDebugPoint: function(x, y, r, style={}) {
        let currentColor = Gordium.randomColor();
        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", r);
        circle.setAttribute("fill", currentColor);
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        Gordium.getDebugSvg().appendChild(circle);
    }
};