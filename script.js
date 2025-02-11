let mouseData = [];

d3.json("mouse_data.json").then(data => {
    mouseData = data;
    console.log("Loaded the data.", mouseData.slice(0, 10));
}).catch(error => console.error("Error loading the data.", error));

function filterDataByGender(gender) {
    return mouseData.filter(d => {
        if (gender === "female") {
            return d.mouse_id.startsWith("f");
        } else if (gender === "male") {
            return d.mouse_id.startsWith("m");
        }
        return false;
    });
}

console.log("Sample mouse IDs:", mouseData.map(d => d.mouse_id).slice(0, 10));