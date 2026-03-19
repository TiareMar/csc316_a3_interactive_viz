var subway;


// TODO: Load data 
let promises = [
    d3.csv("data/ttc-subway-delay-data-since-2025.csv"),
    d3.csv("data/code-descriptions.csv"),
    d3.json("data/TTC_SUBWAY_LINES_WGS84.topojson"),
    d3.json("data/toronto_topo.json"),
    d3.csv("data/station-coordinates.csv")
];

Promise.all(promises)
    .then( function(data){ initMainPage(data) })
    .catch( function (err){console.log(err)} );

function initMainPage(data) {
    let subwayDelayData = data[0];
    let codeDescriptions = data[1];
    let topoSubway = data[2];
    let topoToronto = data[3];
    let stationCoords = data[4];

    subway = new Subway("chart-area", subwayDelayData, codeDescriptions, topoSubway,
                        topoToronto, stationCoords); 
}


// Initialize the matrix visualization
// document.getElementById('select-order-type').onchange = function () {
//     matrix.updateVis(this.value);
// }