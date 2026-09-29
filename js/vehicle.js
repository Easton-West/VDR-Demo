async function loadVehicle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const type = params.get("type");

    const response = await fetch("data/vehicles.json");

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} while loading vehicles.json`
        );
    }

    const data = await response.json();

    let found = null;
    let manufacturer = "";

    for (const group of data[type] || []) {
        const match = group.models.find(
            model => model.id === id
        );

        if (match) {
            found = match;
            manufacturer = group.manufacturer;
            break;
        }
    }

    if (!found) {
        document.getElementById("record").innerHTML = `
            <div class="record">
                <div class="data-section">
                    RECORD NOT FOUND.
                </div>
            </div>
        `;
        return;
    }

    document.title = `VDR // ${manufacturer} ${found.name}`;

    document.getElementById("breadcrumbModel").textContent =
        found.name.toUpperCase();

    const categoryLink =
        document.getElementById("categoryLink");

    categoryLink.href = `vehicles.html?type=${type}`;
    categoryLink.textContent = type.toUpperCase();

	const recordBackLink =
		document.getElementById("recordBackLink");

	recordBackLink.href =
		`vehicles.html?type=${type}`;

	recordBackLink.textContent =
		`← BACK TO ${type.toUpperCase()}`;
		
    let html = `
        <div class="record">
            <div class="record-head">
                <div>
                    <div class="eyebrow">
                        VEHICLE RECORD // ${found.id.toUpperCase()}
                    </div>

                    <h1>
                        ${manufacturer} ${found.name}
                    </h1>
                </div>

                <div class="record-meta">
                    <div class="back-button">
                        <a href="vehicles.html?type=${type}">
                            ← BACK TO ${manufacturer.toUpperCase()}
                        </a>
                    </div>

                    RECORD STATUS:
                    <strong>ACTIVE</strong>

                    <br>

					IN SERVICE:
					<strong>${found.year}</strong>

                    <br>

					VEHICLE TYPE:
					<strong>${found.type.toUpperCase()}</strong>
                </div>
            </div>
    `;

    /*
     * STANDARD PARAMETER SECTIONS
     */

const sectionOrder = [
    "GENERAL",
    "POWERTRAIN",
    "SENSORS"
];

const sections = Object.entries(found.sections).sort(
    ([sectionA], [sectionB]) => {
        const indexA = sectionOrder.indexOf(sectionA);
        const indexB = sectionOrder.indexOf(sectionB);

        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;

        return orderA - orderB;
    }
);

	for (const [section, parameters] of sections) {
		html += `
			<div class="data-section">
				<div class="section-title">
					${section}
				</div>
		`;

		if (Object.keys(parameters).length === 0) {
			html += `
				<div class="section-empty">
					NO DATA AVAILABLE
				</div>
			`;
		} else {
			html += `
				<div class="param-grid">
			`;

			for (const [key, value] of Object.entries(parameters)) {
				html += `
					<div class="param">
						<label>${key}</label>
						<value>${value}</value>
					</div>
				`;
			}

			html += `
				</div>
			`;
		}

		html += `
			</div>
		`;
	}

/*
 * NOISES PRODUCED
 */

    if (
        found["NOISES PRODUCED"] &&
        found["NOISES PRODUCED"].length > 0
    ) {
        const noises = found["NOISES PRODUCED"];

        html += `
            <div class="data-section">
                <div class="section-title">
                    NOISES PRODUCED //
                    ${String(noises.length).padStart(2, "0")}
                    FREQUENCIES
                </div>

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
        `;

        noises.forEach((noise, index) => {
            html += `
                <tr>
					<td>
						${noise.source}
					</td>

					<td class="noise-frequency">
						${noise.frequency}
					</td>

					<td>
						${noise.harmonics}
					</td>

					<td>
						${noise.notes || ""}
					</td>
				</tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    /*
     * IMAGERY
     */

    html += `
        <div class="data-section">
            <div class="section-title">
                IMAGERY //
                ${String(found.images.length).padStart(2, "0")}
                FILES
            </div>

            <div class="image-grid">
    `;

	found.images.forEach((image, index) => {
		const imageContent = image.file
			? `
				<img
					src="${image.file}"
					alt="${image.name}"
					onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
				>
				<div
					class="image-placeholder"
					style="display: none;"
				>
					▧
				</div>
			`
			: `
				<div class="image-placeholder">
					▧
				</div>
			`;

		html += `
			<a
				class="image-link"
				href="${image.file || "#"}"
				target="_blank"
				data-image="${image.file || ""}"
				data-name="${image.name}"
				data-comment="${image.comment || ""}"
				onclick="if (!event.ctrlKey && !event.metaKey) openImage(event, this)"
			>
				${imageContent}

				<span>
					${image.name.toUpperCase()}
					//
					IMG-${String(index + 1).padStart(3, "0")}
				</span>
			</a>
		`;
	});

    html += `
            </div>
        </div>
        </div>

        <div
            id="imageModal"
            class="modal"
            onclick="closeImage()"
        >
            <div
                class="modal-box"
                onclick="event.stopPropagation()"
            >
                <div class="modal-head">
                    <span id="modalTitle">
                        IMAGE
                    </span>

                    <button onclick="closeImage()">
                        [ CLOSE ]
                    </button>
                </div>

                <div
                    class="modal-body"
                    id="modalBody"
                ></div>
            </div>
        </div>
    `;

    document.getElementById("record").innerHTML = html;
}

function openImage(event, element) {
    event.preventDefault();

    const file = element.dataset.image;
    const name = element.dataset.name;
	const comment = element.dataset.comment;

    document.getElementById("modalTitle").textContent =
        `IMAGERY // ${name.toUpperCase()}`;

	if (file) {
		document.getElementById("modalBody").innerHTML = `
			<img
				src="${file}"
				alt="${name}"
			>

			${
				comment
					? `
						<div class="image-comment">
							${comment}
						</div>
					`
					: ""
			}
		`;
	} else {
		document.getElementById("modalBody").innerHTML = `
			<div>
				IMAGE PLACEHOLDER

				<br>
				<br>

				<small>
					ADD AN IMAGE FILE
					TO THE VEHICLE RECORD JSON.
				</small>

				${
					comment
						? `
							<div class="image-comment">
								${comment}
							</div>
						`
						: ""
				}
			</div>
		`;
	}

    document.getElementById("imageModal").classList.add("open");
}

function closeImage() {
    document.getElementById("imageModal").classList.remove("open");
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeImage();
    }
});

loadVehicle().catch(error => {
    console.error(
        "Vehicle database error:",
        error
    );

    document.getElementById("record").innerHTML = `
        <div class="record">
            <div class="data-section">
                DATABASE ERROR:
                ${error.message}
            </div>
        </div>
    `;
});
