// --- File Dashboard JS ---

let fileId = window.location.pathname.split('/file/')[1];
let fileData = null;
let currency = 'DKK';

// Utility: Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Load file data on page load ---
document.addEventListener('DOMContentLoaded', async function() {
    await loadFileData();
    setupCurrencySelector();
    renderPlanningModules();
    renderRevenueRows();
    setupSaveButton();
    renderQuotationTab();
    document.getElementById('saveQuotationPDF').onclick = function() {
        generateQuotationPDF();
    };
    renderRoadbookTab();
    renderServicesAndTasks();

    // Enable drag-and-drop for Planning blocks
    const container = document.getElementById('formContainer');
    if (window.Sortable) {
        Sortable.create(container, {
            animation: 150,
            onEnd: function (evt) {
                // Reorder fileData.planningModules to match DOM order
                const ids = Array.from(container.children).map(block => block.dataset.id);
                fileData.planningModules = ids.map(id => fileData.planningModules.find(m => m.id === id));
                updateAllTabs();
            }
        });
    }
});

async function loadFileData() {
    const res = await fetch(`/api/file/${fileId}/details`);
    fileData = await res.json();
    currency = fileData.currency || 'DKK';
    document.getElementById('currencySelector').value = currency;
    renderServicesAndTasks();
}

function setupCurrencySelector() {
    const selector = document.getElementById('currencySelector');
    selector.value = currency;
    selector.addEventListener('change', function() {
        currency = selector.value;
        fileData.currency = currency;
        updateCurrencySymbols();
    });
    updateCurrencySymbols();
}

function updateCurrencySymbols() {
    // Update all currency symbols in planning and revenue tabs
    document.querySelectorAll('.currency-symbol').forEach(el => {
        el.textContent = currency;
    });
}

function setupSaveButton() {
    let saveBtn = document.getElementById('saveFileBtn');
    if (!saveBtn) {
        saveBtn = document.createElement('button');
        saveBtn.id = 'saveFileBtn';
        saveBtn.className = 'btn btn-primary mt-3';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
        document.querySelector('.container').appendChild(saveBtn);
    }
    saveBtn.onclick = saveAllFileData;
}

// --- Planning Tab Logic ---
function renderPlanningModules() {
    const container = document.getElementById('formContainer');
    container.innerHTML = '';
    if (fileData.planningModules && fileData.planningModules.length > 0) {
        fileData.planningModules.forEach(module => {
            addPlanningBlock(module);
        });
    }
}

function addBlock(type) {
    if (!fileData) {
        alert('File data not loaded yet. Please wait.');
        return;
    }
    const module = {
        id: generateUUID(),
        type: type,
        supplier: '',
        cost: 0,
        details: {}
    };
    fileData.planningModules = fileData.planningModules || [];
    fileData.planningModules.push(module);
    updateAllTabs();
}

function addPlanningBlock(module) {
    const container = document.getElementById('formContainer');
    const block = document.createElement('div');
    block.className = 'form-section';
    block.dataset.id = module.id;
    let blockFields = '';
    if (module.type === 'Hotel') {
        // Ensure module.details.rooms exists
        if (!module.details.rooms) module.details.rooms = [];
        blockFields = `
            <div style="margin-bottom:8px;">
                <input type="text" placeholder="Hotel Name" value="${module.supplier || ''}" onchange="updatePlanningModule('${module.id}', 'supplier', this.value)">
                <input type="text" placeholder="Date Range" value="${module.details?.date || ''}" onchange="updatePlanningModule('${module.id}', 'date', this.value)">
            </div>
            <div class="table-responsive">
                <table class="table table-bordered mb-2" style="background:#f8f9fa;">
                    <thead><tr><th>Room Type</th><th>Nights</th><th>Units</th><th>Price per unit</th><th>Total</th><th>Remarks</th><th></th></tr></thead>
                    <tbody id="hotelRooms-${module.id}">
                    </tbody>
                </table>
                <button type="button" class="btn btn-sm btn-primary" onclick="addHotelRoom('${module.id}')">+ Add Room</button>
            </div>
        `;
    } else {
        // fallback: supplier/cost only
        blockFields = `
            <input type="text" placeholder="Supplier" value="${module.supplier || ''}" onchange="updatePlanningModule('${module.id}', 'supplier', this.value)">
            <input type="number" min="0" step="0.01" placeholder="Cost" value="${module.cost || ''}" onchange="updatePlanningModule('${module.id}', 'cost', this.value)">
            <span class="currency-symbol" style="margin-left:4px;">${currency}</span>
        `;
    }
    block.innerHTML = `
        <div style="position: relative;">
            <span onclick="removePlanningBlock('${module.id}')" class="delete-btn">&times;</span>
            <div class="form-row">
                ${blockFields}
            </div>
        </div>
    `;
    container.appendChild(block);
    // Render hotel rooms if Hotel block
    if (module.type === 'Hotel') renderHotelRooms(module);
}

