function hexToInt(hex) {
    if (!hex) return 0x7F77DD;
    return parseInt(hex.replace('#', ''), 16);
}

/**
 * Converts a session request's field_data into markdown lines
 * with bold labels, based on the activity's field_schema.
 */
function formatFieldData(fieldSchema, fieldData) {
    const fields = fieldSchema.fields || [];
    const lines = [];

    for (const field of fields) {
        const value = fieldData[field.key];
        if (value === undefined || value === null || value === '') continue;
        lines.push(`**${field.label}:** ${value}`);
    }

    return lines.join('\n');
}

/**
 * Finds the field marked as type "slots" in an activity's field_schema
 * (regardless of its key name - e.g. "slots_needed" vs "fleet_size"),
 * and returns how many slots the session request asked for, or null
 * if there's no slots field or no value was entered.
 */
function getSlotsNeeded(fieldSchema, fieldData) {
    const fields = fieldSchema.fields || [];
    const slotsField = fields.find(f => f.type === 'slots');
    if (!slotsField) return null;

    const raw = fieldData[slotsField.key];
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

module.exports = { hexToInt, formatFieldData, getSlotsNeeded };
