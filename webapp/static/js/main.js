let currentPage = 1;
let totalPages = 1;

function toggleDetails(rowId, dbsnpId) {
  const detailsRow = document.getElementById(`details-${rowId}`);
  const expandIcon = document.getElementById(`expand-icon-${rowId}`);
  const variantInfoContainer = document.getElementById(`variant-info-${rowId}`);

  if (detailsRow.classList.contains("hidden")) {
    detailsRow.classList.remove("hidden");
    expandIcon.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2l4 12 4-12z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `;

    if (dbsnpId !== "null" && !variantInfoContainer.dataset.loaded) {
      variantInfoContainer.innerHTML = `
        <div class="mt-4">
            <svg class="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>`;

      fetchEnsemblVariantData(dbsnpId)
        .then((data) => {
          variantInfoContainer.innerHTML = `
            <dl class="flex mt-4">
                <div class="w-full sm:w-[42%] min-w-[120px]">
                    <dt class="text-sm py-1 font-semibold text-gray-500">Most severe consequence:</dt>
                    <dd class="text-sm py-1">
                        ${data.consequence || "No consequence data"}
                    </dd>
                </div>
                <div class="w-full sm:w-[58%] min-w-[120px]">
                    <dt class="text-sm py-1 font-semibold text-gray-500">Clinical significance:</dt>
                    <dd class="text-sm py-1">
                        ${data.significance || "No significance data"}
                    </dd>
                </div>
            </dl>`;
          variantInfoContainer.dataset.loaded = "true";
        })
        .catch(() => {
          variantInfoContainer.innerHTML = `
            <div class="text-red-500 mt-4">Failed to fetch variant data</div>`;
        });
    }
  } else {
    detailsRow.classList.add("hidden");
    expandIcon.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2l12 4-12 4z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `;
  }
}

function updatePaginationButtons() {
  document.getElementById("prevButton").disabled = currentPage === 1;
  document.getElementById("nextButton").disabled = currentPage === totalPages;
  document.getElementById("prevButtonMobile").disabled = currentPage === 1;
  document.getElementById("nextButtonMobile").disabled =
    currentPage === totalPages;
}

function updatePaginationInfo(total, page, perPage) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  document.getElementById("paginationInfo").innerHTML =
    `Showing <span class="font-semibold">${start}</span> to <span class="font-semibold">${end}</span> of <span class="font-semibold">${total}</span> results`;
}

function updatePageNumbers(currentPage, totalPages) {
  const pageNumbers = document.getElementById("pageNumbers");
  pageNumbers.innerHTML = "";

  const maxPagesToShow = 3;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const commonButtonClasses =
    "relative inline-flex items-center justify-center w-10 px-7 py-2 text-sm font-semibold";
  const normalButtonClasses = `${commonButtonClasses} ring-1 ring-inset ring-gray-300 hover:bg-gray-50`;
  const activeButtonClasses = `${commonButtonClasses} bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-200 z-[2]`;
  const ellipsisClasses = `${commonButtonClasses} text-gray-500 bg-gray-50 ring-1 ring-inset ring-gray-300`;

  if (startPage > 1) {
    const firstButton = document.createElement("button");
    firstButton.className = normalButtonClasses;
    firstButton.textContent = "1";
    firstButton.onclick = () => fetchData(1);
    pageNumbers.appendChild(firstButton);

    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.className = ellipsisClasses;
      ellipsis.textContent = "...";
      pageNumbers.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement("button");
    button.className =
      i === currentPage ? activeButtonClasses : normalButtonClasses;
    button.textContent = i;
    button.onclick = () => fetchData(i);
    pageNumbers.appendChild(button);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.className = ellipsisClasses;
      ellipsis.textContent = "...";
      pageNumbers.appendChild(ellipsis);
    }

    const lastButton = document.createElement("button");
    lastButton.className = normalButtonClasses;
    lastButton.textContent = totalPages;
    lastButton.onclick = () => fetchData(totalPages);
    pageNumbers.appendChild(lastButton);
  }
}

async function fetchEnsemblVariantData(variantId) {
  const apiUrl = `https://rest.ensembl.org/variation/human/${variantId}?content-type=application/json`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const result = {
      consequence: "",
      significance: "",
    };

    if (data.most_severe_consequence) {
      result.consequence = data.most_severe_consequence
        .split("_")
        .map((word, index) =>
          index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
        )
        .join(" ");
    }

    if (data.clinical_significance && data.clinical_significance.length > 0) {
      result.significance = data.clinical_significance
        .map((sig) => sig.charAt(0).toUpperCase() + sig.slice(1))
        .sort()
        .join("/");
    }

    return result;
  } catch (error) {
    console.error(`Error fetching data: ${error.message}`);
    throw error;
  }
}

