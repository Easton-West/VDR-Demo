async function loadCategories() {
    const response = await fetch("/data/vehicles.json");

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} while loading vehicles.json`
        );
    }

    const data = await response.json();

    const categoryGrid =
        document.getElementById("categoryGrid");

    const categories = Object.keys(data);

    categories.forEach((category, index) => {
        const card = document.createElement("a");
        card.className = "category-card";
        card.href = `vehicles.html?type=${encodeURIComponent(category)}`;

        card.innerHTML = `
            <div class="card-index">
                ${String(index + 1).padStart(2, "0")}
            </div>

            <div class="card-icon">
                ◈
            </div>

            <h2>
                ${category.toUpperCase()}
            </h2>

            <p>
                Vehicle records and related
                parametric data.
            </p>

            <span class="enter">
                ACCESS DATABASE →
            </span>
        `;

        categoryGrid.appendChild(card);
    });
}


document.addEventListener("DOMContentLoaded", () => {

    const searchForm =
        document.getElementById("globalSearchForm");

    const searchInput =
        document.getElementById("globalSearchInput");


    searchForm.addEventListener("submit", event => {

        event.preventDefault();


        const query =
            searchInput.value.trim();


        if (!query) {
            return;
        }


        window.location.href =
            `search.html?q=${encodeURIComponent(query)}&scope=global`;

    });

    loadCategories().catch(error => {
        console.error(
            "Vehicle database error:",
            error
        );
    });

});