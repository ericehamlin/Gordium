class Knotwork {
    constructor(filename=null, svgObject=null) {



        this.filename = filename;
        this.svgObject = svgObject;

        if (filename !== null) {
            this.filename = filename;

            var request = new XMLHttpRequest();
            request.open('GET', filename, true);
            request.onreadystatechange = onSumResponse;
            request.send(null);

            function onSumResponse(event) {
                if(request.readyState === 4) { // request finished and response is ready
                    if (request.status !== 200) {
                        throw "couldn't load file"
                    }
                    var element = document.createElement("div");
                    var svgXml = request.responseText.replace(/^(.|\n|\r)*?(<svg)/im, "$2");
                    element.insertAdjacentHTML("afterbegin", svgXml);
                    var paths = element.getElementsByTagName("path");
                    console.log(paths);

                }
            };

            /*fetch(filename, {
                method: 'get',
                headers: {
                    'Accept': 'text/xml',
                    'Content-Type': 'text/xml'
                }
            }).then(function(response) {
                console.log(response);
                document.createElement('a');
            }).catch(function(err) {
                throw "couldn't load file"
            });*/
        }
        else if (svgObject !== null) {

        }
        else {
            throw "hey, no svgObject!";
        }
    }
}