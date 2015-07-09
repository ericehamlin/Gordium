class Knot {

    constructor(path, sampleInterval=10) {

        this.path = path;
        this.pathSegments = [];
        this.points = [];
        this.intersections = [];

        // Approximate curves with Polylines
        // TODO: If straight lines, don't approximate. Use lines
        for (var i = 0; i < path.getTotalLength(); i += sampleInterval) {
            this.points.push({
                x: path.getPointAtLength(i).x,
                y: path.getPointAtLength(i).y,
                pathLength: i
            });
        }
    }
}