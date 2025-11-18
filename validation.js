// Input Validation Utilities

// Validate TCP port number
function validatePort(port) {
    const p = parseInt(port, 10);
    if (isNaN(p) || p < 1 || p > 65535) {
        return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    return { valid: true, value: p };
}

// Validate TCP host/IP address
function validateHost(host) {
    if (!host || typeof host !== 'string' || host.trim().length === 0) {
        return { valid: false, error: 'Host cannot be empty' };
    }

    const trimmedHost = host.trim();

    // Basic validation for IP address or hostname
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (ipPattern.test(trimmedHost) || hostnamePattern.test(trimmedHost) || trimmedHost === 'localhost') {
        return { valid: true, value: trimmedHost };
    }

    return { valid: false, error: 'Invalid host or IP address' };
}

// Validate integer value (16-bit unsigned: 0-65535)
function validateInteger(value, min = 0, max = 65535) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        return { valid: false, error: 'Must be a valid number', value: min };
    }

    if (num < min || num > max) {
        // Clamp to valid range
        const clamped = Math.max(min, Math.min(max, num));
        return { valid: false, error: `Value must be between ${min} and ${max}`, value: clamped };
    }

    return { valid: true, value: num };
}

// Validate array of integers
function validateIntegerArray(integers, count, min = 0, max = 65535) {
    if (!Array.isArray(integers)) {
        return { valid: false, error: 'Input must be an array' };
    }

    if (integers.length !== count) {
        return { valid: false, error: `Expected ${count} integers, got ${integers.length}` };
    }

    const validatedIntegers = [];
    for (let i = 0; i < integers.length; i++) {
        const result = validateInteger(integers[i], min, max);
        validatedIntegers.push(result.value);
        if (!result.valid) {
            console.warn(`Integer at index ${i} was clamped: ${integers[i]} -> ${result.value}`);
        }
    }

    return { valid: true, value: validatedIntegers };
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validatePort,
        validateHost,
        validateInteger,
        validateIntegerArray
    };
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.validatePort = validatePort;
    window.validateHost = validateHost;
    window.validateInteger = validateInteger;
    window.validateIntegerArray = validateIntegerArray;
}
