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
                    _topoToronto, _stationCoords, _causesVis) {
    this.parentElement = _parentElement;
    this.subwayDelayData = _subwayDelayData;
    this.codeDescriptions = _codeDescriptions;
    this.topoSubway = _topoSubway;
    this.topoToronto = _topoToronto;
    this.stationCoords = _stationCoords
    this.causesVis = _causesVis;

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

    console.log("causes:", vis.causesVis);
    
    const container = document.getElementById(vis.parentElement);
    
    vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    vis.width = container.clientWidth;
    vis.height = container.clientHeight;

    vis.svg = d3.select("#" + vis.parentElement).append("svg")
        .attr("width", vis.width)
        .attr("height", vis.height)
        .append("g")
        .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
    
    // title
    vis.svg.append('g')
            .attr('class', 'title')
            .attr('id', 'map-title')
            .append('text')
            .text('When and Where is the TTC the most UNRELIABLE?')
            .attr('transform', `translate(350, 100)`)
            .attr('text-anchor', 'middle');

    // convert topoJSON data to geoJSON data structure
    vis.toronto = topojson.feature(vis.topoToronto, vis.topoToronto.objects.toronto);
    vis.subway = topojson.feature(vis.topoSubway, vis.topoSubway.objects.TTC_SUBWAY_LINES_WGS84);

    console.log(vis.toronto.features);
    console.log(vis.subway.features);

    vis.projection = d3.geoMercator() // d3.geoStereographic()
                        .fitExtent([[120, 120], [vis.width - 120, vis.height - 120]], vis.subway);

    //console.log(vis.projection([-79.38, 43.65]));

    // define geo generator and pass projection to it
    vis.path = d3.geoPath().projection(vis.projection);

    // toronto map as backgorund
    vis.svg.append("g")
        .selectAll("path")
        .data(vis.toronto.features)
        .enter()
        .append("path")
        .attr("d", vis.path)
        .attr("fill", "#f5f5f5")
        .attr("stroke", "#999");

    // subway lines
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

    // for stations circles
    vis.stationLayer = vis.svg.append("g");

    // FOR WEEK DAY + TIME FILTERING
    vis.timeScale = d3.scaleLinear()
                    .domain([0, 167])
                    .range([100, vis.width - 100]);

    let days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    let dayPositions = d3.range(0, 168, 24);

    // slider day lines
    vis.svg.append("g")
        .selectAll("line")
        .data(dayPositions)
        .enter()
        .append("line")
        .attr("x1", d => vis.timeScale(d))
        .attr("x2", d => vis.timeScale(d))
        .attr("y1", vis.height - 55)
        .attr("y2", vis.height - 45)
        .attr("stroke", "black")
        .attr("stroke-width", 1);
        
    // slider track line
    vis.sliderTrack = vis.svg.append("line")
                        .attr("x1", 100)
                        .attr("x2", vis.width - 100)
                        .attr("y1", vis.height - 50)
                        .attr("y2", vis.height - 50)
                        .attr("stroke", "black")
                        .attr("stroke-width", 2);
    // draggable circle for weekday
    vis.sliderHandle = vis.svg.append("circle")
                        .attr("cx", vis.timeScale(0))
                        .attr("cy", vis.height - 50)
                        .attr("r", 10)
                        .attr("fill", "black")
                        .call(d3.drag().on("drag", function(event) {
                            let x = Math.max(100, Math.min(vis.width - 100, event.x));
                            d3.select(this).attr("cx", x);

                            let selectedTime = Math.round(vis.timeScale.invert(x));
                            console.log("Selected time:", selectedTime);
                            vis.timeLabel
                                .attr("x", x)
                                .attr("y", vis.height - 75)
                                .text(formatTime(selectedTime));
                            vis.updateTimeFilter(selectedTime);
                        }))
                        .on("mouseover", function() {
                            d3.select(this).attr("r", 15);
                        })
                        .on("mouseout", function() {
                            d3.select(this).attr("r", 10);
                        });
    
    // label for weekday and time ON TOP OF SLIDER
    vis.timeLabel = vis.svg.append("text")
                        .attr("x", vis.timeScale(0))
                        .attr("y", vis.height - 75)
                        .attr("class", "subtitle")
                        .attr("text-anchor", "middle")
                        .text(formatTime(0));
        
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
    
    let dayIndex = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6
    };

    // remove rows without valid station names & add time data for filtering
    vis.cleanedDelays = vis.subwayDelayData
                        .filter(d => d.Station && d.Station !== "None")
                        .filter(d => vis.allValidStations.has(renameInvalidStations(d.Station)))
                        .map(d => {
                            let [hour, min] = d.Time.split(":").map(Number);
                            let hourDecimal = hour + min / 60;

                            return {
                            ...d,
                            Station: readifyStationName(d.Station),
                            timeIndex: dayIndex[d.Day] * 24 + hourDecimal
                            };
                        });
    
    // map station names to coords
    vis.stopMap = new Map(vis.stationCoords.map(d => [
        readifyStationName(d.stop_name),
        {
            lat: +d.stop_lat,
            lon: +d.stop_lon,
            name: d.stop_name
        }
    ]));

    // map for delay cause
    vis.codeMap = new Map(
        vis.codeDescriptions.map(d => [d.CODE, d.DESCRIPTION])
    );

    vis.stationData = vis.aggregateData(vis.cleanedDelays);

    // causes vis
    const globalCauses = vis.getTop5DelayCauses(vis.cleanedDelays);
    vis.causesVis.updateVis(globalCauses);

    vis.updateVis();
};

