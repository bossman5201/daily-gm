async function testHeatmap() {
    try {
        const address = "0xbd14b65E9c6E767F02D19008942946b75fc78a7c";
        const url = `http://localhost:3000/api/stats?type=heatmap&address=${address}`;
        console.log(`Fetching from: ${url}`);

        const res = await fetch(url);
        if (!res.ok) {
            console.error(`HTTP Error: ${res.status}`);
            return;
        }

        const data = await res.json();
        console.log("Response Data:");
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Test Failed:", err);
    }
}
testHeatmap();
