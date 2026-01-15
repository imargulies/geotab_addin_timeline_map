// Global state
let map, vehicleMarker, pathPolyline, routingControl, startMarker, endMarker, arrowDecorator;
let locationData = [];
let selectedIndex = null;
let api; // Geotab API
let state; // Geotab state
let unitPreference = 'km'; // User's unit preference: 'km' or 'miles'

// Geotab add-in entry point - REQUIRED for Geotab add-ins
geotab.addin.gpsMinuteByMinute = function() {
    return {
        initialize: function(freshApi, freshState, callback) {
            api = freshApi;
            state = freshState;
            
            // Verify API and state are valid
            if (!api) {
                alert('Error: Geotab API not available. Please reload the page.');
                callback();
                return;
            }
            
            if (!state) {
                alert('Error: Geotab State not available. Please reload the page.');
                callback();
                return;
            }
            
            if (typeof api.call !== 'function') {
                alert('Error: Geotab API.call not available. Please reload the page.');
                callback();
                return;
            }
            
            if (typeof state.getGroupFilter !== 'function') {
                alert('Error: Geotab State.getGroupFilter not available. Please reload the page.');
                callback();
                return;
            }
            
            try {
                initMap();
                setDefaultDates();
                setupEventListeners();
                
                // Load devices into dropdown using state.getGroupFilter()
                loadDevices();
                
                callback();
            } catch (error) {
                alert('Error initializing add-in: ' + error.message);
                callback();
            }
        },
        
        focus: function(freshApi, freshState) {
            api = freshApi;
            state = freshState;
            // Reload devices when user returns to add-in
            loadDevices();
        },
        
        blur: function(freshApi, freshState) {
            // Clean up if needed
        }
    };
};

// Initialize map
function initMap() {
    map = L.map('map').setView([43.6532, -79.3832], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Fix for map not rendering properly in flex containers
    setTimeout(function() {
        map.invalidateSize();
    }, 100);
    
    // Also invalidate on window resize
    window.addEventListener('resize', function() {
        if (map) {
            map.invalidateSize();
        }
    });

    vehicleMarker = L.circleMarker([0, 0], {
        radius: 10,
        fillColor: "#e74c3c",
        color: "#fff",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
    });

    pathPolyline = L.polyline([], {
        color: '#3498db',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 2.0
    });
}

// Set default dates and times (today, last 1 hour in user's timezone)
function setDefaultDates() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    // Format today's date (YYYY-MM-DD)
    const todayDate = formatDate(now);
    
    // Set dates to today
    document.getElementById('start-date').value = todayDate;
    document.getElementById('end-date').value = todayDate;
    
    // Set times (1 hour ago to now) - uses user's local timezone automatically
    document.getElementById('start-time').value = formatTime(oneHourAgo);
    document.getElementById('end-time').value = formatTime(now);
    
    // Update date displays
    updateDateDisplay('start-date');
    updateDateDisplay('end-date');
}

// Format date for display (e.g., "January 15")
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// Update the visible date display
function updateDateDisplay(inputId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(inputId + '-display');
    if (input && display) {
        display.textContent = formatDateDisplay(input.value);
    }
}

// Format date for date input (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time for time input (HH:MM)
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('load-data').addEventListener('click', loadTimelineData);
    
    // Auto-update end time when start date/time changes
    document.getElementById('start-date').addEventListener('change', function() {
        updateDateDisplay('start-date');
        updateEndDateTime();
    });
    document.getElementById('start-time').addEventListener('change', updateEndDateTime);
    
    // Validate time range when end date/time changes
    document.getElementById('end-date').addEventListener('change', function() {
        updateDateDisplay('end-date');
        validateTimeRange();
    });
    document.getElementById('end-time').addEventListener('change', validateTimeRange);
}

