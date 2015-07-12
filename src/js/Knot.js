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
        var startPoint = 0;
        var fromLength = 0;
        var toLength = this.intersections[0]/2;
        for (var j=0; j<this.intersections.length; j++) {
            if (newPaths[pathIndex] == undefined) {
                newPaths[pathIndex] = [];
            }
            var points = [];
            for (var i = fromLength; i < toLength; i += this.sampleInterval) {
                newPaths[pathIndex].push(this.path.getPointAtLength(i).x);
                newPaths[pathIndex].push(this.path.getPointAtLength(i).y);
            }
            newPaths[pathIndex].push(this.path.getPointAtLength(toLength).x);
            newPaths[pathIndex].push(this.path.getPointAtLength(toLength).y);
            pathIndex++;
            fromLength = toLength;
            toLength = j===this.intersections.length-1 ? this.path.getTotalLength() : (this.intersections[j] + this.intersections[j+1])/2;
        }
        newPaths[pathIndex] = [];
        for (var i = fromLength; i < toLength; i += this.sampleInterval) {
            newPaths[pathIndex].push(this.path.getPointAtLength(i).x);
            newPaths[pathIndex].push(this.path.getPointAtLength(i).y);
        }
        console.log(this.sampleInterval, newPaths);
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

    /**
     * TODO debug only
     */
    drawIntersections() {
        for (var j = 0; j < this.intersections.length; j++) {
            var intersection = this.intersections[j];
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", 5);
            circle.setAttribute("fill", "red");
            circle.setAttribute("cx", this.path.getPointAtLength(intersection).x);
            circle.setAttribute("cy", this.path.getPointAtLength(intersection).y);

            // TODO global debug svg
            document.getElementsByTagName("svg")[1].appendChild(circle);

        }
    }

    drawCurveSegments() {
        for(var x=0; x<this.pathSegments.length; x++) {
            var polyLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyLine.setAttribute("points", this.pathSegments[x]);
            polyLine.setAttribute("fill", "none");
            polyLine.setAttribute("stroke-width", "3");
            polyLine.setAttribute("stroke", Gordium.randomColor());
            this.destSvg.appendChild(polyLine);

        }
    }
}