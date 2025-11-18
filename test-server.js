const net = require('net');

const PORT = 8080;
const HOST = 'localhost';

// Create TCP server
const server = net.createServer((socket) => {
    console.log('Client connected:', socket.remoteAddress, socket.remotePort);

    socket.on('data', (data) => {
        console.log('\n--- Received Data ---');
        console.log('Raw buffer:', data);
        console.log('Length:', data.length, 'bytes');

        // Parse received 16 integers (32 bytes)
        if (data.length >= 32) {
            const integers = [];
            for (let i = 0; i < 16; i++) {
                const offset = i * 2;
                const value = (data[offset] << 8) | data[offset + 1];
                integers.push(value);
            }
            console.log('Parsed 16 integers:', integers);
            console.log('Control Command (int-9):', integers[9]);

            // Send response: 40 bools + 10 ints
            const response = generateResponse(integers);
            socket.write(response);
            console.log('Sent response:', response.length, 'bytes');
            logResponseData(response);
        } else {
            console.log('Received data too short, expected at least 32 bytes');
        }
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

// Track command acknowledgment state for simulation
let lastReceivedCommand = 0;
let commandReceiveCount = 0;
let acknowledgmentDelay = 10; // Number of cycles before acknowledging (simulates ~200ms at 50Hz)

// Helper function to log response data in readable format
function logResponseData(buffer) {
    // Parse and display booleans (bytes 0-4, bit-packed)
    const bools = [];
    for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
        const byteValue = buffer[byteIndex];
        for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
            const boolValue = (byteValue & (1 << bitIndex)) !== 0;
            bools.push(boolValue);
        }
    }

    // Parse and display integers (bytes 6-25)
    const ints = [];
    for (let i = 0; i < 10; i++) {
        const offset = 6 + (i * 2);
        const value = (buffer[offset] << 8) | buffer[offset + 1];
        ints.push(value);
    }

    console.log('Response - 40 Bools (packed):', bools.map(b => b ? 1 : 0).join(''));
    console.log('Response - 10 Ints:', ints);
    console.log('Response - PLC Acknowledgment (int-9):', ints[9]);
}

// Generate response data
// Format: 5 bytes (40 bools packed as bits) + 1 unused byte + 20 bytes (10 ints) = 26 bytes total
function generateResponse(receivedIntegers) {
    const buffer = Buffer.allocUnsafe(26);

    // Get the control command from received int-9
    const currentCommand = receivedIntegers[9];

    // Generate 40 booleans packed into 5 bytes (bytes 0-4)
    // 8 bools per byte, bit-packed
    for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
        let byteValue = 0;
        for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
            const boolIndex = byteIndex * 8 + bitIndex;
            // Make some booleans true based on received integers for demo
            const shouldBeTrue = (boolIndex % 2 === 0) || (receivedIntegers[boolIndex % 16] > 100);

            if (shouldBeTrue) {
                byteValue |= (1 << bitIndex); // Set bit at position bitIndex
            }
        }
        buffer[byteIndex] = byteValue;
    }

    // Byte 5: Unused/padding
    buffer[5] = 0;

    // Generate 10 integers starting from byte 6 (bytes 6-25)
    for (let i = 0; i < 10; i++) {
        const offset = 6 + (i * 2); // Start at byte 6
        let value;

        if (i === 9) {
            // 10th integer (index 9): Echo back the control command after processing

            // Detect new command
            if (currentCommand !== 0 && currentCommand !== lastReceivedCommand) {
                lastReceivedCommand = currentCommand;
                commandReceiveCount = 0;
                console.log(`New command received: ${currentCommand} - Processing...`);
                value = 0; // Don't acknowledge immediately
            }
            // Command is being processed
            else if (lastReceivedCommand !== 0 && commandReceiveCount < acknowledgmentDelay) {
                commandReceiveCount++;
                value = 0; // Still processing
            }
            // Command processing complete - send acknowledgment
            else if (lastReceivedCommand !== 0 && commandReceiveCount >= acknowledgmentDelay) {
                value = lastReceivedCommand;
                console.log(`Command acknowledged: ${lastReceivedCommand}`);
            }
            // Command cleared (currentCommand is 0)
            else if (currentCommand === 0 && lastReceivedCommand !== 0) {
                // Reset state when command is cleared from client
                lastReceivedCommand = 0;
                commandReceiveCount = 0;
                value = 0;
                console.log(`Command cleared`);
            }
            // No active command
            else {
                value = 0;
            }
        } else {
            // Other integers: use values derived from received integers
            value = (receivedIntegers[i] + receivedIntegers[15 - i]) % 65536;
        }

        // Convert to big-endian (Int2Byte format)
        buffer[offset] = (value >> 8) & 0xff;      // High byte
        buffer[offset + 1] = value & 0xff;          // Low byte
    }

    return buffer;
}

// Start server
server.listen(PORT, HOST, () => {
    console.log('═══════════════════════════════════════════');
    console.log('  TCP Test Server Running');
    console.log('═══════════════════════════════════════════');
    console.log(`  Host: ${HOST}`);
    console.log(`  Port: ${PORT}`);
    console.log('═══════════════════════════════════════════');
    console.log('\nWaiting for connections...\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use`);
        console.error('Please close the other application or change the port');
    } else {
        console.error('Server error:', err.message);
    }
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
