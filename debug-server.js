const net = require('net');

const PORT = 8080;
const HOST = 'localhost';

// Debug cycling configuration
let debugCounter = 1;
const DEBUG_INT_INDEX = 9; // Last response integer (int9)
const CYCLE_INCREMENT = 1; // Increment per response
const MAX_VALUE = 65535;

// Create TCP server
const server = net.createServer((socket) => {
    console.log('Client connected:', socket.remoteAddress, socket.remotePort);

    socket.on('data', (data) => {
        // Parse received 16 integers (32 bytes)
        if (data.length >= 32) {
            const integers = [];
            for (let i = 0; i < 16; i++) {
                const offset = i * 2;
                const value = (data[offset] << 8) | data[offset + 1];
                integers.push(value);
            }

            // Log received data (condensed)
            console.log(`RX: cmd=${integers[9]}, int15=${integers[15]} | TX: debug[${DEBUG_INT_INDEX}]=${debugCounter}`);

            // Send response with cycling debug value
            const response = generateResponse(integers);
            socket.write(response);

            // Increment debug counter
            debugCounter += CYCLE_INCREMENT;
            if (debugCounter > MAX_VALUE) {
                debugCounter = 1;
                console.log('\n*** Debug counter wrapped around to 1 ***\n');
            }
        }
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });

    // Generate response data
    // Format: 5 bytes (40 bools packed as bits) + 1 unused byte + 20 bytes (10 ints) = 26 bytes total
    function generateResponse(receivedIntegers) {
        const buffer = Buffer.allocUnsafe(26);

        // Generate 40 booleans packed into 5 bytes (bytes 0-4)
        for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
            let byteValue = 0;
            for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                const boolIndex = byteIndex * 8 + bitIndex;
                const shouldBeTrue = (boolIndex % 2 === 0) || (receivedIntegers[boolIndex % 16] > 100);
                if (shouldBeTrue) {
                    byteValue |= (1 << bitIndex);
                }
            }
            buffer[byteIndex] = byteValue;
        }

        // Byte 5: Unused/padding
        buffer[5] = 0;

        // Generate 10 integers starting from byte 6 (bytes 6-25)
        for (let i = 0; i < 10; i++) {
            const offset = 6 + (i * 2);
            let value;

            if (i === DEBUG_INT_INDEX) {
                // Debug integer: cycling value from 1 to 65535 (replaces command ack)
                value = debugCounter;
            } else {
                // Other integers: echo or derive from received
                value = (receivedIntegers[i] + receivedIntegers[15 - i]) % 65536;
            }

            // Convert to big-endian
            buffer[offset] = (value >> 8) & 0xff;
            buffer[offset + 1] = value & 0xff;
        }

        return buffer;
    }
});

// Start server
server.listen(PORT, HOST, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Debug Server - Auto-cycling int values');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Host: ${HOST}`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Debug Int Index: ${DEBUG_INT_INDEX} (response int[${DEBUG_INT_INDEX}])`);
    console.log(`  Cycling: 1 → ${MAX_VALUE} (increment: ${CYCLE_INCREMENT})`);
    console.log('═══════════════════════════════════════════════════════');
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
    console.log('\n\nShutting down debug server...');
    console.log(`Final debug counter value: ${debugCounter}`);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
