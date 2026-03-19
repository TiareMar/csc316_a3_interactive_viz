Subway = function (_parentElement, _subwayDelayData, _codeDescriptions, _topoSubway, 
                    _topoToronto, _stationCoords) {
    this.parentElement = _parentElement;
    this.subwayDelayData = _subwayDelayData;
    this.codeDescriptions = _codeDescriptions;
    this.topoSubway = _topoSubway;
    this.topoToronto = _topoToronto;
    this.stationCoords = _stationCoords;

    this.initVis();
};


/*
 * Initialize visualization (static content; e.g. SVG area, axes)
 */

Subway.prototype.initVis = function () {
    var vis = this;

    vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
    vis.height = 1000;
    vis.width = 1000;

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
        
    // draw subway station circles
    vis.svg.append("g")
        .selectAll("circle")
        .data(vis.stationCoords)
        .enter()
        .append("circle")
        .attr("cx", d => vis.projection([d.stop_lon, d.stop_lat])[0])
        .attr("cy", d => vis.projection([d.stop_lon, d.stop_lat])[1])
        .attr("r", 5)
        .on('mouseover', function(event, d){
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .html(`
                        <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 20px">
                            <h3>${d.stop_name}<h3>                    
                        </div>`);
            }).on('mouseout', function(event, d){
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            });


    
    // TODO vis.wrangleData();
};


/*
 * Data wrangling
 */

Subway.prototype.wrangleData = function () {
    var vis = this;

    vis.dataMarriages.forEach((d, i) => {
        let totalMarriages = d.filter(x => x === 1).length;
        let totalBusiness = vis.dataBusiness[i].filter(x => x === 1).length;

        let family = {
            "index": i,
            "name": vis.dataFamilyAttributes[i].Family,
            "allRelations": totalBusiness + totalMarriages,
            "businessTies": totalBusiness,
            "businessValues": vis.dataBusiness[i],
            "marriages": totalMarriages,
            "marriageValues": d,
            "numberPriorates": vis.dataFamilyAttributes[i].NumberPriorates,
            "wealth": vis.dataFamilyAttributes[i].Wealth
        };

        vis.displayData.push(family);

    });

    console.log(vis.displayData);
    vis.updateVis("name");
};


/*
 * The drawing function
 */

Subway.prototype.updateVis = function (orderingType) {
    var vis = this;

    // Update sorting
    // TODO: Implement
    if (orderingType === "name"){
        vis.displayData.sort((a,b)=>d3.ascending(a.name, b.name));
    } else if (orderingType === "numRelations"){
        vis.displayData.sort((a,b)=>d3.ascending(a.allRelations, b.allRelations));
    } else if (orderingType === "numBusiness"){
        vis.displayData.sort((a,b)=>d3.ascending(a.businessTies, b.businessTies));
    } else if (orderingType === "numMarriages"){
        vis.displayData.sort((a,b)=>d3.ascending(a.marriages, b.marriages));
    } else if (orderingType === "wealth"){
        vis.displayData.sort((a,b)=>b.wealth - a.wealth);
    } else { //if (orderingType === "priorates"){
        vis.displayData.sort((a,b)=>b.priorates - a.priorates);
    }


    // Draw matrix rows (and y-axis labels)
    // TODO: Implement
    let dataJoin = vis.svg.selectAll(".matrix-row")
                        .data(vis.displayData, d => d.name);

    // ENTER
    var rowsGroups = dataJoin.enter()
        .append("g")
        .attr("class", "matrix-row");

    // ENTER
    rowsGroups.append("text")
        .attr("class", "matrix-label matrix-row-label")
        .attr("x", -10)
        .attr("y", vis.cellHeight / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(function (d, index) {
            return d.name;
        })
        .merge(dataJoin.select(".matrix-row-label"));   // merge ENTER + UPDATE (row labels)

    rowsGroups.merge(dataJoin)  // merge ENTER + UPDATE groups
        .style('opacity', 0.5)
        .transition()
        .duration(1000)
        .style('opacity', 1)
        .attr("transform", (d, i) => "translate(0," + (vis.cellHeight + vis.cellPadding) * i + ")");


    // Draw marriage triangles
    // TODO: Implement
    rowsGroups.selectAll(".matrix-cell-marriage")
        .data(d => d.marriageValues)
        .enter()
        .append("path")
        .attr("class", "matrix-cell-marriage")
        .attr("d", (d, j) => {
            let c = j * (vis.cellWidth + vis.cellPadding);
            return `M ${c} 0 L ${c + vis.cellWidth} 0 L ${c + vis.cellWidth} ${vis.cellHeight} Z`;
        })
        .attr("fill", d => d === 1 ? "yellow" : "none");


    // Draw business triangles
    // TODO: Implement
    rowsGroups.selectAll(".matrix-cell-business")
        .data(d => d.businessValues)
        .enter()
        .append("path")
        .attr("class", "matrix-cell-business")
        .attr("d", (d, j) => {
            let c = j * (vis.cellWidth + vis.cellPadding);
            return `M ${c} ${vis.cellHeight} L ${c + vis.cellWidth} ${vis.cellHeight} L ${c} 0 Z`;
        })
        .attr("fill", d => d === 1 ? "purple" : "none");

    // Draw x-axis labels
    // TODO: Implement
    let xAxis = vis.svg.selectAll(".matrix-col-label")
                    .data(vis.displayData);
    xAxis.enter().append("text")
        .attr("class","matrix-label matrix-col-label")
        .attr("transform", (d, i) => `translate(${i*(vis.cellWidth+vis.cellPadding)+vis.cellWidth/2}, -10) rotate(-90)`)
        .attr("text-anchor","start")
        .text(d=>d.name);
};