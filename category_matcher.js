let knownCategories = null;

// Async function to load categories from JSON
async function loadCategories() {
    if (!knownCategories) {
        const response = await fetch('./categories.json');
        knownCategories = await response.json();
        console.log("Categories loaded:", knownCategories);  // Debugging
    }
}

// Function to Match Categories
async function matchCategory(providedCategories) {
    if (!knownCategories) return "default";  // If categories are not loaded yet, return default

    const categoriesArray = providedCategories
        .split(",")
        .map(cat => cat.trim().toLowerCase());

    let matchedCategory = "default";
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(knownCategories)) {
        const matches = keywords.reduce((count, keyword) => {
            return categoriesArray.includes(keyword.toLowerCase()) ? count + 1 : count;
        }, 0);

        if (matches > maxMatches) {
            maxMatches = matches;
            matchedCategory = category;
        }
    }

    console.log("Matched Category:", matchedCategory);
    return matchedCategory;
}

// Export both loadCategories and matchCategory
export { loadCategories, matchCategory };
