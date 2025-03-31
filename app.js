import { loadCategories, matchCategory } from './category_matcher.js';
import { calculateEcoImpact } from './eco_impact.js';

const categoryDescriptions = {
    "kött": "Köttproduktion har en stor påverkan på miljön, inklusive hög vattenförbrukning och utsläpp av växthusgaser.",
    "fisk": "Fiskodling och fiske kan påverka havsmiljön och ekosystemen negativt.",
    "mejeri": "Mejeriprodukter bidrar till utsläpp av växthusgaser och kräver mycket energi och vatten.",
    "ris": "Risproduktion kräver mycket vatten och kan leda till utsläpp av metan, en potent växthusgas.",
    "ägg": "Äggproduktion har en mindre miljöpåverkan jämfört med kött, men kräver ändå resurser och energi.",
    "övrigt": "Övriga livsmedel har varierande miljöpåverkan beroende på produktion och transport."
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    if (category) {
        document.getElementById('categoryMessage').textContent = `Scanna två olika produkter inom ${category}`;
        document.getElementById('categoryDescription').textContent = categoryDescriptions[category] || "";
    }
});

// DOM Elements
const scanButton = document.getElementById('scanButton');
const video = document.getElementById('video');
const result = document.getElementById('result');
const loading = document.getElementById('loading');
const productInfo = document.getElementById('productInfo');
const comparisonContainer = document.getElementById('comparisonContainer');
const guideBox = document.querySelector('.guide-box');

let scannedBarcodes = [];
let scannedProducts = [];
let stream;

// Attach Event Listener to Scan Button
scanButton.addEventListener('click', () => {
    if (scannedBarcodes.length < 2) {
        openCamera();
    } else {
        resetScanner(); // Reset after scanning two products
    }
});

// Handle tab focus and blur events
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && stream) {
        video.srcObject = stream;
        video.hidden = false;
        guideBox.hidden = false;
    } else if (document.visibilityState === 'hidden') {
        video.hidden = true;
        guideBox.hidden = true;
    }
});

// Initialize Quagga for scanning
async function openCamera() {
    try {
        loading.hidden = false;
        result.textContent = 'Initializing camera...';
        console.log('Initializing camera...');

        // Request permission for video and audio capture
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: { exact: "environment" }, // Use rear camera
                width: { ideal: 1280 }, // Set ideal resolution
                height: { ideal: 720 }  // Set ideal resolution
            },
            audio: true // Request microphone access
        });

        video.srcObject = stream;
        video.hidden = false;
        guideBox.hidden = false;
        console.log('Camera stream started');

        // Initialize Quagga for barcode scanning
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: video,
                constraints: {
                    facingMode: { exact: "environment" }, // Use rear camera
                },
            },
            decoder: {
                readers: ["ean_reader", "code_128_reader", "upc_reader"],
            },
        }, (err) => {
            if (err) {
                console.error('Error initializing Quagga:', err);
                result.textContent = 'Failed to initialize barcode scanner.';
                loading.hidden = true;
                return;
            }

            Quagga.start();
            result.textContent = 'Scanning...';
            console.log('Quagga initialized');

            Quagga.onDetected((data) => {
                const barcode = data.codeResult.code;
                console.log('Barcode detected:', barcode);

                if (scannedBarcodes.includes(barcode)) {
                    result.textContent = `Barcode ${barcode} already scanned. Scan a different product.`;
                    return;
                }

                // Add the scanned barcode to the list
                scannedBarcodes.push(barcode);
                result.textContent = `Scanned barcode: ${barcode}`;

                // Fetch product info after scanning the barcode
                fetchProductInfo(barcode);

                // Delay before scanning the next barcode
                if (scannedBarcodes.length === 2) {
                    // If two barcodes are scanned, stop Quagga and close the camera after 1 second
                    setTimeout(() => {
                        Quagga.stop();
                        closeCamera();
                    }, 1000); // 1000 milliseconds = 1 second delay
                }
            });

            loading.hidden = true;
        });

    } catch (err) {
        console.error('Error accessing the camera:', err);
        result.textContent = 'Please allow camera access to scan barcodes.';
        loading.hidden = true;
    }
}

// Close Camera
function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    video.hidden = true;
    guideBox.hidden = true;
    console.log('Camera stream stopped');
}