// Show notification to user
function showNotification(message, type) {
    // Get main-container for positioning
    var mainContainer = document.getElementById('main-container');
    
    // Create notification element
    var notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.style.position = 'absolute';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.padding = '6px 10px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.fontWeight = '500';
    notification.style.fontSize = '13px';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    
    // Set background color based on type
    switch(type) {
        case 'error':
            notification.style.backgroundColor = '#e74c3c';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f39c12';
            break;
        case 'success':
            notification.style.backgroundColor = '#27ae60';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#3498db';
            break;
    }
    
    notification.textContent = message;
    
    // Append to main-container instead of body
    if (mainContainer) {
        mainContainer.appendChild(notification);
    } else {
        document.body.appendChild(notification);
    }
    
    // Auto-remove after 4 seconds
    setTimeout(function() {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Validate that time range doesn't exceed 1 hour
function validateTimeRange() {
    const startDate = document.getElementById('start-date').value;
    const startTime = document.getElementById('start-time').value;
    const endDate = document.getElementById('end-date').value;
    const endTime = document.getElementById('end-time').value;
    
    if (startDate && startTime && endDate && endTime) {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        const hoursDiff = (endDateTime - startDateTime) / (60 * 60 * 1000);
        
        // If more than 1 hour, adjust start time to be max 1 hour before end
        if (hoursDiff > 1) {
            const newStartDateTime = new Date(endDateTime.getTime() - (60 * 60 * 1000));
            document.getElementById('start-date').value = formatDate(newStartDateTime);
            document.getElementById('start-time').value = formatTime(newStartDateTime);
            
            // Update date display
            updateDateDisplay('start-date');
            
            showNotification('Time range limited to 1 hour maximum. Start time adjusted automatically.', 'info');
        } else if (hoursDiff < 0) {
            // End is before start, swap them
            document.getElementById('end-date').value = formatDate(startDateTime);
            document.getElementById('end-time').value = formatTime(startDateTime);
            updateDateDisplay('end-date');
            updateEndDateTime();
        }
    }
}

// Update end date/time to be 1 hour after start
function updateEndDateTime() {
    const startDate = document.getElementById('start-date').value;
    const startTime = document.getElementById('start-time').value;
    
    if (startDate && startTime) {
        // Create date object from start date/time
        const startDateTime = new Date(`${startDate}T${startTime}`);
        
        // Add 1 hour
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000));
        
        // Update end date and time fields
        document.getElementById('end-date').value = formatDate(endDateTime);
        document.getElementById('end-time').value = formatTime(endDateTime);
        
        // Update date display
        updateDateDisplay('end-date');
    }
}

// Load devices into dropdown using Geotab state.getGroupFilter()
async function loadDevices() {
    const select = document.getElementById('vehicle-select');
    
    if (!select) {
        return;
    }
    
    select.innerHTML = '<option value="">Loading vehicles...</option>';
    
    // Verify API and state are still available
    if (!api) {
        select.innerHTML = '<option value="">Error: API not available</option>';
        showNotification('Error: Geotab API not available. Please reload the page.', 'error');
        return;
    }
    
    if (!state) {
        select.innerHTML = '<option value="">Error: State not available</option>';
        showNotification('Error: Geotab State not available. Please reload the page.', 'error');
        return;
    }
    
    try {
        // Get group filter from state (this respects user's group permissions)
        const groupFilter = state.getGroupFilter();
        
        // Call Geotab API to get devices filtered by user's group
        const devices = await api.call('Get', {
            typeName: 'Device',
            search: {
                groups: groupFilter
            }
        });
        
        if (!devices) {
            select.innerHTML = '<option value="">No vehicles found</option>';
            return;
        }
        
        if (devices.length === 0) {
            select.innerHTML = '<option value="">No vehicles available</option>';
            return;
        }
        
        // Clear and populate dropdown
        select.innerHTML = '<option value="">Select a vehicle...</option>';
        
        // Sort devices by name
        devices.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
        
        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        select.innerHTML = '<option value="">Error loading vehicles</option>';
        showNotification('Error loading vehicles: ' + error.message, 'error');
    }
}

// Get user's unit preference from Geotab settings
function getUserUnitPreference() {
    return new Promise((resolve) => {
        try {
            // Use callback-based getSession to get current user
            api.getSession(function(sessionInfo) {
                if (!sessionInfo || !sessionInfo.userName) {
                    resolve('km');
                    return;
                }
                
                // Get the user object for the logged-in user
                api.call('Get', {
                    typeName: 'User',
                    search: {
                        name: sessionInfo.userName
                    }
                }, function(users) {
                    if (!users || users.length === 0) {
                        resolve('km');
                        return;
                    }
                    
                    const currentUser = users[0];
                    
                    // Check isMetric property
                    const isMetric = currentUser.isMetric;
                    
                    if (isMetric === false) {
                        console.log('isMetric: miles');
                        resolve('miles');
                    } else {
                        console.log('isMetric: km');
                        resolve('km');
                    }
                }, function(error) {
                    resolve('km'); // Default to km on error
                });
            });
        } catch (error) {
            resolve('km'); // Default to km on error
        }
    });
}

// Convert speed based on user's unit preference
function formatSpeed(speedKmh) {
    if (unitPreference === 'miles') {
        // Convert km/h to mph (divide by 1.609)
        return Math.round(speedKmh / 1.609);
    }
    return Math.round(speedKmh);
}

// Load timeline data from Geotab
async function loadTimelineData() {
    const vehicleId = document.getElementById('vehicle-select').value;
    const startDate = document.getElementById('start-date').value;
    const startTime = document.getElementById('start-time').value;
    const endDate = document.getElementById('end-date').value;
    const endTime = document.getElementById('end-time').value;

    if (!vehicleId) {
        showNotification('Please select a vehicle', 'warning');
        return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
        showNotification('Please select date and time range', 'warning');
        return;
    }

    // Combine date and time into ISO string
    const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

    document.getElementById('loading').style.display = 'block';
    document.getElementById('timeline-list').innerHTML = '';
    
    try {
        // Get LogRecords from Geotab
        const records = await api.call('Get', {
            typeName: 'LogRecord',
            search: {
                deviceSearch: {
                    id: vehicleId
                },
                fromDate: startDateTime,
                toDate: endDateTime
            }
        });

        // Get user's unit preference from Geotab
        try {
            const unit = await getUserUnitPreference();
            unitPreference = unit;
        } catch (err) {
            unitPreference = 'km';
        }

        if (!records || records.length === 0) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('timeline-list').innerHTML = 
                '<div class="empty-state"><div class="empty-state-icon">📭</div>' +
                '<div class="empty-state-text">No data found for this time period</div></div>';
            return;
        }

        // Filter to approximately one record per minute
        locationData = filterToMinuteIntervals(records);
        
        // Remove consecutive stops at same location
        locationData = consolidateStops(locationData);
        
        // Get zones and check if points are in zones
        await checkZones(locationData);
        
        document.getElementById('point-count').textContent = locationData.length;

        // Batch geocode addresses
        await geocodeBatch(locationData);

        // Add all items to timeline with gap detection
        locationData.forEach((point, index) => {
            // Check for gaps before this point
            if (index > 0) {
                const prevPoint = locationData[index - 1];
                const prevTime = new Date(prevPoint.dateTime);
                const currentTime = new Date(point.dateTime);
                const minutesDiff = Math.round((currentTime - prevTime) / 60000);
                
                // Get selected interval
                const intervalMinutes = parseInt(document.getElementById('minute-interval').value) || 1;
                
                // Only show gap if it's significantly longer than the selected interval
                // Gap threshold: at least 3x the interval or minimum 5 minutes
                const gapThreshold = Math.max(intervalMinutes * 3, 5);
                
                if (minutesDiff > gapThreshold) {
                    prevPoint.gapAfter = minutesDiff - intervalMinutes;
                    // Re-render the previous item with gap info
                    updateTimelineItem(index - 1);
                }
            }
            
            addTimelineItem(point, index);
        });

        document.getElementById('loading').style.display = 'none';

        // Fit map to all points
        if (locationData.length > 0) {
            const bounds = locationData.map(p => [p.latitude, p.longitude]);
            map.fitBounds(bounds);
        }
        
        showNotification(`Loaded ${locationData.length} GPS ${locationData.length === 1 ? 'point' : 'points'}`, 'success');
        
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        showNotification('Error loading data: ' + error.message, 'error');
    }
}

