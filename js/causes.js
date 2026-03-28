Causes = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
};

Causes.prototype.initVis = function() {
    var vis = this;

    const container = document.getElementById(vis.parentElement);

    vis.width = container.clientWidth;
    vis.height = container.clientHeight;

    vis.svg = d3.select("#" + vis.parentElement)
        .append("svg")
        .attr("width", vis.width)
        .attr("height", vis.height);

    vis.chart = vis.svg.append("g")
        .attr("transform", "translate(20,20)");

    // title
    vis.title = vis.svg.append("text")
        .attr("x", vis.width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text("Top 5 Delay Causes");

    // error message
    vis.errorMessage = vis.svg.append("text")
        .attr("x", vis.width / 2)
        .attr("y", 70)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .attr("opacity", 0)
        .text("No delays to show for this station.");
};

Causes.prototype.updateVis = function(data) {
    var vis = this;

    if (data.length == 0) {
        vis.errorMessage.attr("opacity", 1);
    } else {
        vis.errorMessage.attr("opacity", 0);
    }

    const chartHeight = vis.height - 40;
    const chartWidth = vis.width - 60;

    const minBarHeight = 35;
    const barSpacing = 8;

    const totalHeight = data.length * (minBarHeight + barSpacing);

    const y = d3.scaleBand()
        .domain(data.map(d => d.code))
        .range([0, totalHeight])
        .padding(0.1);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([0, chartWidth]);

    vis.chart.attr("transform", `translate(20, 50)`);

    // bars
    const bars = vis.chart.selectAll(".bar")
        .data(data, d => d.code);

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .merge(bars)
        .attr("x", 0)
        .attr("y", d => y(d.code) + 12)
        .attr("height", y.bandwidth() - 12)
        .attr("width", d => x(d.count))
        .attr("fill", "#ccbebe");

    bars.exit().remove();

    /// labels
    const labels = vis.chart.selectAll(".label")
        .data(data, d => d.code);

    labels.enter()
        .append("text")
        .attr("class", "label")
        .merge(labels)
        .attr("x", 0)
        .attr("y", d => y(d.code) + 10)
        .attr("text-anchor", "start")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text(d => truncate(d.description, 40));

    labels.exit().remove();

    // counts
    const counts = vis.chart.selectAll(".count")
        .data(data, d => d.code);

    counts.enter()
        .append("text")
        .attr("class", "count")
        .merge(counts)
        .attr("x", d => x(d.count) + 5)
        .attr("y", d => y(d.code) + y.bandwidth() / 2 + 5)
        .attr("font-size", "10px")
        .text(d => d.count);

    counts.exit().remove();
};

function truncate(str, max = 40) {
    return str.length > max ? str.slice(0, max) + "..." : str;
}

