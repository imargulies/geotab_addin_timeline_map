// Global state
let map, vehicleMarker, pathPolyline, routingControl, startMarker, endMarker;
let locationData = [];
let selectedIndex = null;
let api; // Geotab API
let state; // Geotab state

// Geotab add-in entry point - REQUIRED for Geotab add-ins
// The function name must match: geotab.addin.[identifier]
geotab.addin.minuteByMinuteGPS = function() {
    return {
        initialize: function(freshApi, freshState, callback) {
            try {
                api = freshApi;
                state = freshState;
                
                console.log('GPS Minute by Minute Add-in initialized');
                console.log('API available:', !!api);
                console.log('State available:', !!state);
                
                initMap();
                setDefaultDates();
                setupEventListeners();
                
                // Load devices into dropdown using state.getGroupFilter()
                loadDevices();
                
                callback();
            } catch (error) {
                console.error('Initialization error:', error);
                alert('Error initializing add-in: ' + error.message);
                callback();
            }
        },
        
        focus: function(freshApi, freshState) {
            try {
                api = freshApi;
                state = freshState;
                console.log('Add-in focused');
                // Reload devices when user returns to add-in
                loadDevices();
            } catch (error) {
                console.error('Focus error:', error);
            }
        },
        
        blur: function(freshApi, freshState) {
            // Clean up if needed
        }
    };
};
