let mouseData = [];
let timeExtent = [0, 0];
let selectedGender = "all";

const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;
const clickSound = new Audio("mouse-squeaking.mp3");


d3.json("mice.json")
    .then(data => {
        mouseData = data;
        timeExtent = d3.extent(mouseData, d => d.time);
        initVisualization();
    })
    .catch(error => console.error("Error Loading Data:", error));

function initVisualization() {
    const groupedData = d3.group(mouseData, d => d.gender);
    const genders = ["m", "f"];

    genders.forEach(gender => {
        groupedData.set(
            gender, 
            d3.sort(groupedData.get(gender), (a, b) => a.time - b.time)
        );
    });

    const xScale = d3.scaleLinear()
        .domain(timeExtent)
        .range([margin.left, width - margin.right]);

    const daysTickValues = [];
    const totalDays = Math.ceil(timeExtent[1] / 1440);
    for (let i = 0; i <= totalDays; i++) {
        daysTickValues.push(i * 1440);
    }

    const xAxis = d3.axisBottom(xScale)
        .tickValues(daysTickValues)
        .tickFormat(d => (d / 1440).toFixed(1));

    const yTempScale = d3.scaleLinear()
        .domain([
            Math.min(...mouseData.map(d => d.temperature)),
            Math.max(...mouseData.map(d => d.temperature))
        ])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const yActivityScale = d3.scaleLinear()
        .domain([
            Math.min(...mouseData.map(d => d.activity)),
            Math.max(...mouseData.map(d => d.activity))
        ])
        .nice()
        .range([height - margin.bottom, margin.top]);

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

    const yTempAxis = d3.axisLeft(yTempScale);
    const yActivityAxis = d3.axisLeft(yActivityScale);

    const createClipPath = (svg, id) => {
        svg.append("defs")
            .append("clipPath")
            .attr("id", id)
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", xScale(0))
            .attr("height", height);
    };

    [tempSvg, activitySvg].forEach((svg, i) => {
        
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(xAxis);
        
        
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(i === 0 ? yTempAxis : yActivityAxis);

        
        svg.append("text")
            .attr("transform", i === 0 
                ? `translate(${margin.left - 40},${height/2 + 55}) rotate(-90)`
                : `translate(${margin.left - 35},${height/2 + 50}) rotate(-90)`)
            .text(i === 0 ? "Temperature (°C)" : "Activity Level");

        
        svg.append("text")
            .attr("transform", `translate(${margin.left + 240},${height/2 + 90})`)
            .text("Time (in Days)");

        createClipPath(svg, i === 0 ? "temp-clip" : "activity-clip");
    });

    addDarkLightLines(tempSvg, xScale, margin, height);
    addDarkLightLines(activitySvg, xScale, margin, height);

    addShadedSections(tempSvg, xScale, margin, height);
    addShadedSections(activitySvg, xScale, margin, height);

    const lineGenerator = (yScale, metric) => d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d[metric]))
        .defined(d => d.time);

    genders.forEach(gender => {
        const color = gender === 'f' ? '#cc0066' : '#0066cc';
        const data = groupedData.get(gender);

        tempSvg.append("path")
            .datum(data)
            .attr("class", `line-${gender}`)
            .attr("d", lineGenerator(yTempScale, 'temperature'))
            .attr("stroke", color)
            .attr("fill", "none")
            .attr("clip-path", "url(#temp-clip)");

        activitySvg.append("path")
            .datum(data)
            .attr("class", `line-${gender}`)
            .attr("d", lineGenerator(yActivityScale, 'activity'))
            .attr("stroke", color)
            .attr("fill", "none")
            .attr("clip-path", "url(#activity-clip)");
    });

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

    const volume = d3.select("#volume-container")
        .append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 1)
        .attr("step", 0.01)
        .attr("value", 1)
        .attr("id", "volume")
        .on("input", function() {
            clickSound.volume = +this.value;
    });


    d3.selectAll(".gender-button")
        .on("click", function() {
            const gender = d3.select(this).attr("data-gender");
            selectedGender = gender;
            clickSound.play();
            d3.selectAll(".gender-button").classed("active", false);
            d3.select(this).classed("active", true);
            updateGenderVisibility();
        });
    

    updateGenderVisibility();
    updateVisualization(timeExtent[0]);
}



