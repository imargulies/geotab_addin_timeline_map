# Geotab Minute Tracker - Vehicle Loading Issue - TROUBLESHOOTING GUIDE

## ✅ FIXES APPLIED
The `timeline.js` file has been updated with enhanced error handling and logging. No need to use a separate file.

## Problem
Vehicles not loading in the dropdown menu when the Geotab add-in initializes, throwing errors.

## Root Causes (Common Issues)

### 1. **API/State Not Initialized**
- The Geotab API or State objects may not be properly passed to the initialize function
- Can happen if the add-in loads before Geotab framework is ready

### 2. **getGroupFilter() Errors**
- `state.getGroupFilter()` might return unexpected data
- User permissions might restrict access to device groups

### 3. **API Call Failures**  
- Network issues or authentication problems
- Missing permissions to call the 'Get' API for Device objects

## Debugging Steps

### 🔍 Step 1: Check Browser Console
1. Open the add-in in Geotab
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for these messages:
   - `=== GPS Minute by Minute Add-in Initialize START ===`
   - API and State validation messages
   - Group filter details
   - Device loading results

### 📋 Step 2: Common Error Messages

**Error: "API object is null or undefined"**
- **Cause**: Geotab framework not loaded
- **Fix**: Reload the page, ensure you're logged into Geotab

**Error: "state.getGroupFilter is not a function"**
- **Cause**: State object not properly initialized
- **Fix**: Check Geotab add-in configuration, ensure proper SDK integration

**Error: "No vehicles found" or "Empty devices array"**
- **Cause**: User permissions or group filter restrictions
- **Fix**: Check user's group permissions in Geotab admin panel

### ⚙️ Step 3: Verify Configuration
Check `configuration.json`:
```json
{
    "name": "GPS Minute by Minute Tracking",
    "version": "1.0",
    "items": [{
        "url": "timeline.html",
        "path": "ActivityLink/",
        "menuName": {
            "en": "Minute by Minute GPS"
        }
    }]
}
```

## What Was Changed

The following functions in `timeline.js` now have enhanced error handling:

### 1. `initialize()` function
- ✅ Validates API and State objects before use
- ✅ Checks that `api.call` and `state.getGroupFilter` functions exist
- ✅ Shows clear error messages if initialization fails
- ✅ Logs every step of initialization

### 2. `loadDevices()` function
- ✅ Verifies DOM elements exist
- ✅ Validates API/State availability
- ✅ Logs group filter contents
- ✅ Shows detailed device information
- ✅ Provides comprehensive error messages with troubleshooting steps

### 3. `focus()` function
- ✅ Enhanced logging when add-in regains focus
- ✅ Better error handling when reloading devices

## Next Steps

1. **Test the Add-in**
   - Open your Geotab add-in
   - Open browser console (F12)
   - Watch for the detailed logs

2. **If Still Failing**
   - Copy the entire console log output
   - Take a screenshot of any error messages
   - Note exactly when the error occurs

3. **Share the Information**
   Provide:
   - Complete console log output (from browser DevTools)
   - Error messages from alerts
   - Browser version
   - Geotab version
   - Your user role/permissions in Geotab

## Key Improvements

### Before (Original):
```javascript
async function loadDevices() {
    console.log('Loading devices from Geotab API...');
    const select = document.getElementById('vehicle-select');
    
    try {
        const groupFilter = state.getGroupFilter();
        const devices = await api.call('Get', {
            typeName: 'Device',
            search: { groups: groupFilter }
        });
        // ... populate dropdown
    } catch (error) {
        console.error('Error loading devices:', error);
        alert('Error loading vehicles: ' + error.message);
    }
}
```

### After (Enhanced):
```javascript
async function loadDevices() {
    console.log('=== loadDevices() START ===');
    const select = document.getElementById('vehicle-select');
    
    // Verify DOM element exists
    if (!select) {
        console.error('CRITICAL: vehicle-select element not found!');
        return;
    }
    
    // Verify API/State are available
    if (!api || !state) {
        console.error('CRITICAL: API or State not available!');
        select.innerHTML = '<option value="">Error: API not available</option>';
        alert('Error: Geotab API not available. Please reload.');
        return;
    }
    
    try {
        console.log('Calling state.getGroupFilter()...');
        const groupFilter = state.getGroupFilter();
        
        // Detailed logging of group filter
        console.log('Group filter:', JSON.stringify(groupFilter, null, 2));
        console.log('Group filter type:', typeof groupFilter);
        console.log('Group filter is array:', Array.isArray(groupFilter));
        
        console.log('Calling api.call to get devices...');
        const devices = await api.call('Get', {
            typeName: 'Device',
            search: { groups: groupFilter }
        });
        
        console.log(`Received ${devices.length} devices`);
        console.log('First device sample:', JSON.stringify(devices[0], null, 2));
        
        // ... populate dropdown with additional validation ...
        
    } catch (error) {
        console.error('=== loadDevices() ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Show detailed error with troubleshooting steps
        alert(`Error loading vehicles from Geotab:

Type: ${error.constructor.name}
Message: ${error.message}

Please check:
1. You are logged into Geotab
2. You have permission to view vehicles
3. The browser console for more details`);
    }
}
```

## Additional Tips

### Clear Browser Cache
If the add-in was working before:
1. Clear your browser cache
2. Hard reload the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Try in an incognito/private window

### Check Geotab Permissions
Verify your Geotab user has:
- View permissions for Devices
- Access to the groups/vehicles you're trying to see
- API access enabled (if restricted in your organization)

### Update Geotab Add-in
If this is a custom add-in:
1. Ensure it's properly registered in Geotab
2. Check the add-in configuration matches the expected format
3. Verify the add-in URL is accessible

---
**Last Updated**: January 12, 2026  
**File Modified**: `timeline.js` (enhanced with comprehensive error handling)
