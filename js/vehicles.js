async function loadVehicles() {

    const params =
        new URLSearchParams(
            window.location.search
        );


	const type = params.get("type");

	if (!type) {
		throw new Error("No vehicle category specified.");
	}

    const response =
        await fetch(
            "/data/vehicles.json"
        );


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status} while loading vehicles.json`
        );

    }


    const data =
        await response.json();


    const groups =
        data[type] || [];


    document.getElementById(
        "pageTitle"
    ).textContent =
        type.toUpperCase();


    document.getElementById(
        "categoryLabel"
    ).textContent =
        type.toUpperCase();


    const total =
        groups.reduce(
            (number, group) =>
                number + group.models.length,
            0
        );


    document.getElementById(
        "recordCount"
    ).textContent =
        `${String(total).padStart(3, "0")} RECORDS`;


    const root =
        document.getElementById(
            "manufacturerList"
        );


    root.innerHTML = "";


    /*
     * Render one manufacturer section.
     */

    groups.forEach(group => {

        const section =
            document.createElement(
                "section"
            );


        section.className =
            "manufacturer";


        /*
         * Manufacturer header
         */

        const header =
            document.createElement(
                "div"
            );


        header.className =
            "manufacturer-header";


        header.innerHTML = `

            <h2>
                ${group.manufacturer}
            </h2>

            <span>
                ${String(
                    group.models.length
                ).padStart(2, "0")}
                MODELS
            </span>

        `;


        section.appendChild(
            header
        );


        /*
         * Manufacturer-specific
         * sorting controls.
         */

        const controls =
            document.createElement(
                "div"
            );


        controls.className =
            "manufacturer-controls";


        controls.innerHTML = `

            <label>
                SORT BY
            </label>

            <select>

                <option value="name-asc">
                    NAME A → Z
                </option>

                <option value="name-desc">
                    NAME Z → A
                </option>

                <option value="type">
                    TYPE
                </option>

            </select>

        `;


        section.appendChild(
            controls
        );


        const sortSelect =
            controls.querySelector(
                "select"
            );


        /*
         * Model grid.
         */

        const grid =
            document.createElement(
                "div"
            );


        grid.className =
            "model-grid";


        section.appendChild(
            grid
        );


        /*
         * Render the models for
         * THIS manufacturer only.
         */

        function renderModels(sortMode) {

            grid.innerHTML = "";


            /*
             * Copy the array so we
             * don't modify the JSON data.
             */

            const models =
                [...group.models];


            /*
             * NAME A → Z
             */

            if (
                sortMode === "name-asc"
            ) {

                models.sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name
                        )
                );

            }


            /*
             * NAME Z → A
             */

            else if (
                sortMode === "name-desc"
            ) {

                models.sort(
                    (a, b) =>
                        b.name.localeCompare(
                            a.name
                        )
                );

            }


            /*
             * TYPE
             *
             * First sort by type,
             * then by model name.
             */

            else if (
                sortMode === "type"
            ) {

                models.sort(
                    (a, b) => {

                        const typeA =
                            (
                                a.type || ""
                            ).toLowerCase();


                        const typeB =
                            (
                                b.type || ""
                            ).toLowerCase();


                        const typeCompare =
                            typeA.localeCompare(
                                typeB
                            );


                        if (
                            typeCompare !== 0
                        ) {

                            return typeCompare;

                        }


                        return a.name.localeCompare(
                            b.name
                        );

                    }
                );

            }


            /*
             * Create model links.
             */

            models.forEach(model => {

                const link =
                    document.createElement(
                        "a"
                    );


                link.className =
                    "model-link";


                link.href =
                    `vehicle.html?id=${encodeURIComponent(model.id)}&type=${type}`;


                link.innerHTML = `

					${model.name}

					<span class="model-type">

						${(model.type || "UNCLASSIFIED").toUpperCase()}

					</span>

				`;


                grid.appendChild(
                    link
                );

            });

        }


        /*
         * Initial order.
         */

        renderModels(
            "name-asc"
        );


        /*
         * Only this manufacturer's
         * dropdown responds to this event.
         */

        sortSelect.addEventListener(
            "change",
            () => {

                renderModels(
                    sortSelect.value
                );

            }
        );


        root.appendChild(
            section
        );

    });

}

document.addEventListener("DOMContentLoaded", () => {

    const searchForm =
        document.getElementById("pageSearchForm");

    if (!searchForm) {
        return;
    }

    const params =
        new URLSearchParams(window.location.search);

    const currentType =
        params.get("type");

    const searchInput =
        document.getElementById("pageSearchInput");

    const searchScope =
        document.getElementById("pageSearchScope");

    searchForm.addEventListener("submit", event => {

        event.preventDefault();

        const query =
            searchInput.value.trim();

        if (!query) {
            return;
        }

        const scope =
            searchScope.value === "global"
                ? "global"
                : currentType;

        window.location.href =
            `search.html?q=${encodeURIComponent(query)}&scope=${encodeURIComponent(scope)}`;

    });

});

loadVehicles().catch(error => {

    console.error(
        "Vehicle database error:",
        error
    );


    const root =
        document.getElementById(
            "manufacturerList"
        );


    if (root) {

        root.textContent =
            "DATABASE ERROR: " +
            error.message;

    }

});