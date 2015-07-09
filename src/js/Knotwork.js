class Knotwork {

    /**
     *
     * @param filename
     * @param srcSvg
     */
    constructor(filename=null, srcSvg=null, sampleInterval=20) {
        let self = this;

        this.filename = filename;
        this.srcSvg = srcSvg;
        this.knots = [];
        this.sampleInterval = sampleInterval;

        this.destSvg = document.getElementById("dest-svg");
        this.showSvg = document.getElementById("show-svg");

        if (filename !== null) {
            this.filename = filename;

            Gordium.loadSvg(filename).then(function(svg) {
                self.srcSvg = svg;
                self.showSvg.insertAdjacentHTML("afterbegin", svg.innerHTML);
                self.getPathsFromSvg();
            })/*.catch(function(error) {
                throw new Error("Couldn't load source SVG!");
            });*/
        }
        else if (srcSvg !== null) {
            this.getPathsFromSvg();
        }
        else {
            throw new Error("Hey, there's no source SVG!");
        }


    }

    getPathsFromSvg() {
        var colors = [
            "#cc0000",
            "#00cc00",
            "#0000cc",
            "#990066"
        ];

        var paths = Gordium.getPathsFromSvg(this.srcSvg);
        for (var i = 0; i < paths.length; i++) {
            this.knots.push(new Knot(paths[i], this.sampleInterval));
        }

        Gordium.findIntersectionsForKnots(this.knots, this.sampleInterval);

        //TODO Remove!
        for(var i=0; i<this.knots.length; i++) {
            for (var j=0; j<this.knots[i].intersections.length; j++) {
                var intersection = this.knots[i].intersections[j];
                var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("r", 10);
                circle.setAttribute("fill", "red");
                circle.setAttribute("cx", this.knots[i].path.getPointAtLength(intersection).x);
                circle.setAttribute("cy", this.knots[i].path.getPointAtLength(intersection).y);

                document.getElementsByTagName("svg")[1].appendChild(circle);


            }
        }

        // Break curve into curve segments on either side of intersection

        for (var i=0; i<this.knots.length; i++) {
            var knot = this.knots[i];
            var path = knot.path;

            var newPaths = [];
            var pathIndex = 0;
            var startPoint = 0;
            for (var j=0; j<knot.intersections.length; j++) {
                if (newPaths[pathIndex] == undefined) {
                    newPaths[pathIndex] = [];
                }
                for (var k = startPoint; k < knot.points.length; k++) {
                    if (knot.points[k].pathLength > knot.intersections[j]) {
                        var point = {
                            x: knot.path.getPointAtLength(knot.intersections[i]).x,
                            y: knot.path.getPointAtLength(knot.intersections[i]).y,
                            pathLength: knot.intersections[i]
                        };
                        newPaths[pathIndex].push(point.x);
                        newPaths[pathIndex].push(point.y);
                        pathIndex++;
                        if (k < knot.points.length - 1) {
                            newPaths[pathIndex] = [];
                            newPaths[pathIndex].push(point.x);
                            newPaths[pathIndex].push(point.y);
                            startPoint = k+1;
                            break;
                        }
                    }
                    else {
                        newPaths[pathIndex].push(knot.points[k].x);
                        newPaths[pathIndex].push(knot.points[k].y);
                    }
                }
            }
            knot.pathSegments = newPaths;

            console.log(knot);

            var currentColor = 0;
            for(var x=0; x<newPaths.length; x++) {
                var polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                polyLine.setAttribute("points", newPaths[x]);
                polyLine.setAttribute("fill", "none");
                polyLine.setAttribute("stroke", colors[currentColor]);
                this.destSvg.appendChild(polyLine);

                currentColor = colors.length == currentColor+1 ? 0 : currentColor+1;
            }

            /**
            var length = path.getTotalLength();

            path.setAttribute("stroke-width", 10);
            path.setAttribute("stroke", colors[i]);

            var newPath = path.cloneNode(true);
            newPath.id = "path-"+Math.floor((Math.random()*100)+1);

            var pathSegment = Gordium.getSubpath(newPath.attributes.d.nodeValue, 0, 30);
            console.log(pathSegment);
            var newPathSegment = document.createElement("path");
            newPathSegment.setAttribute("d", pathSegment);
            newPathSegment.setAttribute("stroke-width", 10);
            newPathSegment.setAttribute("stroke", colors[i]);
            this.destSvg.appendChild(newPathSegment);
             */

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
    }
}