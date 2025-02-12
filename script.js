let mouseData = [];
let timeExtent = [0, 0];
const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

d3.json("mouse_data.json").then(data => {
    mouseData = data;
    timeExtent = d3.extent(mouseData, d => d.time);
    initVisualization();
}).catch(error => console.error("Error loading data:", error));

function initVisualization() {
    const xScale = d3.scaleLinear()
        .domain(timeExtent)
        .range([margin.left, width - margin.right]);

    const yTempScale = d3.scaleLinear()
        .domain(d3.extent(mouseData, d => d.temperature))
        .nice()
        .range([height - margin.bottom, margin.top]);

    const yActivityScale = d3.scaleLinear()
        .domain(d3.extent(mouseData, d => d.activity))
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Create SVG containers
    const tempSvg = d3.select("#temperature-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .classed("chart", true);

    const activitySvg = d3.select("#activity-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .classed("chart", true);

    // Add axes
    [tempSvg, activitySvg].forEach(svg => {
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickSizeOuter(0))
            .append("text")
            .attr("x", width - margin.right)
            .attr("y", 30)
            .attr("fill", "#000")
            .text("Time (minutes)");
    });

    tempSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yTempScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("fill", "#000")
        .text("Temperature (°C)");

    activitySvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yActivityScale))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("fill", "#000")
        .text("Activity Level");

    // Prepare data
    const mice = Array.from(new Set(mouseData.map(d => d.mouse_id)));
    const dataByMouse = d3.group(mouseData, d => d.mouse_id);

    // Create line generators
    const tempLine = d3.line()
        .x(d => xScale(d.time))
        .y(d => yTempScale(d.temperature));

    const activityLine = d3.line()
        .x(d => xScale(d.time))
        .y(d => yActivityScale(d.activity));

    // Draw grey background lines
    [tempSvg, activitySvg].forEach((svg, i) => {
        svg.selectAll(".bg-line")
            .data(mice)
            .enter().append("path")
            .attr("class", "bg-line")
            .attr("d", d => i === 0 ? tempLine(dataByMouse.get(d)) : activityLine(dataByMouse.get(d)))
            .attr("stroke", "#eee")
            .attr("fill", "none");
    });

    // Create clip paths
    const createClipPath = (svg, id) => {
        svg.append("defs").append("clipPath")
            .attr("id", id)
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", height);
    };

    createClipPath(tempSvg, "temp-clip");
    createClipPath(activitySvg, "activity-clip");

    // Draw colored lines
    mice.forEach(mouse => {
        const color = mouse.startsWith('f') ? '#cc0066' : '#0066cc';
        
        tempSvg.append("path")
            .datum(dataByMouse.get(mouse))
            .attr("class", "color-line")
            .attr("d", tempLine)
            .attr("stroke", color)
            .attr("fill", "none")
            .attr("clip-path", "url(#temp-clip)");

        activitySvg.append("path")
            .datum(dataByMouse.get(mouse))
            .attr("class", "color-line")
            .attr("d", activityLine)
            .attr("stroke", color)
            .attr("fill", "none")
            .attr("clip-path", "url(#activity-clip)");
    });

    // Create slider
    const slider = d3.select("#slider-container")
        .append("input")
        .attr("type", "range")
        .attr("min", timeExtent[0])
        .attr("max", timeExtent[1])
        .attr("value", timeExtent[0])
        .style("width", width + "px")
        .on("input", function() {
            const currentTime = +this.value;
            updateVisualization(currentTime);
        });

    // Initialize value display
    const valueDisplay = d3.select("#value-display");
    ["female", "male"].forEach(gender => {
        valueDisplay.append("div")
            .attr("class", "value-group")
            .html(`
                <h3>${gender.charAt(0).toUpperCase() + gender.slice(1)}</h3>
                <div class="value-item" id="${gender}-temp">Temp: --</div>
                <div class="value-item" id="${gender}-activity">Activity: --</div>
            `);
    });

    // Initial update
    updateVisualization(timeExtent[0]);
}

function updateVisualization(currentTime) {
    // Update clip paths
    const xPos = d3.scaleLinear()
        .domain(timeExtent)
        .range([margin.left, width - margin.right])(currentTime);

    d3.select("#temp-clip rect").attr("width", xPos);
    d3.select("#activity-clip rect").attr("width", xPos);

    // Update value display
    const currentData = mouseData.filter(d => d.time === currentTime);
    const genderData = {
        female: currentData.filter(d => d.mouse_id.startsWith('f')),
        male: currentData.filter(d => d.mouse_id.startsWith('m'))
    };

    Object.entries(genderData).forEach(([gender, data]) => {
        if (data.length > 0) {
            const avgTemp = d3.mean(data, d => d.temperature).toFixed(2);
            const avgActivity = d3.mean(data, d => d.activity).toFixed(2);
            d3.select(`#${gender}-temp`).text(`Temp: ${avgTemp}°C`);
            d3.select(`#${gender}-activity`).text(`Activity: ${avgActivity}`);
        }
    });
}
