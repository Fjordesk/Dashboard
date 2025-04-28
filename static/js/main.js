let currentFileId = null;

// Load dashboard data when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardStats();
    loadPendingTasks();
    loadUpcomingGroups();
});

function loadDashboardStats() {
    fetch('/api/dashboard/stats')
        .then(response => response.json())
        .then(stats => {
            document.getElementById('completedCount').textContent = stats.completed;
            document.getElementById('pendingCount').textContent = stats.pending;
            document.getElementById('workingCount').textContent = stats.working;
            document.getElementById('canceledCount').textContent = stats.canceled;
        });
}

function loadPendingTasks() {
    fetch('/api/pending-tasks')
        .then(response => response.json())
        .then(tasks => {
            const container = document.getElementById('pendingTasks');
            container.innerHTML = '';
            tasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'mb-2 p-2 border rounded d-flex align-items-center';
                const checked = task.Task.Status === 'completed' ? 'checked disabled' : '';
                taskElement.innerHTML = `
                    <input type="checkbox" class="form-check-input me-2" ${checked} onchange="completePendingTask('${task.FileID}', '${task.Task.ID}', this)">
                    <div class="flex-grow-1">
                        <strong>${task.FileNumber}</strong><br>
                        ${task.Task.Description}
                    </div>
                    <small class="text-muted ms-2">Due: ${task.Task.DueDate}</small>
                `;
                container.appendChild(taskElement);
            });
        });
}