// Fetch Product Info
async function fetchProductInfo(barcode) {
    try {
        loading.hidden = false;
        result.textContent = 'Fetching product info...';
        console.log('Fetching product info for barcode:', barcode);

        const response = await fetch('http://127.0.0.1:8080/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode }),
        });

        const data = await response.json();

        if (response.ok) {
            if (!data.product_info) {
                result.textContent = 'No product info found.';
                return;
            }
            console.log('Categories from API:', data.product_info.categories);

            // Ensure categories are loaded before matching
            await loadCategories();  // Wait for categories to load

            // Match the categories
            const matchedCategory = await matchCategory(data.product_info.categories.toString().toLowerCase()); // Use await here to resolve the promise

            scannedProducts.push({
                barcode: barcode,
                name: data.product_info.name || 'No name available',
                genericName: data.product_info.generic_name || 'No generic name available',
                quantity: data.product_info.quantity || 'No quantity available',
                packaging: data.product_info.packaging || 'No packaging info',
                matchedCategory: matchedCategory || 'No category matched', // Use the resolved category
                labels: data.product_info.labels || 'No labels available',
                origins: data.product_info.origins || 'No origin information',
                manufacturingPlace: data.product_info.manufacturing_place || 'No manufacturing place info',
                ecoScore: data.product_info.ecoscore_grade || 'No eco-score available',
                image: data.product_info.image || '',
            });

            if (scannedProducts.length === 2) {
                displayComparison();
            }
        } else {
            result.textContent = `Error: ${data.error}`;
        }
    } catch (err) {
        console.error('Error fetching product info:', err);
        result.textContent = 'Failed to fetch product info.';
    } finally {
        loading.hidden = true;
    }
}

// Display Comparison of Two Products
async function displayComparison() {
    productInfo.style.display = 'block';
    comparisonContainer.innerHTML = '';

    // Ensure you await the eco-impact calculation for both products
    const ecoImpactPromises = scannedProducts.map(async (product) => {
        const {
            totalScore,
            totalCo2Emission,
            co2EmissionPerKg,
            weightKg
        } = await calculateEcoImpact(product);

        return {
            product,
            totalScore,
            totalCo2Emission,
            co2EmissionPerKg,
            weightKg
        };
    });

    // Wait for all the eco-impact calculations to resolve
    const ecoImpactData = await Promise.all(ecoImpactPromises);

    // Find the product with the lowest and highest eco-impact score
    const minScore = Math.min(...ecoImpactData.map(data => data.totalScore));
    const maxScore = Math.max(...ecoImpactData.map(data => data.totalScore));

    ecoImpactData.forEach((ecoData) => {
        const { product, totalScore, totalCo2Emission, co2EmissionPerKg, weightKg } = ecoData;

        const productCard = document.createElement('div');
        productCard.classList.add('product-card');

        // Apply green or red border based on eco-impact score
        if (totalScore === minScore) {
            productCard.classList.add('low-impact');
        } else if ( totalScore === maxScore) {
            productCard.classList.add('high-impact');
        }

        // Display the product details and eco-impact scores
        productCard.innerHTML = `
            <p><strong>Name:</strong> ${product.name}</p>
            <p><strong>Matched category:</strong> ${product.matchedCategory}</p>
            <p><strong>Quantity:</strong> ${product.quantity}</p>
            <p><strong>Origins:</strong> ${product.origins}</p>

            <p><strong>Eco-Impact Score:</strong> ${totalScore.toFixed(2)}</p>
            <p><strong>Total CO2 Emission:</strong> ${totalCo2Emission.toFixed(2)} kg CO₂e</p>
            <p><strong>CO2 Emission Per Kg:</strong> ${co2EmissionPerKg.toFixed(2)} kg CO₂e</p>
            <img src="${product.image}" alt="Product Image">
        `;

        // Add the card to the container
        comparisonContainer.appendChild(productCard);
    });

    result.textContent = 'Comparison displayed below.';
}

// Reset the Scanner
function resetScanner() {
    scannedBarcodes = [];
    scannedProducts = [];
    comparisonContainer.innerHTML = '';
    productInfo.style.display = 'none';
    result.textContent = 'Scan a new product.';
}