function createSVG(selector, config) {
    return d3.select(selector)
        .append("svg")
        .attr("width", config.width)
        .attr("height", config.height)
        .classed(config.class, true)
        .style("background-color", config.styles.backgroundColor)
        .style("border-radius", config.styles.borderRadius)
        .style("box-shadow", config.styles.boxShadow);
}

function drawLine(svg, data, lineGenerator, gender, clipPathId) {
    svg.append("path")
        .datum(data)
        .attr("class", `line-${gender}`)
        .attr("d", lineGenerator)
        .attr("stroke", gender === 'f' ? '#cc0066' : '#0066cc')
        .attr("fill", "none")
        .attr("clip-path", `url(#${clipPathId})`);
}

function createSlider(timeExtent, width) {
    return d3.select("#slider-container")
        .append("input")
        .attr("type", "range")
        .attr("min", timeExtent[0])
        .attr("max", timeExtent[1])
        .attr("value", timeExtent[0])
        .attr("class", "mouse-slider")
        .style("width", width + "px")
        .on("input", function() {
            updateVisualization(+this.value);
        });
}

function createValueDisplay(genders) {
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
}

function setupGenderButtons() {
    d3.selectAll(".gender-button")
        .on("click", function() {
            const gender = d3.select(this).attr("data-gender");
            selectedGender = gender;
            clickSound.play();
            d3.selectAll(".gender-button").classed("active", false);
            d3.select(this).classed("active", true);
            updateGenderVisibility();
        });
}

function updateVisualization(currentTime) {
    const currentData = mouseData.filter(d => d.time === currentTime);

    currentData.forEach(d => {
        d3.select(`#${d.gender}-temp`)
            .text(`Temp: ${d.temperature.toFixed(2)}°C`);
        d3.select(`#${d.gender}-activity`)
            .text(`Activity: ${d.activity.toFixed(2)}`);
    });


    const xPos = d3.scaleLinear()
        .domain(timeExtent)
        .range([margin.left, width - margin.right])(currentTime);

    d3.select("#temp-clip rect").attr("width", xPos);
    d3.select("#activity-clip rect").attr("width", xPos);
}

function updateGenderVisibility() {
    d3.selectAll(".line-m, .line-f")
        .style("opacity", function() {
            const genderClass = d3.select(this).attr("class");
            const gender = genderClass.split("-")[1];
            return selectedGender === "all" || gender === selectedGender ? 1 : 0;
        });

    d3.selectAll(".value-group")
        .style("display", function() {
            const gender = d3.select(this).attr("data-gender");
            return selectedGender === "all" || gender === selectedGender ? "block" : "none";
        });
}

function addDarkLightLines(svg, xScale, margin, height) {
    const totalTime = timeExtent[1]; // Total time in minutes
    for (let time = 0; time <= totalTime; time += 720) { // Every 12 hours (720 minutes)
        const xPos = xScale(time); // Calculate x-position
        svg.append("line")
            .attr("x1", xPos)
            .attr("y1", margin.top)
            .attr("x2", xPos)
            .attr("y2", height - margin.bottom)
            .attr("stroke", "#ccc") // Light gray color
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2,2"); // Dashed line
    }
}

function addShadedSections(svg, xScale, margin, height) {
    const totalTime = timeExtent[1]; // Total time in minutes
    for (let time = 0; time < totalTime; time += 1440) { // Every 24 hours (1440 minutes)
        const start = xScale(time); // Start of the shaded section
        const end = xScale(time + 720); // End of the shaded section (12 hours later)
        svg.append("rect")
            .attr("x", start)
            .attr("y", margin.top)
            .attr("width", end - start)
            .attr("height", height - margin.bottom - margin.top)
            .attr("fill", "rgba(0, 0, 0, 0.05)") // Light gray shading
            .attr("stroke", "none");
    }
}