Subway.prototype.aggregateData = function(data) {
    var vis = this;

    let result = [];

    // aggregate per station
    let stationStats = d3.rollup(data, v => ({
            frequency: v.length, // number of delays
            avgDelay: d3.mean(v, d => +d["Min Delay"]) // delay length
        }),
        d => d.Station
    );

    // merge station data
    stationStats.forEach((stats, stationKey) => {
        const coord = vis.stopMap.get(stationKey);

        if (coord) {
            result.push({
                station: coord.name,
                lat: coord.lat,
                lon: coord.lon,
                frequency: stats.frequency,
                avgDelay: stats.avgDelay
            });
        }
    });

    return result;
};

/*
 * The drawing function
 */
Subway.prototype.updateVis = function () {
    var vis = this;

    console.log("stationData length:", vis.stationData.length);

    // station circle colour scale
    vis.colorScale = d3.scaleSequential()
                        .domain([d3.max(vis.stationData, d => d.avgDelay), 0])
                        .interpolator(t => d3.interpolateReds(1 - t))
                        .clamp(true);
    
    vis.sizeScale = d3.scaleSqrt()
                        .domain([0, d3.max(vis.stationData, d => d.frequency)])
                        .range([3, 15]);

    // draw subway station circles
    const circles = vis.stationLayer
                        .selectAll("circle")
                        .data(vis.stationData, d => d.station);

    // ENTER
    const circlesEnter = circles.enter()
                            .append("circle")
                            .attr("cx", d => vis.projection([d.lon, d.lat])[0])
                            .attr("cy", d => vis.projection([d.lon, d.lat])[1])
                            .attr("stroke", "black")
                            .attr("stroke-width", 0.5)
                            .attr("opacity", 0.8);

    // ENTER + UPDATE
    circlesEnter.merge(circles)
                .on('mouseover', function(event, d) {
                    vis.tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="border:1px solid grey; border-radius:5px; background:white; padding:8px">
                        <strong>${readifyStationName(d.station)}</strong><br/>
                        Avg Delay: ${d.avgDelay.toFixed(1)} min<br/>
                        Frequency: ${d.frequency}
                        </div>
                    `);

                    const stationCauses = vis.getTop5DelayCauses(vis.currentFilteredData || vis.cleanedDelays,
                                                readifyStationName(d.station) );
                    vis.causesVis.updateVis(stationCauses);
                })
                .on('mousemove', function(event) {
                    vis.tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY + 15) + "px");
                })
                .on('mouseout', function() {
                    vis.tooltip.style("opacity", 0);

                    const globalCauses = vis.getTop5DelayCauses(vis.cleanedDelays);
                    vis.causesVis.updateVis(globalCauses);
                })
                .transition()
                .duration(0)
                .attr("r", d => vis.sizeScale(d.frequency))
                .attr("fill", d => vis.colorScale(d.avgDelay));

    // EXIT
    circles.exit().remove();
};

Subway.prototype.filterData = function(selectedTime) {
    var vis = this;

    const windowSize = 2;

    return vis.cleanedDelays.filter(d => {
        let diff = Math.abs(d.timeIndex - selectedTime);
        diff = Math.min(diff, 168 - diff); // wrap around week
        return diff <= windowSize;
    });
};

Subway.prototype.updateTimeFilter = function(selectedTime) {
    var vis = this;

    const filtered = vis.filterData(selectedTime);
    vis.stationData = vis.aggregateData(filtered);
    vis.currentFilteredData = filtered;

    console.log("Filtered size:", filtered.length);

    // update scales dynamically
    // vis.colorScale.domain([d3.max(vis.stationData, d => d.avgDelay),0]);
    // vis.sizeScale.domain([0,d3.max(vis.stationData, d => d.frequency)]);

    const topCauses = vis.getTop5DelayCauses(filtered);
    vis.causesVis.updateVis(topCauses);

    vis.updateVis();
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

function formatTime(t) {
    let day = Math.floor(t / 24);
    let hour = Math.floor(t % 24);

    let days = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

    let amPM = hour >= 12 ? "PM" : "AM";
    let hour12 = hour % 12;
    if (hour12 === 0) {
        hour12 = 12;
    }

    return `${days[day]} ${hour12}:00 ${amPM}`;
}

Subway.prototype.getTop5DelayCauses = function(data, stationName = null) {
    var vis = this;

    let filtered;
    if (stationName) {
        const target = readifyStationName(stationName);
        filtered = data.filter(d => readifyStationName(d.Station) === target);
    } else {
        filtered = data;
    }

    const counts = d3.rollup(filtered, v => v.length, d => d.Code);

    let result = Array.from(counts, ([code, count]) => ({
        code,
        description: vis.codeMap.get(code) || code,
        count
    }));

    return result
        .sort((a, b) => d3.descending(a.count, b.count))
        .slice(0, 5);
};
