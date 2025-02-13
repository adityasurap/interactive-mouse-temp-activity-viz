let mouseData = [];
let timeExtent = [0, 0];
let selectedGender = "all"; // Track selected gender
const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

d3.json("mice.json").then(data => {
    mouseData = data;
    timeExtent = d3.extent(mouseData, d => d.time);
    initVisualization();
}).catch(error => console.error("Error loading data:", error));

function initVisualization() {
    // Organize data by gender and time
    const groupedData = d3.group(mouseData, d => d.gender);
    const genders = ["m", "f"];
    
    // Sort and structure data for line charts
    genders.forEach(gender => {
        groupedData.set(gender, d3.sort(
            groupedData.get(gender), 
            (a, b) => a.time - b.time
        ));
    });

    // Create scales
    const xScale = d3.scaleLinear()
        .domain(timeExtent)
        .range([margin.left, width - margin.right]);

    const yTempScale = d3.scaleLinear()
        .domain([Math.min(...mouseData.map(d => d.temperature)), 
                Math.max(...mouseData.map(d => d.temperature))])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const yActivityScale = d3.scaleLinear()
        .domain([Math.min(...mouseData.map(d => d.activity)), 
                Math.max(...mouseData.map(d => d.activity))])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Create SVG containers
    const tempSvg = d3.select("#temperature-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .classed("chart", true)
        .style("background-color", "#fafafa")
        .style("border-radius", "8px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    const activitySvg = d3.select("#activity-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .classed("chart", true)
        .style("background-color", "#fafafa")
        .style("border-radius", "8px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yTempAxis = d3.axisLeft(yTempScale);
    const yActivityAxis = d3.axisLeft(yActivityScale);

    // Create clip paths for slider effect
    const createClipPath = (svg, id) => {
        svg.append("defs").append("clipPath")
            .attr("id", id)
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", xScale(0))
            .attr("height", height);
    };

    [tempSvg, activitySvg].forEach((svg, i) => {
        // X-axis
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(xAxis);
        
        // Y-axis
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(i === 0 ? yTempAxis : yActivityAxis);

        // Add axis labels
        svg.append("text")
            .attr("transform", i === 0 
                ? `translate(${margin.left - 40},${height/2 + 55}) rotate(-90)`
                : `translate(${margin.left - 35},${height/2 + 50}) rotate(-90)`)
            .text(i === 0 ? "Temperature (°C)" : "Activity Level");

        svg.append("text")
            .attr("transform", i === 0 
                ? `translate(${margin.left + 240},${height/2 + 90})`
                : `translate(${margin.left + 240},${height/2 + 90})`)
            .text(i === 0 ? "Time (in seconds)" : "Time (in seconds)");
        

        createClipPath(svg, i === 0 ? "temp-clip" : "activity-clip");
    });

    // Line generators
    const lineGenerator = (yScale, metric) => d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d[metric]))
        .defined(d => d.time);

    // Draw lines for both metrics
    genders.forEach(gender => {
        const color = gender === 'f' ? '#cc0066' : '#0066cc';
        const data = groupedData.get(gender);

        // Temperature line
        tempSvg.append("path")
            .datum(data)
            .attr("class", `line-${gender}`)
            .attr("d", lineGenerator(yTempScale, 'temperature'))
            .attr("stroke", color)
            .attr("fill", "none")
            .attr("clip-path", "url(#temp-clip)");

        // Activity line
        activitySvg.append("path")
            .datum(data)
            .attr("class", `line-${gender}`)
            .attr("d", lineGenerator(yActivityScale, 'activity'))
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
    .attr("class", "mouse-slider")
    .style("width", width + "px")
    .on("input", function() {
        const currentTime = +this.value;
        updateVisualization(currentTime);
    });

    // Value display setup
    const valueDisplay = d3.select("#value-display");
    genders.forEach(gender => {
        valueDisplay.append("div")
            .attr("class", "value-group")
            .attr("data-gender", gender)
            .html(`
                <h3>${gender === 'f' ? 'Female' : 'Male'}</h3>
                <div class="value-item" id="${gender}-temp">Temp: --</div>
                <div class="value-item" id="${gender}-activity">Activity: --</div>
            `);
    });

    // Add gender buttons functionality
    d3.selectAll(".gender-button")
        .on("click", function() {
            const gender = d3.select(this).attr("data-gender");
            selectedGender = gender;
            d3.selectAll(".gender-button").classed("active", false);
            d3.select(this).classed("active", true);
            updateGenderVisibility();
        });

    // Initial visibility update
    updateGenderVisibility();
    updateVisualization(timeExtent[0]);
}

function updateVisualization(currentTime) {
    // Find the exact time data point
    const currentData = mouseData.filter(d => d.time === currentTime);

    // Update value display
    currentData.forEach(d => {
        d3.select(`#${d.gender}-temp`)
            .text(`Temp: ${d.temperature.toFixed(2)}°C`);
        d3.select(`#${d.gender}-activity`)
            .text(`Activity: ${d.activity.toFixed(2)}`);
    });

    // Update clip paths
    const xPos = d3.scaleLinear()
        .domain(timeExtent)
        .range([margin.left, width - margin.right])(currentTime);

    d3.select("#temp-clip rect").attr("width", xPos);
    d3.select("#activity-clip rect").attr("width", xPos);
}

function updateGenderVisibility() {
    // Update line visibility
    d3.selectAll(".line-m, .line-f")
        .style("opacity", function() {
            const genderClass = d3.select(this).attr("class");
            const gender = genderClass.split("-")[1];
            return selectedGender === "all" || gender === selectedGender ? 1 : 0;
        });

    // Update value display visibility
    d3.selectAll(".value-group")
        .style("display", function() {
            const gender = d3.select(this).attr("data-gender");
            return selectedGender === "all" || gender === selectedGender ? "block" : "none";
        });
}