async function fetchData(page = 1) {
  const minDepth = document.getElementById("minDepth").value;
  const chromosome = document.getElementById("chromosome").value;
  const min_pos = document.getElementById("minPos").value;
  const max_pos = document.getElementById("maxPos").value;
  const min_total_alfa = document.getElementById("minGlobalFreq").value / 100;
  const max_total_alfa = document.getElementById("maxGlobalFreq").value / 100;
  const min_latin_american_2_alfa =
    document.getElementById("minLatinAmericanFreq").value / 100;
  const max_latin_american_2_alfa =
    document.getElementById("maxLatinAmericanFreq").value / 100;
  const min_east_asian_alfa =
    document.getElementById("minEastAsianFreq").value / 100;
  const max_east_asian_alfa =
    document.getElementById("maxEastAsianFreq").value / 100;
  const gene = document.getElementById("geneName").value;
  const gatk_pass = document.getElementById("gatkPass").checked;
  const is_dbsnp = document.getElementById("isDbSnp").checked;
  const params = new URLSearchParams({
    min_dp: minDepth,
    chromosome: chromosome,
    min_pos: min_pos,
    max_pos: max_pos,
    min_total_alfa: min_total_alfa,
    max_total_alfa: max_total_alfa,
    min_latin_american_2_alfa: min_latin_american_2_alfa,
    max_latin_american_2_alfa: max_latin_american_2_alfa,
    min_east_asian_alfa: min_east_asian_alfa,
    max_east_asian_alfa: max_east_asian_alfa,
    gatk_pass: gatk_pass ? "1" : "0",
    is_dbsnp: is_dbsnp ? "1" : "0",
    gene: gene,
    page: page,
  });
  try {
    const response = await fetch(`/api/data?${params.toString()}`);
    const data = await response.json();

    if (response.ok) {
      currentPage = data.page;
      totalPages = data.total_pages;
      const tableBody = document.getElementById("dataTable");
      tableBody.innerHTML = "";

      data.items.forEach((item, index) => {
        const row = document.createElement("tr");
        row.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";

        if (item.filter === "PASS") {
          item.filter = "Pass";
        }

        const rowDbSnpContent = item.dbsnp
          ? `<a href="https://www.ncbi.nlm.nih.gov/snp/${item.dbsnp}"
                target="_blank"
                class="text-blue-600 hover:text-blue-800 hover:underline">${item.dbsnp}</a>`
          : `<span class="text-gray-400">N/D</span>`;

        rowTotalFreqContent = item.total_freq_repr
          ? item.total_freq_repr
          : `<span class="text-gray-400">N/D</span>`;

        rowLatinAmerican2FreqContent = item.latin_american_2_freq_repr
          ? item.latin_american_2_freq_repr
          : `<span class="text-gray-400">N/D</span>`;

        rowEastAsianFreqContent = item.east_asian_freq_repr
          ? item.east_asian_freq_repr
          : `<span class="text-gray-400">N/D</span>`;

        const rowGeneContent =
          item.genes && item.genes.length > 0
            ? item.genes
                .map(
                  (gene) =>
                    `<a href="https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene.trim()}"
                        target="_blank"
                        class="text-blue-600 hover:text-blue-800 hover:underline">${gene.trim()}</a>`,
                )
                .join(", ")
            : `<span class="text-gray-400">N/D</span>`;

        const detailsDbSnpContent = item.dbsnp
          ? `<a href="https://www.ncbi.nlm.nih.gov/snp/${item.dbsnp}"
                target="_blank"
                class="inline-block text-sm py-1 px-3 bg-indigo-100 text-indigo-700 no-underline rounded-full hover:bg-indigo-200 transition-colors duration-200">${item.dbsnp}</a>`
          : `<span class="text-gray-400">No entry for this variant.</span>`;

        const detailsGeneContent =
          item.genes && item.genes.length > 0
            ? item.genes
                .map(
                  (gene) =>
                    `<a href="https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene.trim()}"
                        target="_blank"
                        class="inline-block text-sm py-1 px-3 mr-2 bg-indigo-100 text-indigo-700 no-underline rounded-full hover:bg-indigo-200 transition-colors duration-200">${gene.trim()}</a>`,
                )
                .join("")
            : `<span class="text-gray-400">No genes in this locus.</span>`;

        row.innerHTML = `
            <td class="pl-6 pr-3 py-4 whitespace-nowrap">
                <button onclick="toggleDetails(${item.id}, '${item.dbsnp}')" class="text-gray-400 hover:text-gray-600">
                    <span id="expand-icon-${item.id}">
                        <svg width="12" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 2l12 4-12 4z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                        </svg>
                    </span>
                </button>
            </td>
            <td class="px-3 py-4 truncate overflow-hidden text-sm ">${item.locus_repr}</td>
            <td class="px-3 py-4 truncate overflow-hidden text-sm tracking-widest" title="${item.allele_repr}">${item.allele_repr}</td>
            <td class="px-3 py-4 whitespace-nowrap text-sm">${rowDbSnpContent}</td>
            <td class="px-3 py-4 truncate overflow-hidden text-sm">${rowGeneContent}</td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-right">${item.dp}</td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-right">${rowTotalFreqContent}</td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-right">${rowLatinAmerican2FreqContent}</td>
            <td class="pl-3 pr-6 py-4 whitespace-nowrap text-sm text-right">${rowEastAsianFreqContent}</td>
        `;
        tableBody.appendChild(row);

        // Details row
        const detailsRow = document.createElement("tr");
        detailsRow.id = `details-${item.id}`;
        detailsRow.className = "hidden";

        detailsRow.innerHTML = `
          <td colspan="6" class="align-top px-6 py-4 bg-gray-50">
              <div class="p-4 bg-white rounded-lg shadow-sm border-solid border break-words whitespace-normal">
                  <h3 class="text-lg font-bold mb-4">${item.locus_repr}</h3>
                  <dl class="flex">
                      <div class="w-full sm:w-[22%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500">Allele:</dt>
                          <dd class="text-sm py-1 tracking-widest">${item.allele_repr}</dd>
                      </div>
                      <div class="w-full sm:w-[20%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500">Read depth:</dt>
                          <dd class="text-sm py-1">${item.dp}</dd>
                      </div>
                      <div class="w-full sm:w-[20%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500">dbSNP ID:</dt>
                          <dd class="text-sm text-gray-600">${detailsDbSnpContent}</dd>
                      </div>
                      <div class="w-full sm:w-[38%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-1/2">Genes:</dt>
                          <dd class="text-sm">${detailsGeneContent}</dd>
                      </div>
                  </dl>
                  <dl class="flex mt-4">
                      <div class="w-full sm:w-[22%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-1/2">Allele depth:</dt>
                          <dd class="text-sm py-1">${item.ad}</dd>
                      </div>
                      <div class="w-full sm:w-[20%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-1/2">Genotype:</dt>
                          <dd class="text-sm py-1">${item.gt}</dd>
                      </div>
                      <div class="w-full sm:w-[58%] min-w-[120px]">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-1/2">GATK filter:</dt>
                          <dd class="text-sm py-1">${item.filter}</dd>
                      </div>
                  </dl>
                  <div id="variant-info-${item.id}"></div>
              </div>
          </td>
          <td colspan="3" class="align-top px-6 py-4 bg-gray-50">
              <div class="p-4 bg-white rounded-lg shadow-sm border-solid border break-words whitespace-normal">
                  <h3 class="text-lg font-bold mb-4">Allele frequency</h3>
                  <dl class="mt-4">
                      <div class="w-full mb-1.5 flex items-center">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-3/5">Global frequency:</dt>
                          <dd class="text-sm py-1 w-2/5">${item.total_freq_repr || '<span class="text-gray-400">N/D</span>'}</dd>
                      </div>
                      <div class="w-full mb-1.5 flex items-center">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-3/5">Latin America frequency:</dt>
                          <dd class="text-sm py-1 w-2/5">${item.latin_american_2_freq_repr || '<span class="text-gray-400">N/D</span>'}</dd>
                      </div>
                      <div class="w-full mb-1.5 flex items-center">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-3/5">East Asia frequency:</dt>
                          <dd class="text-sm py-1 w-2/5">${item.east_asian_freq_repr || '<span class="text-gray-400">N/D</span>'}</dd>
                      </div>
                      <div class="w-full mb-1.5 flex items-center">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-3/5">South Asia frequency:</dt>
                          <dd class="text-sm py-1 w-2/5">${item.south_asian_freq_repr || '<span class="text-gray-400">N/D</span>'}</dd>
                      </div>
                      <div class="w-full mb-1.5 flex items-center">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-3/5">Africa frequency:</dt>
                          <dd class="text-sm py-1 w-2/5">${item.african_freq_repr || '<span class="text-gray-400">N/D</span>'}</dd>
                      </div>
                      <div class="w-full flex items-center">
                          <dt class="text-sm py-1 font-semibold text-gray-500 w-3/5">Europe frequency:</dt>
                          <dd class="text-sm py-1 w-2/5">${item.european_freq_repr || '<span class="text-gray-400">N/D</span>'}</dd>
                      </div>
                  </dl>
                </div>
              </td>
        `;
        tableBody.appendChild(detailsRow);
      });

      updatePaginationInfo(data.total, data.page, data.per_page);
      updatePageNumbers(data.page, data.total_pages);
      updatePaginationButtons();
    } else {
      alert("Error: " + data.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while fetching data");
  }
}

document.getElementById("filterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  currentPage = 1;
  fetchData(1);
});

document.getElementById("prevButton").addEventListener("click", () => {
  if (currentPage > 1) {
    fetchData(currentPage - 1);
  }
});

document.getElementById("nextButton").addEventListener("click", () => {
  if (currentPage < totalPages) {
    fetchData(currentPage + 1);
  }
});

document.getElementById("prevButtonMobile").addEventListener("click", () => {
  if (currentPage > 1) {
    fetchData(currentPage - 1);
  }
});

document.getElementById("nextButtonMobile").addEventListener("click", () => {
  if (currentPage < totalPages) {
    fetchData(currentPage + 1);
  }
});
fetchData(1);
