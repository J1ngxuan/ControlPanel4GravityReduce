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

            // Send response: 40 bools + 10 ints
            const response = generateResponse(integers);
            socket.write(response);
            console.log('Sent response:', response.length, 'bytes');
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

// Generate response data
function generateResponse(receivedIntegers) {
    const buffer = Buffer.allocUnsafe(60);

    // Generate 40 booleans (bytes 0-39)
    // For demo: alternate true/false, with some based on received data
    for (let i = 0; i < 40; i++) {
        // Make some booleans true based on received integers
        const shouldBeTrue = (i % 2 === 0) || (receivedIntegers[i % 16] > 100);
        buffer[i] = shouldBeTrue ? 1 : 0;
    }

    // Generate 10 integers (bytes 40-59)
    // For demo: use values derived from received integers
    for (let i = 0; i < 10; i++) {
        const offset = 40 + (i * 2);
        // Create interesting values: sum of pairs of received integers
        const value = (receivedIntegers[i] + receivedIntegers[15 - i]) % 65536;

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