function addHotelRoom(moduleId) {
    const module = fileData.planningModules.find(m => m.id === moduleId);
    if (!module.details.rooms) module.details.rooms = [];
    module.details.rooms.push({
        roomType: '',
        nights: 1,
        units: 1,
        price: 0,
        remarks: ''
    });
    updateAllTabs();
}

function renderHotelRooms(module) {
    const tbody = document.getElementById(`hotelRooms-${module.id}`);
    if (!tbody) return;
    tbody.innerHTML = '';
    (module.details.rooms || []).forEach((room, idx) => {
        const total = (room.nights || 1) * (room.units || 1) * (room.price || 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control" value="${room.roomType || ''}" onchange="updateHotelRoom('${module.id}', ${idx}, 'roomType', this.value)"></td>
            <td><input type="number" class="form-control" value="${room.nights || 1}" min="1" onchange="updateHotelRoom('${module.id}', ${idx}, 'nights', this.value)"></td>
            <td><input type="number" class="form-control" value="${room.units || 1}" min="1" onchange="updateHotelRoom('${module.id}', ${idx}, 'units', this.value)"></td>
            <td><input type="number" class="form-control" value="${room.price || 0}" min="0" step="0.01" onchange="updateHotelRoom('${module.id}', ${idx}, 'price', this.value)"></td>
            <td><input type="text" class="form-control" value="${total.toFixed(2)}" readonly></td>
            <td><input type="text" class="form-control" value="${room.remarks || ''}" onchange="updateHotelRoom('${module.id}', ${idx}, 'remarks', this.value)"></td>
            <td><button type="button" class="btn btn-danger btn-sm" onclick="removeHotelRoom('${module.id}', ${idx})">&times;</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateHotelRoom(moduleId, idx, field, value) {
    const module = fileData.planningModules.find(m => m.id === moduleId);
    if (!module.details.rooms) return;
    if (["nights","units","price"].includes(field)) {
        module.details.rooms[idx][field] = parseFloat(value) || 0;
    } else {
        module.details.rooms[idx][field] = value;
    }
    updateAllTabs();
}

function removeHotelRoom(moduleId, idx) {
    const module = fileData.planningModules.find(m => m.id === moduleId);
    if (!module.details.rooms) return;
    module.details.rooms.splice(idx, 1);
    updateAllTabs();
}

function removePlanningBlock(id) {
    fileData.planningModules = fileData.planningModules.filter(m => m.id !== id);
    updateAllTabs();
}

function updatePlanningModule(id, field, value) {
    const module = fileData.planningModules.find(m => m.id === id);
    if (!module) return;
    if (!module.details) module.details = {};
    if (["roomType","mealType","desc","nights","units","price","markup"].includes(field)) {
        module.details[field] = field === 'markup' || field === 'nights' || field === 'units' ? parseFloat(value) || 0 : value;
    } else if (field === 'cost') {
        module.cost = parseFloat(value) || 0;
    } else {
        module[field] = value;
    }
    calculatePlanningBlock(id);
    // Optionally: auto-add to revenue if supplier/cost filled
    if (module.supplier && (module.cost || module.details?.price)) {
        autoAddToRevenue(module.supplier, module.cost || module.details?.price);
    }
    updateAllTabs();
}

function calculatePlanningBlock(id) {
    const module = fileData.planningModules.find(m => m.id === id);
    if (!module) return;
    // Find the block in the DOM
    const block = document.querySelector(`.form-section[data-id='${id}']`);
    if (!block) return;
    // Get values
    const price = parseFloat(module.details?.price) || 0;
    const markupPercent = parseFloat(module.details?.markup) || 0;
    const nights = parseFloat(module.details?.nights) || 1;
    const units = parseFloat(module.details?.units) || 1;
    // Calculations
    const markup = markupPercent / 100;
    const total = price * (1 + markup);
    const profitMargin = total === 0 ? 0 : (total - price) / total;
    const totalInvoiced = nights * units * total;
    const marginValue = totalInvoiced - (nights * units * price);
    // Update fields
    block.querySelector('.markupTotal').value = total ? total.toFixed(2) : '';
    block.querySelector('.profitMargin').value = total ? (profitMargin * 100).toFixed(1) + '%' : '';
    block.querySelector('.totalInvoice').value = totalInvoiced ? totalInvoiced.toFixed(2) : '';
    block.querySelector('.marginValue').value = marginValue ? marginValue.toFixed(2) : '';
}

// --- Revenue Tab Logic ---
function renderRevenueRows() {
    const tbody = document.getElementById('revenueTableBody');
    tbody.innerHTML = '';
    if (fileData.revenueRows && fileData.revenueRows.length > 0) {
        fileData.revenueRows.forEach(row => {
            addRevenueRow(row.supplier, row.totalCost, row);
        });
    }
    renderQuotationRows(); // Also update Quotation tab
}

function renderQuotationRows() {
    const tbody = document.getElementById('quotationTableBody');
    tbody.innerHTML = '';
    if (fileData.revenueRows && fileData.revenueRows.length > 0) {
        fileData.revenueRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.supplier}</td>
                <td>${row.totalSelling ? row.totalSelling.toFixed(2) : ''} <span class="currency-symbol">${currency}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function addRevenueRow(supplier = '', cost = '', rowData = null) {
    const tbody = document.getElementById('revenueTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control" value="${supplier}" onchange="updateRevenueRowData(this)"></td>
        <td><input type="number" class="form-control" value="${cost}" min="0" step="0.01" onchange="updateRevenueRowData(this)"></td>
        <td><input type="number" class="form-control" value="${rowData ? rowData.markup : 0}" min="0" step="0.01" onchange="updateRevenueRowData(this)"></td>
        <td><input type="number" class="form-control" readonly></td>
        <td><input type="number" class="form-control" readonly></td>
        <td><input type="number" class="form-control" value="${rowData ? rowData.commissionPct : 0}" min="0" step="0.01" onchange="updateRevenueRowData(this)"></td>
        <td><input type="number" class="form-control" readonly></td>
        <td><input type="text" class="form-control" readonly></td>
        <td><input type="number" class="form-control" readonly></td>
        <td><input type="number" class="form-control" readonly></td>
        <td><button class="btn btn-danger" onclick="removeRevenueRow(this)"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(row);
    updateRevenueRow(row);
}

function removeRevenueRow(btn) {
    const row = btn.closest('tr');
    row.remove();
    saveRevenueRowsFromTable();
}

function updateRevenueRowData(input) {
    const row = input.closest('tr');
    updateRevenueRow(row);
    saveRevenueRowsFromTable();
}

function updateRevenueRow(row) {
    // Excel formulas:
    // D = B + (B * C)
    // E = IF(D=0, "", ROUND((D-B)/D, 2))
    // I = IF(F=0, 0, B*F)
    // J = IF(F=0, 0, B*F)
    // G = IF(D=0, "", ROUND(IF(F=0, (D-B)/D, (D-B+I)/D), 2))
    const cost = parseFloat(row.children[1].children[0].value) || 0;
    const markup = parseFloat(row.children[2].children[0].value) || 0;
    const commissionPct = parseFloat(row.children[5].children[0].value) || 0;
    // D: Total Selling
    const selling = cost + (cost * markup);
    row.children[3].children[0].value = selling ? selling.toFixed(2) : '';
    // E: Profit Margin Without Commission
    row.children[4].children[0].value = selling === 0 ? '' : ((selling - cost) / selling).toFixed(2);
    // I: Commission Amount
    const commissionAmt = commissionPct === 0 ? 0 : cost * commissionPct;
    row.children[8].children[0].value = commissionAmt.toFixed(2);
    // J: Total Profit incl. Commission
    row.children[9].children[0].value = commissionAmt.toFixed(2);
    // G: Profit Margin Adj. for Commission
    let profitMarginAdj = '';
    if (selling !== 0) {
        profitMarginAdj = commissionPct === 0
            ? ((selling - cost) / selling)
            : ((selling - cost + commissionAmt) / selling);
        row.children[6].children[0].value = profitMarginAdj.toFixed(2);
    } else {
        row.children[6].children[0].value = '';
    }
    // Flag logic (example: OK if margin > 0.23)
    row.children[7].children[0].value = (profitMarginAdj !== '' && profitMarginAdj < 0.23) ? 'Check' : 'OK';
}

function saveRevenueRowsFromTable() {
    const rows = document.querySelectorAll('#revenueTableBody tr');
    fileData.revenueRows = [];
    rows.forEach(row => {
        fileData.revenueRows.push({
            id: generateUUID(),
            supplier: row.children[0].children[0].value,
            totalCost: parseFloat(row.children[1].children[0].value) || 0,
            markup: parseFloat(row.children[2].children[0].value) || 0,
            totalSelling: parseFloat(row.children[3].children[0].value) || 0,
            profitMargin: parseFloat(row.children[4].children[0].value) || 0,
            commissionPct: parseFloat(row.children[5].children[0].value) || 0,
            profitMarginAdj: parseFloat(row.children[6].children[0].value) || 0,
            flag: row.children[7].children[0].value,
            commissionAmt: parseFloat(row.children[8].children[0].value) || 0,
            totalProfit: parseFloat(row.children[9].children[0].value) || 0
        });
    });
}

function autoAddToRevenue(supplier, cost) {
    // Only add if not already present
    if (!fileData.revenueRows) fileData.revenueRows = [];
    if (fileData.revenueRows.some(r => r.supplier === supplier && r.totalCost === cost)) return;
    fileData.revenueRows.push({
        id: generateUUID(),
        supplier: supplier,
        totalCost: cost,
        markup: 0,
        totalSelling: 0,
        profitMargin: 0,
        commissionPct: 0,
        profitMarginAdj: 0,
        flag: '',
        commissionAmt: 0,
        totalProfit: 0
    });
    renderRevenueRows();
}

// --- Save all file data ---
async function saveAllFileData() {
    // Save planning modules from UI
    // (already updated on change)
    // Save revenue rows from table
    saveRevenueRowsFromTable();
    fileData.currency = currency;
    await fetch(`/api/file/${fileId}/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileData)
    });
    alert('File data saved!');
}

// --- Divider and Date Row for Planning ---
function addDivider() {
    const container = document.getElementById('formContainer');
    const wrapper = document.createElement('div');
    wrapper.className = 'form-section';
    wrapper.innerHTML = `
        <div style="position: relative;">
            <span onclick="this.closest('.form-section').remove()" class="delete-btn">&times;</span>
            <hr style="margin: 0; border: none; border-top: 1px solid #ccc;">
        </div>
    `;
    container.appendChild(wrapper);
}

function addDateRow() {
    const container = document.getElementById('formContainer');
    const wrapper = document.createElement('div');
    wrapper.className = 'form-section';
    wrapper.innerHTML = `
        <div style="position: relative;">
            <span onclick="this.closest('.form-section').remove()" class="delete-btn">&times;</span>
            <div class="form-row">
                <input type="date" onchange="convertDateToLabel(this)" style="flex: 0 0 auto; max-width: 200px; font-weight: bold;">
            </div>
        </div>
    `;
    container.appendChild(wrapper);
}

function convertDateToLabel(input) {
    const date = new Date(input.value);
    if (!isNaN(date)) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formatted = date.toLocaleDateString('en-GB', options);
        const section = input.closest('.form-section');
        section.innerHTML = `
            <div style="position: relative;">
                <span onclick="this.closest('.form-section').remove()" class="delete-btn">&times;</span>
                <div class="form-row">
                    <div style="background-color: #f0f0f0; padding: 6px 12px; border-radius: 4px; border: 1px solid #ddd; font-weight: bold; color: #203864;">${formatted}</div>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tabs
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        new bootstrap.Tab(tabEl);
    });

    // Add event listeners for tab changes
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            const activeTab = event.target.getAttribute('data-bs-target');
            // You can add specific functionality for each tab here
            console.log('Switched to tab:', activeTab);
        });
    });
});