// Filter log records to approximately one per selected interval
function filterToMinuteIntervals(records) {
    if (!records || records.length === 0) return [];
    
    // Get selected interval from dropdown
    const intervalMinutes = parseInt(document.getElementById('minute-interval').value) || 1;
    
    const filtered = [];
    let lastTime = null;

    records.forEach(record => {
        const currentTime = new Date(record.dateTime);
        
        if (!lastTime) {
            filtered.push(record);
            lastTime = currentTime;
        } else {
            const diffMinutes = (currentTime - lastTime) / 60000;
            if (diffMinutes >= intervalMinutes) {
                filtered.push(record);
                lastTime = currentTime;
            }
        }
    });

    return filtered;
}

// Consolidate consecutive records at same location (regardless of speed)
function consolidateStops(records) {
    if (!records || records.length === 0) return [];
    
    const consolidated = [];
    let i = 0;
    
    while (i < records.length) {
        const current = records[i];
        let sameLocationCount = 1;
        let j = i + 1;
        
        // Count consecutive records at same location (within ~10 meters)
        while (j < records.length) {
            const next = records[j];
            const distance = calculateDistance(
                current.latitude, current.longitude,
                next.latitude, next.longitude
            );
            
            // If within 10 meters, consider it same location
            if (distance < 0.01) {
                sameLocationCount++;
                j++;
            } else {
                break;
            }
        }
        
        // Add the record with duration info if stayed at same location
        if (sameLocationCount > 1) {
            const firstTime = new Date(current.dateTime);
            const lastTime = new Date(records[j - 1].dateTime);
            const durationMinutes = Math.round((lastTime - firstTime) / 60000);
            
            current.noChangeDuration = durationMinutes;
        }
        
        consolidated.push(current);
        i = j;
    }
    
    return consolidated;
}

