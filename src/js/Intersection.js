(function(Gordium) {

    class Intersection {

        constructor(knot1, distance1, knot2, distance2, x, y) {
            this.knot1 = knot1;
            this.distance1 = distance1;
            this.knot2 = knot2;
            this.distance2 = distance2;
            this.x = x;
            this.y = y;
            this.over = undefined;
        }

        setOver(over) {
            this.over = over;
        }

        setPathSegment(pathSegment) {

        }
    }

    Gordium.Intersection = Intersection;

})(Gordium);

