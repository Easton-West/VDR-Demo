let database = null;

async function loadDatabase() {
    const response = await fetch("/data/vehicles.json");

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} while loading vehicles.json`
        );
    }

    database = await response.json();
}

/*
    Converts anything into searchable text.
*/
function searchable(value) {
    return String(value).toLowerCase();
}

/*
    Escapes HTML so database content
    cannot accidentally become HTML.
*/
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/*
    Highlights every occurrence of
    the search term.
*/
function highlightKeyword(text, keyword) {
    const safeText = escapeHtml(text);

    if (!keyword) {
        return safeText;
    }

    const escapedKeyword = keyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const expression = new RegExp(
        `(${escapedKeyword})`,
        "gi"
    );

    return safeText.replace(
        expression,
        "<strong>$1</strong>"
    );
}

/*
    Recursively searches an object.

    This means future fields added to
    vehicles.json will automatically
    become searchable.
*/
function searchObject(
    value,
    keyword,
    path,
    recordUrl,
    results,
    sectionName = "DATABASE",
    displayPath = path
) {
    if (value === null || value === undefined) {
        return;
    }

    /*
        Primitive value
    */
    if (typeof value !== "object") {
        const text = String(value);

        if (searchable(text).includes(keyword)) {
            results.push({
                path: displayPath,
                recordUrl,
                section: sectionName,
                label: path.split(" / ").pop(),
                value: text
            });
        }

        return;
    }

    /*
        Arrays
    */
    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            /*
                Special handling for noise rows.

                Instead of returning:

                NOISES PRODUCED / 001 / frequency

                we return:

                001    A/C    1250 Hz
            */
            if (
                sectionName === "NOISES PRODUCED" &&
                item &&
                typeof item === "object"
            ) {
                const source = String(item.source || "");
                const frequency = String(item.frequency || "");
                const harmonics = String(item.harmonics || "");
                const notes = String(item.notes || "");

                const rowText = `${source}    ${frequency}`;

                const rowMatches = searchable(rowText).includes(keyword);
                const sourceMatches = searchable(source).includes(keyword);
                const frequencyMatches = searchable(frequency).includes(keyword);
                const harmonicsMatches = searchable(harmonics).includes(keyword);
                const notesMatches = searchable(notes).includes(keyword);

                if (
                    rowMatches ||
                    sourceMatches ||
                    frequencyMatches ||
                    harmonicsMatches ||
                    notesMatches
                ) {
                    results.push({
                        path: displayPath,
                        recordUrl,
                        section: sectionName,
                        source,
                        frequency,
                        harmonics,
                        notes,
                        isNoise: true
                    });
                }

                return;
            }

            searchObject(
                item,
                keyword,
                `${path} / ${String(index + 1).padStart(3, "0")}`,
                recordUrl,
                results,
                sectionName,
                displayPath
            );
        });

        return;
    }

    /*
        Objects
    */
    Object.entries(value).forEach(([key, child]) => {
        /*
            Section names and field names
            are searchable.
        */
        if (searchable(key).includes(keyword)) {
            results.push({
                path: displayPath,
                recordUrl,
                section: sectionName,
                label: key,
                value:
                    typeof child === "object"
                        ? "[FIELD]"
                        : String(child)
            });
        }

        /*
            If this is a top-level object
            such as POWERTRAIN, use its
            name as the display section.
        */
        let childSection = sectionName;

        if (path === displayPath) {
            childSection = "IDENTIFICATION";
        }

        if (path.endsWith(" / sections")) {
            childSection = key;
        }

        if (
            path === displayPath &&
            key === "NOISES PRODUCED"
        ) {
            childSection = "NOISES PRODUCED";
        }

        searchObject(
            child,
            keyword,
            `${path} / ${key}`,
            recordUrl,
            results,
            childSection,
            displayPath
        );
    });
}

/*
    Search the vehicle database.
*/
function searchDatabase(keyword, scope) {
    const results = [];

    const searchTerm = keyword
        .trim()
        .toLowerCase();

    if (!searchTerm) {
        return results;
    }

    const categories =
        scope === "global"
            ? Object.keys(database)
            : [scope];

    categories.forEach(category => {
        const groups = database[category] || [];

        groups.forEach(group => {
            group.models.forEach(model => {
                const path =
                    `${category.toUpperCase()} / ` +
                    `${group.manufacturer.toUpperCase()} / ` +
                    `${model.name.toUpperCase()}`;

                const recordUrl =
                    `vehicle.html?id=${encodeURIComponent(model.id)}&type=${category}`;

                /*
                    Search manufacturer
                    and the entire model record.
                */
                searchObject(
                    model,
                    searchTerm,
                    path,
                    recordUrl,
                    results
                );

                /*
                    Manufacturer isn't inside
                    the model object, so search it
                    separately.
                */
                if (
                    searchable(group.manufacturer)
                        .includes(searchTerm)
                ) {
                    results.push({
                        path,
                        recordUrl,
                        section: "IDENTIFICATION",
                        label: "MANUFACTURER",
                        value: group.manufacturer
                    });
                }

                /*
                    Category itself is searchable.
                */
                if (
                    searchable(category)
                        .includes(searchTerm)
                ) {
                    results.push({
                        path,
                        recordUrl,
                        section: "DATABASE",
                        label: "CATEGORY",
                        value: category
                    });
                }
            });
        });
    });

    return results;
}

/*
    Display the search results.
*/
function renderResults(results, keyword) {
    const root =
        document.getElementById("searchResults");

    const summary =
        document.getElementById("searchSummary");

    root.innerHTML = "";

    if (results.length === 0) {
        summary.textContent =
            `NO MATCHES FOR "${keyword.toUpperCase()}"`;

        root.innerHTML = `
            <div class="search-empty">
                NO MATCHING RECORDS FOUND.
            </div>
        `;

        return;
    }

    summary.textContent =
        `${String(results.length).padStart(3, "0")} MATCHES FOUND`;

    results.forEach(result => {
        const article =
            document.createElement("article");

        article.className = "search-result";

        article.innerHTML = `
            <a
                class="search-result-path"
                href="${result.recordUrl}"
            >
                ${escapeHtml(result.path)}
            </a>

            <div class="search-result-section">
                ${highlightKeyword(
                    result.section,
                    keyword
                )}
            </div>

            ${
                result.isNoise
                    ? `
                        <table class="noise-table">
                            <thead>
                                <tr>
                                    <th>SOURCE</th>
                                    <th>FREQUENCY</th>
                                    <th>HARMONICS</th>
                                    <th>NOTES</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>
                                        ${highlightKeyword(
                                            result.source,
                                            keyword
                                        )}
                                    </td>

                                    <td class="noise-frequency">
                                        ${highlightKeyword(
                                            result.frequency,
                                            keyword
                                        )}
                                    </td>

                                    <td>
                                        ${highlightKeyword(
                                            result.harmonics,
                                            keyword
                                        )}
                                    </td>

                                    <td>
                                        ${highlightKeyword(
                                            result.notes,
                                            keyword
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    `
                    : `
                        <div class="search-result-data">
                            <span class="search-result-label">
                                ${highlightKeyword(
                                    result.label,
                                    keyword
                                )}
                            </span>

                            <span class="search-result-value">
                                ${highlightKeyword(
                                    result.value,
                                    keyword
                                )}
                            </span>
                        </div>
                    `
            }
        `;

        root.appendChild(article);
    });
}

/*
    Perform a search.
*/
function performSearch() {
    const input =
        document.getElementById("searchInput");

    const scope =
        document.getElementById("searchScope").value;

    const keyword =
        input.value.trim();

    if (!keyword) {
        document.getElementById(
            "searchSummary"
        ).textContent =
            "ENTER A SEARCH TERM";

        document.getElementById(
            "searchResults"
        ).innerHTML = "";

        return;
    }

    const results =
        searchDatabase(
            keyword,
            scope
        );

    renderResults(
        results,
        keyword
    );
}

/*
    Start the search page.
*/
document.addEventListener(
    "DOMContentLoaded",
    async () => {
        try {
            await loadDatabase();

            const params =
                new URLSearchParams(
                    window.location.search
                );

            const query =
                params.get("q");

            const scope =
                params.get("scope");

            const searchScope =
                document.getElementById("searchScope");

            searchScope.innerHTML = `
                <option value="global">GLOBAL</option>
            `;

            Object.keys(database).forEach(category => {
                const option =
                    document.createElement("option");

                option.value = category;
                option.textContent =
                    category.toUpperCase();

                searchScope.appendChild(option);
            });

            if (scope) {
                searchScope.value = scope;
            }

            if (query) {
                document.getElementById(
                    "searchInput"
                ).value = query;

                performSearch();
            }

            document.getElementById(
                "searchButton"
            ).addEventListener(
                "click",
                performSearch
            );

            document.getElementById(
                "searchInput"
            ).addEventListener(
                "keydown",
                event => {
                    if (event.key === "Enter") {
                        performSearch();
                    }
                }
            );
        } catch (error) {
            console.error(
                "Search database error:",
                error
            );

            document.getElementById(
                "searchResults"
            ).textContent =
                "DATABASE ERROR: " +
                error.message;
        }
    }
);