// Check if points are inside any zones
async function checkZones(points) {
    try {
        // Get all zones from Geotab
        const zones = await api.call('Get', {
            typeName: 'Zone'
        });
        
        // Check each point against zones
        points.forEach(point => {
            for (const zone of zones) {
                if (isPointInZone(point.latitude, point.longitude, zone)) {
                    point.zoneName = zone.name;
                    break; // Use first matching zone
                }
            }
        });
    } catch (error) {
        // Silent fail for zones
    }
}

// Check if a point is inside a zone
function isPointInZone(lat, lng, zone) {
    if (!zone.points || zone.points.length === 0) return false;
    
    // For circular zones (single point with radius)
    if (zone.points.length === 1 && zone.points[0].radius) {
        const centerLat = zone.points[0].y;
        const centerLng = zone.points[0].x;
        const radiusKm = zone.points[0].radius / 1000; // Convert meters to km
        
        const distance = calculateDistance(lat, lng, centerLat, centerLng);
        return distance <= radiusKm;
    }
    
    // For polygon zones (multiple points)
    const polygon = zone.points.map(p => [p.y, p.x]); // [lat, lng]
    return isPointInPolygon(lat, lng, polygon);
}

// Check if point is inside polygon using ray casting algorithm
function isPointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > lng) !== (yj > lng)) &&
            (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Calculate distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Batch geocode addresses using Geotab API - OPTIMIZED
async function geocodeBatch(points) {
    // Limit to max 60 points to prevent crashes
    const maxPoints = Math.min(points.length, 60);
    const limitedPoints = points.slice(0, maxPoints);
    
    const batchSize = 5; // Reduced batch size for stability
    
    for (let i = 0; i < limitedPoints.length; i += batchSize) {
        const batch = limitedPoints.slice(i, i + batchSize);
        
        // Prepare coordinates for batch geocoding
        const coordinates = batch.map(point => ({
            x: point.longitude,
            y: point.latitude
        }));

        try {
            // Call Geotab GetAddresses API
            const addresses = await api.call('GetAddresses', {
                coordinates: coordinates
            });

            // Assign addresses back to points
            batch.forEach((point, index) => {
                if (addresses && addresses[index]) {
                    point.address = addresses[index].formattedAddress || 
                                  addresses[index] || 
                                  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
                } else {
                    point.address = `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
                }
            });

            // Delay between batches
            if (i + batchSize < limitedPoints.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error) {
            // Fallback to coordinates
            batch.forEach(point => {
                point.address = `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
            });
        }
    }
    
    // For remaining points beyond 60, use coordinates only
    for (let i = maxPoints; i < points.length; i++) {
        points[i].address = `${points[i].latitude.toFixed(5)}, ${points[i].longitude.toFixed(5)}`;
    }
}

// Format address without country (remove ", USA" or ", Country")
function formatAddressWithoutCountry(address) {
    if (!address) return 'Loading address...';
    // Remove country at the end (e.g., ", USA", ", Canada", etc.)
    return address.replace(/, [A-Z][a-zA-Z\s]*$/i, '').trim();
}

// Format address for popup: street on first line, city/postal on second line, no country
function formatAddressForPopup(address) {
    if (!address) return 'Loading address...';
    
    // Remove country at the end (e.g., ", USA", ", Canada", etc.)
    let cleaned = address.replace(/, [A-Z][a-zA-Z\s]*$/i, '').trim();
    
    // Split by comma to separate parts
    const parts = cleaned.split(',').map(p => p.trim());
    
    if (parts.length >= 3) {
        // Typical format: "123 Main St, City, State Postal"
        // First part is street, rest is city/state/postal
        const street = parts[0];
        const cityPostal = parts.slice(1).join(', ');
        return `${street}<br>${cityPostal}`;
    } else if (parts.length === 2) {
        // Two parts: street, city or city, postal
        return `${parts[0]}<br>${parts[1]}`;
    }
    
    // Return as-is if can't parse
    return cleaned;
}

// Determine vehicle status based on speed
function getVehicleStatus(speedKmh) {
    if (speedKmh === 0) {
        return { text: 'Stopped', class: 'stopped' };
    } else if (speedKmh > 0 && speedKmh < 5) {
        return { text: 'Idling', class: 'idling' };
    } else {
        return { text: 'Driving', class: 'driving' };
    }
}

// Add gap indicator item to timeline
function addGapItem(minutes, beforeIndex) {
    const item = document.createElement('div');
    item.className = 'timeline-item timeline-gap';
    
    const durationText = formatDuration(minutes);
    
    item.innerHTML = `
        <div class="timeline-gap-text">⚠️ No GPS updates for ${durationText}</div>
    `;
    
    document.getElementById('timeline-list').appendChild(item);
}

// Add timeline item to left panel
function addTimelineItem(point, index) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.dataset.index = index;

    const date = new Date(point.dateTime);
    const timeStr = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });

    // Calculate speed in km/h
    const speedKmh = point.speed || 0;
    const status = getVehicleStatus(speedKmh);

    // Get start and end addresses for THIS point
    // Start = previous point's address (or current if first)
    // End = current point's address
    const startAddress = index > 0 
        ? formatAddressWithoutCountry(locationData[index - 1].address)
        : formatAddressWithoutCountry(point.address);
    const endAddress = formatAddressWithoutCountry(point.address);

    item.innerHTML = `
        <div class="timeline-time">${timeStr}</div>
        <div class="timeline-address">
            <div style="font-size: 10px; margin-bottom: 2px;">
                <strong style="color: #27ae60;">Start:</strong> ${startAddress}
            </div>
            <div style="font-size: 10px;">
                <strong style="color: #e74c3c;">End:</strong> ${endAddress}
            </div>
        </div>
        <div class="timeline-speed">
            <span class="speed-badge">${formatSpeed(speedKmh)} ${unitPreference === 'miles' ? 'mph' : 'km/h'}</span>
            <span class="status-badge ${status.class}">${status.text}</span>
        </div>
    `;

    item.addEventListener('click', () => selectMinute(index));
    document.getElementById('timeline-list').appendChild(item);
}

