const VALID_LINE1_STATIONS = [
    "BLOOR STATION", "CEDARVALE YU STATION", "COLLEGE STATION", "DAVISVILLE STATION", 
    "DOWNSVIEW PARK STATION", "TMU STATION", "DUPONT STATION", "EGLINTON STATION", 
    "FINCH STATION", "FINCH WEST STATION", "GLENCAIRN STATION", "HIGHWAY 407 STATION", 
    "KING STATION", "LAWRENCE STATION", "LAWRENCE WEST STATION",
    "MUSEUM STATION", "NORTH YORK CTR STATION", "OSGOODE STATION", "QUEEN'S PARK STATION",
    "QUEEN STATION", "ROSEDALE STATION", "SHEPPARD WEST STATION", "SHEPPARD-YONGE STATION",
    "SPADINA STATION", "ST ANDREW STATION", "ST CLAIR STATION", "ST CLAIR WEST STATION",
    "ST GEORGE STATION", "UNION STATION", "VMC STATION", "WELLESLEY STATION", "WILSON STATION",
    "YORK MILLS STATION", "YORKDALE STATION", "SUMMERHILL STATION", "YORK UNIVERSITY STATIO",
    "PIONEER VILLAGE STATIO", "ST PATRICK STATION"
];

const VALID_LINE2_STATIONS = [
    "BATHURST STATION", "BAY STATION", "BLOOR STATION", "BROADVIEW STATION",
    "CASTLE FRANK STATION", "CHESTER STATION", "CHRISTIE STATION", "COXWELL STATION",
    "DONLANDS STATION", "DUFFERIN STATION", "DUNDAS WEST STATION", "GREENWOOD STATION",
    "HIGH PARK STATION", "JANE STATION", "KEELE STATION", "KENNEDY STATION", "KIPLING STATION",
    "LANSDOWNE STATION", "MAIN STREET STATION", "OLD MILL STATION", "OSSINGTON STATION",
    "PAPE STATION", "ROYAL YORK STATION", "RUNNYMEDE STATION", "SHERBOURNE STATION",
    "SPADINA STATION", "ST GEORGE STATION", "VICTORIA PARK STATION",
    "WARDEN STATION", "WOODBINE STATION", "ISLINGTON STATION"
];

const VALID_LINE4_STATIONS = [
    "BAYVIEW STATION", "BESSARION STATION", "DON MILLS STATION", "LESLIE STATION", 
    "SHEPPARD-YONGE STATION"
];

const RENAMED_STATIONS = {
  "DUNDAS STATION": "TMU STATION",
  "EGLINTON WEST STATION": "CEDARVALE YU STATION",
  "ST GEORGE YUS STATION": "ST GEORGE STATION",
  "ST GEORGE BD STATION": "ST GEORGE STATION",
  "VAUGHAN MC STATION": "VMC STATION"
};

Subway = function (_parentElement, _subwayDelayData, _codeDescriptions, _topoSubway, 
                    _topoToronto, _stationCoords) {
    this.parentElement = _parentElement;
    this.subwayDelayData = _subwayDelayData;
    this.codeDescriptions = _codeDescriptions;
    this.topoSubway = _topoSubway;
    this.topoToronto = _topoToronto;
    this.stationCoords = _stationCoords;

    this.allValidStations = new Set([
        ...VALID_LINE1_STATIONS,
        ...VALID_LINE2_STATIONS,
        ...VALID_LINE4_STATIONS]);
    
    this.stationData = [];

    this.initVis();
};


/*
 * Initialize visualization (static content; e.g. SVG area, axes)
 */

