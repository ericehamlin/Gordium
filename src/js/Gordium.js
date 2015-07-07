class Gordium {

    /**
     *
     * @param filename
     */
    static loadSvg(filename) {

        var request = new XMLHttpRequest();
        var promise = new Promise(function(resolve, reject) {
            request.open('GET', filename, true);
            request.onreadystatechange = onResponse;
            request.send(null);

            function onResponse(event) {
                if(request.readyState === 4) { // request finished and response is ready
                    if (request.status !== 200) {
                        reject("couldn't load file")
                    }
                    var element = document.createElement("div");
                    var svgXml = request.responseText.replace(/^(.|\n|\r)*?(<svg)/im, "$2");
                    element.insertAdjacentHTML("afterbegin", svgXml);
                    resolve(element);
                }
            };
        });
        return promise;
    }

    /**
     *
     * @param svg
     * @returns {NodeList}
     */
    static getPathsFromSvg(svg) {
        var paths = svg.getElementsByTagName("path");
        return paths;
    }
}