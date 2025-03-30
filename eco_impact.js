import { matchCategory } from './category_matcher.js';

// Function to extract weight in kg
function parseWeight(quantity) {
    if (!quantity) return 1; // Default to 1 kg if missing

    const match = quantity.match(/([\d.]+)\s*(g|kg)/i);
    if (!match) return 1; // Default if format is unexpected

    let weight = parseFloat(match[1]);
    if (match[2].toLowerCase() === "g") {
        weight /= 1000; // Convert grams to kg
    }
    console.log("Weight:", weight); // Debugging
    return weight;
}

// Function to Calculate Eco-Impact Score
async function calculateEcoImpact(product) {
    console.log("Product Data:", product); // Debugging

    const { categories = "", quantity, origins, manufacturingPlace } = product;

    // Match the most relevant category
    const category = matchCategory(categories.toString().toLowerCase());

    // Fetch CO2 emissions data
    const co2EmissionsData = await fetchCO2Emissions();
    
    const maxEmission = Math.max(...Object.values(co2EmissionsData));
    const minEmission = Math.min(...Object.values(co2EmissionsData));

    // Get CO2 emissions per kg (fallback to default if unknown)
    const co2EmissionPerKg = co2EmissionsData[category] ?? 1.0;

    // Extract weight from quantity
    const weightKg = parseWeight(quantity);

    // Calculate total CO2 emissions for the package
    const totalCo2Emission = co2EmissionPerKg * weightKg;

    // Calculate the CO2 score from the product's CO2 emissions per kg (1 to 6 scale)
    const co2Score = ((co2EmissionPerKg - minEmission) / (maxEmission - minEmission)) * 5 + 1;

    // Determine country of production
    let country = Array.isArray(origins) ? origins[0] : origins || manufacturingPlace || "Unknown";

    console.log("Checking country:", country); // Debugging

    // Fetch transportation CO2 emissions data
    const co2TransportData = await fetchTransportCO2();
    
    const maxTransportEmission = Math.max(...Object.values(co2TransportData));
    const minTransportEmission = Math.min(...Object.values(co2TransportData));

    // Get CO2 emissions for transportation (fallback to default if unknown)
    const co2TransportPerKg = co2TransportData[country] ?? 1.0;

    // Calculate total CO2 emissions for transportation
    const totalCo2TransportEmission = co2TransportPerKg * weightKg;

    // Calculate the CO2 score from the transport CO2 emissions per kg (1 to 4 scale)
    const transportScore = ((co2TransportPerKg - minTransportEmission) / (maxTransportEmission - minTransportEmission)) * 3 + 1;

    // Calculate Total Eco-Impact Score
    const totalScore = co2Score + transportScore;

    console.log(`Final Score: ${totalScore} | Total CO2: ${totalCo2Emission} kg CO₂e | Transport CO2: ${totalCo2TransportEmission} kg CO₂e`);
    return {
        totalScore,
        totalCo2Emission,
        totalCo2TransportEmission,
        co2EmissionPerKg,
        co2TransportPerKg,
        co2Score,
        transportScore,
        weightKg
    };
}

async function fetchCO2Emissions() {
    try {
        const response = await fetch('co2_emissions.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch CO2 emissions data:', error);
        return {};
    }
}

async function fetchTransportCO2() {
    try {
        const response = await fetch('transportData.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch transportation CO2 emissions data:', error);
        return {};
    }
}

export { calculateEcoImpact };