Subway.prototype.initVis = function () {
    var vis = this;

    vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    vis.height = 1000;
    vis.width = 1500;

    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width)
        .attr("height", vis.height)
        .append("g")
        .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
    
    // add title
    // TODO

    // convert topoJSON data to geoJSON data structure
    vis.toronto = topojson.feature(vis.topoToronto, vis.topoToronto.objects.toronto);
    vis.subway = topojson.feature(vis.topoSubway, vis.topoSubway.objects.TTC_SUBWAY_LINES_WGS84);

    console.log(vis.toronto.features);
    console.log(vis.subway.features);

    // create projection
    vis.projection = d3.geoMercator() // d3.geoStereographic()
                        .fitSize([vis.width, vis.height], vis.toronto);

    //console.log(vis.projection([-79.38, 43.65]));

    // define geo generator and pass projection to it
    vis.path = d3.geoPath().projection(vis.projection);

    // draw toronto map as backgorund
    vis.svg.append("g")
        .selectAll("path")
        .data(vis.toronto.features)
        .enter()
        .append("path")
        .attr("d", vis.path)
        .attr("fill", "#f5f5f5")
        .attr("stroke", "#999");

    // draw subway lines
    vis.svg.append("g")
        .selectAll("path")
        .data(vis.subway.features)
        .enter()
        .append("path")
        .attr("d", vis.path)
        .attr("fill", "none")
        .attr("stroke", d => {
            switch (d.properties.ROUTE_NAME) {
                case "LINE 1 (YONGE-UNIVERSITY)":
                    return "yellow";
                case "LINE 2 (BLOOR - DANFORTH)":
                    return "green";
                case "LINE 3 (SCARBOROUGH)":
                    return "blue";
                case "LINE 4 (SHEPPARD)":
                    return "purple";
                default:
                    return "black";
            }
        })
        .attr("stroke-width", 10);
    
    // append tooltip
    vis.tooltip = d3.select("body").append('div')
        .attr('class', "tooltip")
        .attr('id', 'stationTooltip');
        

    
    vis.wrangleData();
};


/*
 * Data wrangling
 */

Subway.prototype.wrangleData = function () {
    var vis = this;

    console.log(vis.allValidStations);
    
    // remove rows without valid station names
    let cleanedDelays = vis.subwayDelayData
                        .filter(d => d.Station && d.Station !== "None")
                        .filter(d => vis.allValidStations.has(renameInvalidStations( d.Station)));
    
    // map station names to coords
    let stopMap = new Map(vis.stationCoords.map(d => [
                            d.stop_name,
                            {
                                lat: +d.stop_lat,
                                lon: +d.stop_lon,
                                name: d.stop_name
                            }
                        ]));

    // aggregate per station
    let stationStats = d3.rollup(cleanedDelays, v => ({
                                    frequency: v.length, // number of delays
                                    avgDelay: d3.mean(v, d => +d["Min Delay"]) // delay length
                                }),
                                d => d.Station
                            );

    // merge station data
    stationStats.forEach((stats, stationKey) => {
        const coord = stopMap.get(stationKey);

        if (coord) {
            vis.stationData.push({
                station: coord.name,
                lat: coord.lat,
                lon: coord.lon,
                frequency: stats.frequency,
                avgDelay: stats.avgDelay
            });
        }
    });

    vis.updateVis();
};


/*
 * The drawing function
 */

Subway.prototype.updateVis = function () {
    var vis = this;

    // station circle colour scale
    const colorScale = d3.scaleSequential()
                        .domain([d3.max(vis.stationData, d => d.avgDelay), 0])
                        .interpolator(d3.interpolateRdYlGn)
                        .clamp(true);
    
    const sizeScale = d3.scaleSqrt()
                        .domain([0, d3.max(vis.stationData, d => d.frequency)])
                        .range([3, 15]);

    // draw subway station circles
    vis.svg.append("g")
        .selectAll("circle")
        .data(vis.stationData)
        .enter()
        .append("circle")
        .attr("cx", d => vis.projection([d.lon, d.lat])[0])
        .attr("cy", d => vis.projection([d.lon, d.lat])[1])
        .attr("r", d => sizeScale(d.frequency))
        .attr("fill", d => colorScale(d.avgDelay))
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.8)
        .on('mouseover', function(event, d){
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .html(`
                        <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 20px">
                            <p>${readifyStationName(d.station)}<p>
                            <p>Average Delay Duration (mins): ${d.avgDelay}<p>   
                            <p>Average Delay Frequency: ${d.frequency}<p>                   
                        </div>`);
            }).on('mouseout', function(event, d){
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            });

};

function renameInvalidStations(name) {
    return RENAMED_STATIONS[name] || name;
}

function readifyStationName(name) {
    let cleanedName= name
                .replace("STATION", "")
                .replace("STATIO", "")
                .replace(".", "");
    
    // dataset specific cleaning
    return cleanedName
            .replace("CTR", "CENTRE")
            .replace("VMC", "VAUGHAN METROPOLITAN CENTRE")
            .trim();

}
