// Browser injection script for CRM Monitoring Agent
// This script should be injected into web pages to set the device ID

(function() {
    'use strict';
    
    // Function to set device ID in localStorage
    function setDeviceId(deviceId) {
        try {
            localStorage.setItem('device_id', deviceId);
            console.log('CRM Agent: Device ID set to', deviceId);
            return true;
        } catch (e) {
            console.error('CRM Agent: Failed to set device ID:', e);
            return false;
        }
    }
    
    // Function to get device ID from localStorage
    function getDeviceId() {
        try {
            return localStorage.getItem('device_id');
        } catch (e) {
            console.error('CRM Agent: Failed to get device ID:', e);
            return null;
        }
    }
    
    // Listen for messages from the agent
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'CRM_AGENT_DEVICE_ID') {
            setDeviceId(event.data.deviceId);
        }
    });
    
    // Expose functions globally for debugging
    window.CRMAgent = {
        setDeviceId: setDeviceId,
        getDeviceId: getDeviceId
    };
    
    console.log('CRM Agent: Browser injection script loaded');
})();