// --- Quotation Tab Logic ---
function renderQuotationTab() {
    // Header fields
    document.getElementById('quoteNumber').textContent = fileData.FileNumber || '';
    document.getElementById('groupNumber').textContent = fileData.FileNumber || '';
    document.getElementById('groupName').textContent = fileData.Client || '';
    document.getElementById('quoteDestination').textContent = fileData.Destination || '';
    document.getElementById('quoteDates').textContent = (fileData.Arrival || '') + ' to ' + (fileData.Departure || '');
    document.getElementById('quotePax').textContent = fileData.Pax || '';
    document.getElementById('quoteSingleRooms').textContent = fileData.singleRooms || '';
    document.getElementById('quoteDoubleRooms').textContent = fileData.doubleRooms || '';
    document.getElementById('quoteClientContact').textContent = fileData.Client || '';
    document.getElementById('quoteCurrency').textContent = currency;
    document.getElementById('quoteCurrency2').textContent = currency;
    document.getElementById('quoteCurrency3').textContent = currency;

    // Hotels Table
    const hotelsTbody = document.querySelector('#quoteHotelsTable tbody');
    hotelsTbody.innerHTML = '';
    (fileData.planningModules || []).filter(m => m.type === 'Hotel').forEach(m => {
        const details = m.details || {};
        const total = (details.nights || 1) * (details.units || 1) * ((details.price || 0) * (1 + (details.markup || 0) / 100));
        hotelsTbody.innerHTML += `<tr>
            <td>${m.supplier || ''}</td>
            <td>${details.roomType || ''}</td>
            <td>${details.nights || ''}</td>
            <td>${details.units || ''}</td>
            <td>${details.price ? details.price.toFixed(2) : ''} ${currency}</td>
            <td>${total ? total.toFixed(2) : ''} ${currency}</td>
            <td></td>
        </tr>`;
    });

    // Services Table
    const servicesTbody = document.querySelector('#quoteServicesTable tbody');
    servicesTbody.innerHTML = '';
    (fileData.planningModules || []).filter(m => m.type === 'Restaurant' || m.type === 'Activity' || m.type === 'Transport').forEach(m => {
        const details = m.details || {};
        const total = (details.nights || 1) * (details.units || 1) * ((details.price || 0) * (1 + (details.markup || 0) / 100));
        servicesTbody.innerHTML += `<tr>
            <td>${m.supplier || ''}</td>
            <td>${details.nights || ''}</td>
            <td>${details.units || ''}</td>
            <td>${details.price ? details.price.toFixed(2) : ''} ${currency}</td>
            <td>${total ? total.toFixed(2) : ''} ${currency}</td>
            <td></td>
        </tr>`;
    });

    // Liberty Services Table
    const libertyTbody = document.querySelector('#quoteLibertyTable tbody');
    libertyTbody.innerHTML = '';
    (fileData.planningModules || []).filter(m => m.type === 'Service').forEach(m => {
        const details = m.details || {};
        const total = (details.nights || 1) * (details.units || 1) * ((details.price || 0) * (1 + (details.markup || 0) / 100));
        libertyTbody.innerHTML += `<tr>
            <td>${m.supplier || ''}</td>
            <td>${details.nights || ''}</td>
            <td>${details.units || ''}</td>
            <td>${details.price ? details.price.toFixed(2) : ''} ${currency}</td>
            <td>${total ? total.toFixed(2) : ''} ${currency}</td>
            <td></td>
        </tr>`;
    });

    // Costs Summary Table
    const summaryTbody = document.querySelector('#quoteSummaryTable tbody');
    summaryTbody.innerHTML = '';
    let hotelSum = 0, serviceSum = 0, libertySum = 0;
    (fileData.planningModules || []).forEach(m => {
        const details = m.details || {};
        const total = (details.nights || 1) * (details.units || 1) * ((details.price || 0) * (1 + (details.markup || 0) / 100));
        if (m.type === 'Hotel') hotelSum += total;
        else if (m.type === 'Restaurant' || m.type === 'Activity' || m.type === 'Transport') serviceSum += total;
        else if (m.type === 'Service') libertySum += total;
    });
    summaryTbody.innerHTML += `<tr><td>HOTEL COST</td><td>${hotelSum.toFixed(2)} ${currency}</td></tr>`;
    summaryTbody.innerHTML += `<tr><td>SERVICES - DAY BY DAY</td><td>${serviceSum.toFixed(2)} ${currency}</td></tr>`;
    summaryTbody.innerHTML += `<tr><td>LIBERTY SERVICES</td><td>${libertySum.toFixed(2)} ${currency}</td></tr>`;
    summaryTbody.innerHTML += `<tr><td>TOTAL COSTS IN (${currency})</td><td>${(hotelSum+serviceSum+libertySum).toFixed(2)} ${currency}</td></tr>`;
    summaryTbody.innerHTML += `<tr><td>TOTAL COSTS per person IN (${currency})</td><td>${fileData.Pax ? ((hotelSum+serviceSum+libertySum)/fileData.Pax).toFixed(2) : '0.00'} ${currency}</td></tr>`;
}

function generateQuotationPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('jsPDF not loaded!');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.setFontSize(12);
    let y = 40;
    doc.text('Quotation', 40, y);
    y += 20;
    doc.text(`Quotation #: ${fileData.FileNumber || ''}`, 40, y);
    y += 20;
    doc.text(`Group: ${fileData.Client || ''}`, 40, y);
    y += 20;
    doc.text(`Destination: ${fileData.Destination || ''}`, 40, y);
    y += 20;
    doc.text(`Dates: ${(fileData.Arrival || '') + ' to ' + (fileData.Departure || '')}`, 40, y);
    y += 20;
    doc.text(`PAX: ${fileData.Pax || ''}`, 40, y);
    y += 20;
    doc.text(`Currency: ${currency}`, 40, y);
    y += 30;
    // Hotels Table
    doc.text('Hotels', 40, y);
    y += 10;
    doc.autoTable({
        startY: y,
        head: [['Hotel', 'Room Type', 'Nights', 'Units', 'Price per unit', 'Total', 'Remarks']],
        body: Array.from(document.querySelectorAll('#quoteHotelsTable tbody tr')).map(tr => Array.from(tr.children).map(td => td.textContent)),
        theme: 'grid',
        styles: { fontSize: 8 },
        margin: { left: 40, right: 40 }
    });
    y = doc.lastAutoTable.finalY + 20;
    // Services Table
    doc.text('Services - Day by Day', 40, y);
    y += 10;
    doc.autoTable({
        startY: y,
        head: [['Service', 'Days', 'Units', 'Price per unit', 'Total', 'Remarks']],
        body: Array.from(document.querySelectorAll('#quoteServicesTable tbody tr')).map(tr => Array.from(tr.children).map(td => td.textContent)),
        theme: 'grid',
        styles: { fontSize: 8 },
        margin: { left: 40, right: 40 }
    });
    y = doc.lastAutoTable.finalY + 20;
    // Liberty Services Table
    doc.text('Liberty Services', 40, y);
    y += 10;
    doc.autoTable({
        startY: y,
        head: [['Service', 'Days', 'Units', 'Price per unit', 'Total', 'Remarks']],
        body: Array.from(document.querySelectorAll('#quoteLibertyTable tbody tr')).map(tr => Array.from(tr.children).map(td => td.textContent)),
        theme: 'grid',
        styles: { fontSize: 8 },
        margin: { left: 40, right: 40 }
    });
    y = doc.lastAutoTable.finalY + 20;
    // Costs Summary Table
    doc.text('Costs Summary', 40, y);
    y += 10;
    doc.autoTable({
        startY: y,
        head: [['Item', 'Total']],
        body: Array.from(document.querySelectorAll('#quoteSummaryTable tbody tr')).map(tr => Array.from(tr.children).map(td => td.textContent)),
        theme: 'grid',
        styles: { fontSize: 8 },
        margin: { left: 40, right: 40 }
    });
    y = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.text('GDPR - DATA PROTECTION: The General Data Protection Regulation (GDPR) (EU) 2016/679 applies.', 40, y);
    y += 15;
    doc.text('TERMS & CONDITIONS: See https://www.liberty-int.com/terms-and-conditions/', 40, y);
    y += 15;
    doc.text('CANCELLATION POLICY: See LITG Terms & Conditions.', 40, y);
    y += 15;
    doc.text('PAYMENT TERMS: Payments must be received in full in ' + currency + '.', 40, y);
    y += 15;
    doc.text('APPLICABLE RATES: All rates in this quotation are quoted in ' + currency + '.', 40, y);
    y += 15;
    doc.text('CONFIDENTIALITY NOTE: This information is confidential and the sole property of LIBERTY NORDIC.', 40, y);
    y += 15;
    doc.text('JURISDICTION: The contractual relationship is subject to local law.', 40, y);
    doc.save(`Quotation_${fileData.FileNumber || ''}.pdf`);
}

