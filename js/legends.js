Legend = function(_parentElement, _subwayVis) {
    this.parentElement = _parentElement;
    this.subwayVis = _subwayVis;

    this.initVis();
};

Legend.prototype.initVis = function() {
    var vis = this;

    const container = document.getElementById(vis.parentElement);

    vis.width = container.clientWidth;
    vis.height = container.clientHeight-50;

    vis.svg = d3.select("#" + vis.parentElement)
        .append("svg")
        .attr("width", vis.width)
        .attr("height", vis.height);

    vis.colourGroup = vis.svg.append("g")
        .attr("transform", `translate(60,120)`);

    vis.circleGroup = vis.svg.append("g")
        .attr("transform", `translate(100,180)`);

    vis.svg.append('g')
        .append('text')
        .attr("x", vis.width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("TTC Subway Delay data collected since Jan. 1st 2025.");

    vis.svg.append('g')
        .append('text')
        .attr("x", vis.width / 2)
        .attr("y", 55)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Data from taken from the Toronto Open Data Portal.");

    vis.svg.append('g')
        .append('text')
        .attr("x", vis.width / 2)
        .attr("y", 70)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("To filter by time and day of the week use the timeline.");

    vis.svg.append('g')
        .append('text')
        .attr("x", vis.width / 2)
        .attr("y", 85)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Use the reset button to see all data aggregated.");
        
};

Legend.prototype.drawColorLegend = function(colorScale) {
    var vis = this;

    const width = 180;
    const height = 12;

    vis.colourGroup.selectAll("*").remove();

    // gradient definition
    const defs = vis.svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "color-gradient");

    gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => colorScale(d * colorScale.domain()[0]));

    // gradient bar
    vis.colourGroup.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#color-gradient)");

    // labels
    vis.colourGroup.append("text")
        .attr("x", 55)
        .attr("y", -5)
        .text("Avg Delay (min)")
        .attr("font-size", "12px");

    vis.colourGroup.append("text")
        .attr("x", 0)
        .attr("y", 25)
        .text("0")
        .attr("font-size", "10px");

    vis.colourGroup.append("text")
        .attr("x", width)
        .attr("y", 25)
        .attr("text-anchor", "end")
        .text(Math.round(colorScale.domain()[0]))
        .attr("font-size", "10px");
};

Legend.prototype.drawSizeLegend = function(sizeScale) {
    var vis = this;

    vis.circleGroup.selectAll("*").remove();

    const values = [
        d3.max(sizeScale.domain()) * 0.25,
        d3.max(sizeScale.domain())
    ];

    vis.circleGroup.append("text")
        .attr("x", 10)
        .attr("y", -25)
        .text("Delay Frequency")
        .attr("font-size", "12px");

    values.forEach((v, i) => {
        const r = sizeScale(v);

        vis.circleGroup.append("circle")
            .attr("cx", 30)
            .attr("cy", i * 40)
            .attr("r", r)
            .attr("fill", "none")
            .attr("stroke", "black");

        vis.circleGroup.append("text")
            .attr("x", 70)
            .attr("y", i * 40 + 5)
            .text(Math.round(v))
            .attr("font-size", "10px");
    });
};