function searchFiles() {
    const query = document.getElementById('searchInput').value;
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(files => {
            // Sort files: Pending, Working, Completed, Canceled
            const statusOrder = { pending: 1, working: 2, completed: 3, canceled: 4 };
            files.sort((a, b) => (statusOrder[a.Status] || 99) - (statusOrder[b.Status] || 99));
            const tbody = document.getElementById('filesTable');
            tbody.innerHTML = '';
            files.forEach(file => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${file.FileNumber}</td>
                    <td>${file.Client}</td>
                    <td>${file.Destination}</td>
                    <td>
                        <span class="badge bg-${getStatusBadgeColor(file.Status)}">
                            ${file.Status}
                        </span>
                    </td>
                    <td>
                        <a href="/file/${file.ID}" class="btn btn-sm btn-info">View</a>
                        <button class="btn btn-sm btn-warning" onclick="editFile('${file.ID}')">Edit</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
}

function getStatusBadgeColor(status) {
    switch (status) {
        case 'completed': return 'success';
        case 'pending': return 'warning';
        case 'working': return 'info';
        case 'canceled': return 'danger';
        default: return 'secondary';
    }
}

function openCreateFileModal() {
    currentFileId = null;
    document.getElementById('fileForm').reset();
    document.getElementById('servicesContainer').innerHTML = `
        <div class="row mb-2 service-row">
            <div class="col-md-5">
                <input type="text" class="form-control" placeholder="Service Type (e.g., Hotel)" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Remarks (e.g., 3 nights, 4-star)">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger" onclick="removeService(this)">-</button>
            </div>
        </div>
    `;
    document.getElementById('tasksContainer').innerHTML = `
        <div class="row mb-2 task-row">
            <div class="col-md-5">
                <input type="text" class="form-control" placeholder="Task Description" required>
            </div>
            <div class="col-md-4">
                <input type="date" class="form-control" required>
            </div>
            <div class="col-md-2">
                <select class="form-select">
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger" onclick="removeTask(this)">-</button>
            </div>
        </div>
    `;
    new bootstrap.Modal(document.getElementById('fileModal')).show();
}

function addService() {
    const container = document.getElementById('servicesContainer');
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2 service-row';
    newRow.innerHTML = `
        <div class="col-md-5">
            <input type="text" class="form-control" placeholder="Service Type (e.g., Hotel)" required>
        </div>
        <div class="col-md-6">
            <input type="text" class="form-control" placeholder="Remarks (e.g., 3 nights, 4-star)">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-danger" onclick="removeService(this)">-</button>
        </div>
    `;
    container.appendChild(newRow);
}

function removeService(button) {
    const row = button.closest('.service-row');
    if (document.querySelectorAll('.service-row').length > 1) {
        row.remove();
    }
}

function addTask() {
    const container = document.getElementById('tasksContainer');
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2 task-row';
    newRow.innerHTML = `
        <div class="col-md-5">
            <input type="text" class="form-control" placeholder="Task Description" required>
        </div>
        <div class="col-md-4">
            <input type="date" class="form-control" required>
        </div>
        <div class="col-md-2">
            <select class="form-select">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
            </select>
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-danger" onclick="removeTask(this)">-</button>
        </div>
    `;
    container.appendChild(newRow);
}

function removeTask(button) {
    const row = button.closest('.task-row');
    if (document.querySelectorAll('.task-row').length > 1) {
        row.remove();
    }
}

function calculateNights() {
    const arrival = document.getElementById('arrival').value;
    const departure = document.getElementById('departure').value;
    
    if (arrival && departure) {
        const arrivalDate = new Date(arrival);
        const departureDate = new Date(departure);
        
        // Calculate the difference in milliseconds
        const diffTime = departureDate - arrivalDate;
        
        // Convert to days (round down to get whole nights)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Only update if the result is valid (non-negative)
        if (diffDays >= 0) {
            document.getElementById('nights').value = diffDays;
        } else {
            document.getElementById('nights').value = '';
            alert('Departure date must be after arrival date');
        }
    }
}

function editFile(fileId) {
    currentFileId = fileId;
    fetch(`/api/files`)
        .then(response => response.json())
        .then(files => {
            const file = files.find(f => f.ID === fileId);
            if (file) {
                document.getElementById('fileId').value = file.ID;
                document.getElementById('fileNumber').value = file.FileNumber.replace(/[^0-9]/g, '');
                document.getElementById('destination').value = file.CountryPrefix;
                document.getElementById('client').value = file.Client;
                document.getElementById('arrival').value = file.Arrival;
                document.getElementById('departure').value = file.Departure;
                document.getElementById('pax').value = file.Pax;
                document.getElementById('status').value = file.Status;
                
                // Clear and rebuild services
                const servicesContainer = document.getElementById('servicesContainer');
                servicesContainer.innerHTML = '';
                file.Services.forEach(service => {
                    const newRow = document.createElement('div');
                    newRow.className = 'row mb-2 service-row';
                    newRow.innerHTML = `
                        <div class="col-md-5">
                            <input type="text" class="form-control" value="${service.Type}" required>
                        </div>
                        <div class="col-md-6">
                            <input type="text" class="form-control" value="${service.Remarks}">
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-danger" onclick="removeService(this)">-</button>
                        </div>
                    `;
                    servicesContainer.appendChild(newRow);
                });
                
                // Clear and rebuild tasks
                const tasksContainer = document.getElementById('tasksContainer');
                tasksContainer.innerHTML = '';
                file.Tasks.forEach(task => {
                    const newRow = document.createElement('div');
                    newRow.className = 'row mb-2 task-row';
                    newRow.innerHTML = `
                        <div class="col-md-5">
                            <input type="text" class="form-control" value="${task.Description}" required>
                        </div>
                        <div class="col-md-4">
                            <input type="date" class="form-control" value="${task.DueDate}" required>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select">
                                <option value="pending" ${task.Status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="completed" ${task.Status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-danger" onclick="removeTask(this)">-</button>
                        </div>
                    `;
                    tasksContainer.appendChild(newRow);
                });
                
                calculateNights();
                new bootstrap.Modal(document.getElementById('fileModal')).show();
            }
        });
}

function saveFile() {
    const fileNumber = document.getElementById('fileNumber').value;
    const destination = document.getElementById('destination').value;
    const client = document.getElementById('client').value;
    const arrival = document.getElementById('arrival').value;
    const departure = document.getElementById('departure').value;
    const pax = document.getElementById('pax').value;
    const status = document.getElementById('status').value;
    
    // Collect services
    const services = [];
    document.querySelectorAll('.service-row').forEach(row => {
        const type = row.querySelector('input[type="text"]').value;
        const remarks = row.querySelectorAll('input[type="text"]')[1].value;
        services.push({ Type: type, Remarks: remarks });
    });
    
    // Collect tasks
    const tasks = [];
    document.querySelectorAll('.task-row').forEach(row => {
        const description = row.querySelector('input[type="text"]').value;
        const dueDate = row.querySelector('input[type="date"]').value;
        const status = row.querySelector('select').value;
        tasks.push({
            ID: generateUUID(),
            Description: description,
            DueDate: dueDate,
            Status: status
        });
    });
    
    const fileData = {
        ID: currentFileId || generateUUID(),
        FileNumber: `#${fileNumber}${destination}`,
        CountryPrefix: destination,
        Client: client,
        Arrival: arrival,
        Departure: departure,
        Pax: parseInt(pax),
        Destination: destination,
        Status: status,
        Services: services,
        Tasks: tasks
    };
    
    const url = currentFileId ? '/api/files/update' : '/api/files/create';
    const method = currentFileId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(fileData)
    })
    .then(response => {
        if (response.ok) {
            window.location.reload();
        } else {
            alert('Error saving file');
        }
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

window.completePendingTask = function(fileId, taskId, checkbox) {
    if (checkbox.checked) {
        fetch(`/api/file/${fileId}/task/${taskId}/complete`, { method: 'POST' })
            .then(() => {
                checkbox.disabled = true;
                loadPendingTasks();
            });
    }
};

function loadUpcomingGroups() {
    fetch('/api/files')
        .then(response => response.json())
        .then(files => {
            const now = new Date();
            const upcoming = files.filter(f => {
                if (!f.Arrival) return false;
                const arr = new Date(f.Arrival);
                return arr > now;
            });
            upcoming.sort((a, b) => new Date(a.Arrival) - new Date(b.Arrival));
            const container = document.getElementById('upcomingGroupsList');
            container.innerHTML = '';
            if (upcoming.length === 0) {
                container.innerHTML = '<div class="text-muted">No upcoming groups.</div>';
                return;
            }
            upcoming.forEach(f => {
                const div = document.createElement('div');
                div.className = 'mb-2 p-2 border rounded';
                div.innerHTML = `<strong>${f.FileNumber}</strong> - ${f.Client} | <span class="text-muted">Arrival: ${f.Arrival}</span> | <span class="badge bg-${getStatusBadgeColor(f.Status)}">${f.Status}</span>`;
                container.appendChild(div);
            });
        });
} 