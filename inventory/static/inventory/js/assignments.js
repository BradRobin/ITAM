// REPLACE the old handleAssignAction in asset-management.js with this:
async function handleAssignAction(assetId, assetName) {
    // Call the new modal from assignment.js
    if (window.Assignment && typeof window.Assignment.openModal === 'function') {
        window.Assignment.openModal(assetId, assetName, () => {
            refreshAssetList(); // Refresh the table after assignment
        });
    } else {
        // Fallback to old prompt if modal isn't loaded
        const employeeId = prompt(`Assign "${assetName}" to which Employee ID?`);
        if (employeeId) {
            await assignAsset(assetId, employeeId);
            alert('Assigned!');
            refreshAssetList();
        }
    }
}

// REPLACE the old handleReturnAction in asset-management.js with this:
async function handleReturnAction(assetId, assetName) {
    // Call the new modal/confirmation from assignment.js
    if (window.Assignment && typeof window.Assignment.returnAsset === 'function') {
        window.Assignment.returnAsset(assetId, assetName, () => {
            refreshAssetList(); // Refresh the table after return
        });
    } else {
        // Fallback
        if (confirm(`Return "${assetName}"?`)) {
            await returnAsset(assetId);
            alert('Returned!');
            refreshAssetList();
        }
    }
}