// Update existing timeline item (for gap info)
function updateTimelineItem(index) {
    const existingItem = document.querySelector(`[data-index="${index}"]`);
    if (existingItem) {
        const point = locationData[index];
        const date = new Date(point.dateTime);
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });

        const speedKmh = point.speed || 0;
        const status = getVehicleStatus(speedKmh);

        let addressText = point.address || 'Loading address...';
        if (point.noChangeDuration) {
            addressText += ` - No change for ${formatDuration(point.noChangeDuration)}`;
        }
        
        if (point.gapAfter) {
            addressText += `<br><em>Stopped for ${formatDuration(point.gapAfter)}</em>`;
        }

        existingItem.innerHTML = `
            <div class="timeline-time">${timeStr}</div>
            <div class="timeline-address">${addressText}</div>
            <div class="timeline-speed">
                <span class="speed-badge">${formatSpeed(speedKmh)} ${unitPreference === 'miles' ? 'mph' : 'km/h'}</span>
                <span class="status-badge ${status.class}">${status.text}</span>
            </div>
        `;
        
        existingItem.addEventListener('click', () => selectMinute(index));
    }
}

// Format duration as hours and minutes
function formatDuration(minutes) {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
        } else {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        }
    } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
}

// Add directional arrows to path
function addArrowsToPath(coordinates) {
    // Remove existing arrow decorator if any
    if (arrowDecorator) {
        map.removeLayer(arrowDecorator);
    }
    
    // Create arrow decorator with arrows along the path
    arrowDecorator = L.polylineDecorator(coordinates, {
        patterns: [
            {
                offset: '10%',
                repeat: '20%',
                symbol: L.Symbol.arrowHead({
                    pixelSize: 12,
                    polygon: false,
                    pathOptions: {
                        stroke: true,
                        weight: 2,
                        color: '#2c3e50',
                        fillOpacity: 0
                    }
                })
            }
        ]
    }).addTo(map);
}

