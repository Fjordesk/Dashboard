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