// --- RoadBook Tab Logic ---
function renderRoadbookTab() {
    const tbody = document.getElementById('roadbookTableBody');
    tbody.innerHTML = '';
    // Use fileData.roadbookRows if present, else generate from planningModules
    let rows = fileData.roadbookRows || [];
    // If not present, generate from planningModules
    if (!rows.length && fileData.planningModules) {
        rows = fileData.planningModules.map(m => ({
            date: '',
            supplier: m.supplier || '',
            time: '',
            place: '',
            pax: '',
            comments: '',
            responsible: ''
        }));
        fileData.roadbookRows = rows;
    }
    rows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="date" class="form-control" value="${row.date || ''}" onchange="updateRoadbookRow(${idx}, 'date', this.value)"></td>
            <td><input type="text" class="form-control" value="${row.supplier || ''}" readonly></td>
            <td><input type="text" class="form-control" value="${row.time || ''}" onchange="updateRoadbookRow(${idx}, 'time', this.value)"></td>
            <td><input type="text" class="form-control" value="${row.place || ''}" onchange="updateRoadbookRow(${idx}, 'place', this.value)"></td>
            <td><input type="number" class="form-control" value="${row.pax || ''}" onchange="updateRoadbookRow(${idx}, 'pax', this.value)"></td>
            <td><input type="text" class="form-control" value="${row.comments || ''}" onchange="updateRoadbookRow(${idx}, 'comments', this.value)"></td>
            <td><input type="text" class="form-control" value="${row.responsible || ''}" onchange="updateRoadbookRow(${idx}, 'responsible', this.value)"></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateRoadbookRow(idx, field, value) {
    if (!fileData.roadbookRows) return;
    fileData.roadbookRows[idx][field] = value;
}

// Update all tabs when data changes
function updateAllTabs() {
    renderPlanningModules();
    renderRevenueRows();
    renderQuotationTab();
    renderRoadbookTab();
}

// --- Inline File Details Editing ---
document.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('saveFileDetailsBtn');
    if (saveBtn) {
        saveBtn.onclick = async function() {
            // Collect values
            fileData.FileNumber = document.getElementById('fileNumberInput').value;
            fileData.Client = document.getElementById('clientInput').value;
            fileData.Destination = document.getElementById('destinationInput').value;
            fileData.Arrival = document.getElementById('arrivalInput').value;
            fileData.Departure = document.getElementById('departureInput').value;
            fileData.Nights = document.getElementById('nightsInput').value;
            fileData.Pax = document.getElementById('paxInput').value;
            await fetch(`/api/file/${fileId}/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fileData)
            });
            alert('File details saved!');
        };
        // Recalculate nights on date change
        const arrivalInput = document.getElementById('arrivalInput');
        const departureInput = document.getElementById('departureInput');
        function recalcNights() {
            const arrival = new Date(arrivalInput.value);
            const departure = new Date(departureInput.value);
            if (!isNaN(arrival) && !isNaN(departure)) {
                const diff = (departure - arrival) / (1000 * 60 * 60 * 24);
                document.getElementById('nightsInput').value = diff > 0 ? diff : 0;
            }
        }
        arrivalInput && arrivalInput.addEventListener('change', recalcNights);
        departureInput && departureInput.addEventListener('change', recalcNights);
    }
});

// --- Editable Services and Tasks Logic ---
function renderServicesAndTasks() {
    fileData.Services = fileData.Services || [];
    fileData.Tasks = fileData.Tasks || [];
    // SERVICES
    const servicesTbody = document.getElementById('servicesTableBody');
    servicesTbody.innerHTML = '';
    fileData.Services.forEach((service, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control service-type" value="${service.Type || ''}"></td>
            <td><input type="text" class="form-control service-remarks" value="${service.Remarks || ''}"></td>
            <td><button class="btn btn-danger btn-sm" onclick="removeServiceRow(${idx})"><i class="fas fa-trash"></i></button></td>
        `;
        servicesTbody.appendChild(tr);
    });
    const addServiceBtn = document.getElementById('addServiceBtn');
    if (addServiceBtn) {
        addServiceBtn.onclick = function() {
            fileData.Services.push({ Type: '', Remarks: '' });
            renderServicesAndTasks();
        };
    }
    // TASKS
    const tasksTbody = document.getElementById('tasksTableBody');
    tasksTbody.innerHTML = '';
    fileData.Tasks.forEach((task, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control task-desc" value="${task.Description || ''}"></td>
            <td><input type="date" class="form-control task-date" value="${task.DueDate || ''}"></td>
            <td><select class="form-select task-status">
                <option value="pending" ${task.Status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="completed" ${task.Status === 'completed' ? 'selected' : ''}>Completed</option>
            </select></td>
            <td><button class="btn btn-danger btn-sm" onclick="removeTaskRow(${idx})"><i class="fas fa-trash"></i></button></td>
        `;
        tasksTbody.appendChild(tr);
    });
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.onclick = function() {
            fileData.Tasks.push({ ID: generateUUID(), Description: '', DueDate: '', Status: 'pending' });
            renderServicesAndTasks();
        };
    }
}
window.removeServiceRow = function(idx) {
    fileData.Services.splice(idx, 1);
    renderServicesAndTasks();
};
window.removeTaskRow = function(idx) {
    fileData.Tasks.splice(idx, 1);
    renderServicesAndTasks();
};
// Patch into save logic
function collectServicesAndTasksFromTable() {
    // SERVICES
    const serviceRows = document.querySelectorAll('#servicesTableBody tr');
    fileData.Services = [];
    serviceRows.forEach(row => {
        fileData.Services.push({
            Type: row.querySelector('.service-type').value,
            Remarks: row.querySelector('.service-remarks').value
        });
    });
    // TASKS
    const taskRows = document.querySelectorAll('#tasksTableBody tr');
    fileData.Tasks = [];
    taskRows.forEach(row => {
        fileData.Tasks.push({
            ID: generateUUID(),
            Description: row.querySelector('.task-desc').value,
            DueDate: row.querySelector('.task-date').value,
            Status: row.querySelector('.task-status').value
        });
    });
}
// On page load, render services/tasks after fileData is loaded
const origLoadFileData = loadFileData;
loadFileData = async function() {
    await origLoadFileData();
    renderServicesAndTasks();
};
// Patch save button to collect services/tasks
const origSaveBtnHandler = document.addEventListener;
document.addEventListener = function(type, fn, opts) {
    if (type === 'DOMContentLoaded') {
        fn = (function(origFn) {
            return function() {
                origFn();
                const saveBtn = document.getElementById('saveFileDetailsBtn');
                if (saveBtn) {
                    const origSave = saveBtn.onclick;
                    saveBtn.onclick = async function() {
                        collectServicesAndTasksFromTable();
                        await origSave();
                    };
                }
            };
        })(fn);
    }
    return origSaveBtnHandler.apply(this, arguments);
}; 