// Select a minute and show on map
function selectMinute(index) {
    selectedIndex = index;
    const point = locationData[index];

    // Update active state in list
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`[data-index="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show segment around clicked point on map based on selected interval
    // Get selected interval (1-5 minutes)
    const intervalMinutes = parseInt(document.getElementById('minute-interval').value) || 1;
    
    // Calculate how many points to show (interval determines segment size)
    const pointsToShow = intervalMinutes;
    
    const segmentStart = index;
    const segmentEnd = Math.min(locationData.length - 1, index + pointsToShow);
    
    // Start marker at clicked point
    const startPoint = locationData[segmentStart];
    // End marker at end of interval
    const endPoint = locationData[segmentEnd];
    
    // Get start time
    const startDate = new Date(startPoint.dateTime);
    const startTimeStr = startDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Get end time and status
    const endDate = new Date(endPoint.dateTime);
    const endTimeStr = endDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    const endSpeedKmh = endPoint.speed || 0;
    const endStatus = getVehicleStatus(endSpeedKmh);
    
    // Determine end marker color based on status
    let endMarkerColor = '#e74c3c'; // Default red (stopped)
    if (endStatus.class === 'idling') {
        endMarkerColor = '#f39c12'; // Orange for idling
    } else if (endStatus.class === 'driving') {
        endMarkerColor = '#27ae60'; // Green for driving
    }
    
    // Remove existing markers
    if (startMarker) {
        map.removeLayer(startMarker);
    }
    if (endMarker) {
        map.removeLayer(endMarker);
    }
    
    // Create start marker (green) with popup
    startMarker = L.circleMarker([startPoint.latitude, startPoint.longitude], {
        radius: 8,
        fillColor: "#27ae60",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(map);
    
    // Format addresses for popups
    const startAddressFormatted = formatAddressForPopup(startPoint.address);
    const endAddressFormatted = formatAddressForPopup(endPoint.address);
    
    // Get start status
    const startSpeedKmh = startPoint.speed || 0;
    const startStatus = getVehicleStatus(startSpeedKmh);
    
    // Determine start marker color based on status
    let startMarkerColor = '#27ae60'; // Default green
    if (startStatus.class === 'stopped') {
        startMarkerColor = '#e74c3c'; // Red for stopped
    } else if (startStatus.class === 'idling') {
        startMarkerColor = '#f39c12'; // Orange for idling
    } else {
        startMarkerColor = '#27ae60'; // Green for driving
    }
    
    // Use tooltips instead of popups so both can show at once
    startMarker.bindTooltip(`<div style="text-align:center;"><b style="color:#27ae60;">Start</b> ${startTimeStr}<br><span style="color:${startMarkerColor};font-weight:bold;">${startStatus.text}:</span> <span style="font-size:11px;color:#666;">${startAddressFormatted}</span></div>`, {
        permanent: true,
        direction: 'top',
        className: 'compact-tooltip',
        offset: [0, -5]
    });
    
    // Create end marker with tooltip (color based on status)
    endMarker = L.circleMarker([endPoint.latitude, endPoint.longitude], {
        radius: 8,
        fillColor: endMarkerColor,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(map);
    
    endMarker.bindTooltip(`<div style="text-align:center;"><b style="color:#e74c3c;">End</b> ${endTimeStr}<br><span style="color:${endMarkerColor};font-weight:bold;">${endStatus.text}:</span> <span style="font-size:11px;color:#666;">${endAddressFormatted}</span></div>`, {
        permanent: true,
        direction: 'top',
        className: 'compact-tooltip',
        offset: [0, -5]
    });
    
    // Remove the vehicle marker (no longer needed)
    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
    }

    // Show trail for THIS SEGMENT - ROAD SNAPPING VERSION using OSRM
    const trailPoints = locationData.slice(segmentStart, segmentEnd + 1)
        .map(p => [p.latitude, p.longitude]);
    
    // Build routing URL for OSRM (Open Source Routing Machine)
    const coordinates = trailPoints.map(p => `${p[1]},${p[0]}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    
    // Fetch route from OSRM
    fetch(osrmUrl)
        .then(response => response.json())
        .then(data => {
            if (data.code === 'Ok' && data.routes && data.routes[0]) {
                // Use the road-snapped route
                let routeCoordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Force the route to start and end at EXACT GPS points
                routeCoordinates[0] = [startPoint.latitude, startPoint.longitude];
                routeCoordinates[routeCoordinates.length - 1] = [endPoint.latitude, endPoint.longitude];
                
                pathPolyline.setLatLngs(routeCoordinates).addTo(map);
                
                // Add directional arrows to the path
                addArrowsToPath(routeCoordinates);
            } else {
                // Fallback to straight line if routing fails
                pathPolyline.setLatLngs(trailPoints).addTo(map);
                addArrowsToPath(trailPoints);
            }
        })
        .catch(error => {
            // Fallback to straight line on error
            pathPolyline.setLatLngs(trailPoints).addTo(map);
            addArrowsToPath(trailPoints);
        });

    // Center map to show both start and end markers
    const bounds = L.latLngBounds([startPoint.latitude, startPoint.longitude], [endPoint.latitude, endPoint.longitude]);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Hide the info panel since we're using popups on markers
    document.getElementById('map-info').style.display = 'none';
}

// Version log
console.log('V20');
