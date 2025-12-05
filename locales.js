// Localization for Equipment Control Panel
// Supports English and Chinese

const LOCALES = {
    'en': {
        // Window titles
        mainTitle: 'Equipment Control Panel',
        settingsTitle: 'Settings - Equipment Control Panel',

        // Status bar
        connection: 'Connection:',
        disconnected: 'Disconnected',
        connected: 'Connected',
        autoSend50Hz: 'Auto-Send (50Hz)',
        autoSend: 'Auto-Send',
        debugEcho: 'Debug Echo',

        // Tabs
        tabCommands: 'Control Commands',
        tabMonitor: 'Monitor',
        tabMocap: 'Motion Capture',
        settingsBtn: 'Settings',

        // Current command display
        currentCommand: 'Current Command:',
        cmdNone: 'None',

        // System Control
        systemControl: 'System Control',
        startExperiment: 'Start Experiment',
        stopExperiment: 'Stop Experiment',
        clearFaults: 'Clear Faults',

        // Power & Servo Control
        powerServoControl: 'Power & Servo Control',
        driverPower: 'Driver Power',
        servoModule: 'Servo Module',
        off: 'OFF',
        on: 'ON',

        // Axis Movement
        axisMovement: 'Axis Movement',
        xyAxisControl: 'X/Y Axis Control',
        zAxisControl: 'Z Axis Control',
        inactive: 'Inactive',
        active: 'Active',

        // Position Control
        positionControl: 'Position Control',
        xPositionMove: 'X Position Move',
        yPositionMove: 'Y Position Move',
        zPositionMove: 'Z Position Move',
        xyPositionMove: 'XY Position Move',

        // Function Control
        functionControl: 'Function Control',
        precisionAlign: 'Precision Align',
        tensionSetting: 'Tension Setting',
        tensionReset: 'Tension Reset',

        // Emergency Stops
        emergencyStops: 'Emergency Stops',
        stopXAxis: 'Stop X-Axis',
        stopYAxis: 'Stop Y-Axis',
        stopZAxis: 'Stop Z-Axis',
        stopXYZ: 'STOP XYZ',
        emergencyStop: 'Emergency Stop + Clear Pulse',

        // Monitor tab
        statusMonitoring: 'Status Monitoring',
        systemStatusIndicators: 'System Status Indicators (40 Boolean Values)',
        statusValues: 'Status Values (10 Integers)',
        logTitle: 'Log',

        // Boolean status labels
        boolLabels: [
            'X Pos Complete', 'Y Pos Complete', 'Z Pos Complete',
            'X Calibrated', 'Y Calibrated', 'Z Status',
            'X Servo Active', 'Y Servo Active', 'Z Servo Active',
            'X+ Hard Limit', 'X- Hard Limit', 'Y+ Hard Limit', 'Y- Hard Limit',
            'X+ Soft Limit', 'X- Soft Limit', 'Y Soft Status', 'Z Soft Status',
            'Force Exp Active', 'Precision Align', 'Abs Pos Move', 'Emergency Stop',
            'Status 21', 'Status 22', 'Status 23', 'Status 24',
            'Status 25', 'Status 26', 'Status 27', 'Status 28',
            'Status 29', 'Status 30', 'Status 31', 'Status 32',
            'Status 33', 'Status 34', 'Status 35', 'Status 36',
            'Status 37', 'Status 38', 'Status 39', 'Status 40'
        ],

        // Integer status labels
        intLabels: [
            'Current X Pos', 'Current Y Pos', 'Current Z Pos',
            'Current Speed', 'Force Value', 'Tension Value',
            'Status Int 6', 'Status Int 7', 'Status Int 8', 'Status Int 9'
        ],

        // Settings window
        configurationSettings: 'Configuration Settings',
        theme: 'Theme',
        language: 'Language',
        connectionSettings: 'Connection Settings',
        protocol: 'Protocol:',
        tcp: 'TCP',
        udp: 'UDP',
        tcpDescription: 'TCP (Reliable, Connection-Oriented)',
        udpDescription: 'UDP (Fast, Connectionless)',
        tcpSettings: 'TCP Settings',
        tcpHost: 'TCP Host:',
        tcpServerPort: 'TCP Server Port:',
        tcpClientPort: 'TCP Client Port:',
        tcpClientPortHint: '0=auto (recommended)',
        tcpTimeWaitWarning: '⚠️ Specific ports may require 30s wait after disconnect due to TIME_WAIT state',
        udpSettings: 'UDP Settings',
        udpListeningPort: 'UDP Listening Port:',
        udpListeningPortHint: 'Local port to receive data',
        udpTargetHost: 'UDP Target Host:',
        udpTargetHostHint: 'Remote host to send data',
        udpTargetPort: 'UDP Target Port:',
        udpTargetPortHint: 'Remote port to send data',
        host: 'Host:',
        port: 'Port:',
        connect: 'Connect',
        disconnect: 'Disconnect',
        sendDataDebug: 'Send Data (Debug)',

        // Control Parameters
        controlParameters: 'Control Parameters',
        speedControl: 'Speed Control',
        speedMode: 'Speed Mode:',
        speedModeTooltip: '0:Low 1:Med 2:High 3:CustomXY 4:CustomForce',
        speedModeLow: 'Low Speed (Preset)',
        speedModeMed: 'Med Speed (Preset)',
        speedModeHigh: 'High Speed (Preset)',
        speedModeCustom2D: 'Custom 2D Speed',
        speedModeCustomForce: 'Custom Force Speed',
        targetSpeed: 'Target Speed:',
        custom2DSpeed: 'Custom 2D Speed:',
        customForceSpeed: 'Custom Force Speed:',
        speedPresetNote: '(Preset - Target Speed ignored)',
        positionControl: 'Position Control',
        targetX: 'Target X:',
        targetY: 'Target Y:',
        targetZ: 'Target Z:',
        operationSettings: 'Operation Settings',
        operationMode: 'Operation Mode:',
        pidParameter: 'PID Set',
        reserved: 'Reserved',
        forceControl: 'Force Control',
        targetForce: 'Target Force:',
        tensionControl: 'Tension Control',
        targetTension: 'Target Tension:',
        customParameters: 'Custom Parameters',
        customParam1: 'Custom Param 1:',
        customParam2: 'Custom Param 2:',
        customParam3: 'Custom Param 3:',
        customParam4: 'Custom Param 4:',
        customParam5: 'Custom Param 5:',
        communicationControl: 'Communication & Control',
        commFlag: 'Comm Flag:',
        commFlagTooltip: '0:No Connection, 1234:Connected',
        controlCommand: 'Control Command:',

        // Unit hints
        unitRange04: '0-4',
        unitMmS: 'mm/s',
        unitMm: 'mm',
        unitStatus: 'Status',
        unitCmdId: 'Cmd ID',

        // Motion Capture
        mocapTitle: 'Motion Capture',
        mocapConnectionSettings: 'Connection Settings',
        mocapMulticast: 'Multicast Group:',
        mocapPort: 'Port:',
        mocapConnect: 'Connect',
        mocapDisconnect: 'Disconnect',
        mocapStatus: 'Status:',
        mocapDataControl: 'Data Control',
        mocapEnableSending: 'Enable Mocap Data Sending',
        mocapRigidBody: 'Rigid Body:',
        mocapNoRigidBody: '-- No Rigid Body --',
        mocapOffsets: 'Position Offsets (mm)',
        mocapOffsetX: 'X Offset:',
        mocapOffsetY: 'Y Offset:',
        mocapOffsetZ: 'Z Offset:',
        mocapLiveData: 'Live Data',
        mocapPosition: 'Position (mm)',
        mocapVelocity: 'Velocity (mm/s)',
        mocapSendValues: 'Send Values (int-10 to int-15)',
        mocapRawData: 'Raw Data (Debug)',
        mocapRawPosition: 'Raw Position:',
        mocapRawVelocity: 'Raw Velocity:',

        // Command names
        commands: {
            1: 'Start Experiment',
            2: 'Stop Experiment',
            3: 'Driver Power ON',
            4: 'Driver Power OFF',
            5: 'Servo Module ON',
            6: 'Servo Module OFF',
            7: 'X+',
            8: 'X-',
            9: 'Y+',
            10: 'Y-',
            11: 'Z+',
            12: 'Z-',
            13: 'X Position Move',
            14: 'Stop X-Axis',
            15: 'Y Position Move',
            16: 'Stop Y-Axis',
            17: 'Z Position Move',
            18: 'Stop Z-Axis',
            19: 'STOP XYZ',
            20: 'XY Position Move',
            21: 'Precision Align',
            22: 'Tension Setting',
            23: 'Emergency Stop + Clear Pulse',
            24: 'Tension Reset',
            30: 'Clear Faults'
        }
    },

    'zh': {
        // Window titles
        mainTitle: '设备控制面板',
        settingsTitle: '设置 - 设备控制面板',

        // Status bar
        connection: '连接状态:',
        disconnected: '已断开',
        connected: '已连接',
        autoSend50Hz: '自动发送 (50Hz)',
        autoSend: '自动发送',
        debugEcho: '调试回显',

        // Tabs
        tabCommands: '控制命令',
        tabMonitor: '监控',
        tabMocap: '动作捕捉',
        settingsBtn: '设置',

        // Current command display
        currentCommand: '当前命令:',
        cmdNone: '无',

        // System Control
        systemControl: '系统控制',
        startExperiment: '开始实验',
        stopExperiment: '停止实验',
        clearFaults: '清除故障',

        // Power & Servo Control
        powerServoControl: '电源和伺服控制',
        driverPower: '驱动器电源',
        servoModule: '伺服模块',
        off: '关',
        on: '开',

        // Axis Movement
        axisMovement: '轴运动',
        xyAxisControl: 'X/Y轴控制',
        zAxisControl: 'Z轴控制',
        inactive: '未激活',
        active: '激活',

        // Position Control
        positionControl: '位置控制',
        xPositionMove: 'X位置移动',
        yPositionMove: 'Y位置移动',
        zPositionMove: 'Z位置移动',
        xyPositionMove: 'XY位置移动',

        // Function Control
        functionControl: '功能控制',
        precisionAlign: '精密对准',
        tensionSetting: '张力设置',
        tensionReset: '张力复位',

        // Emergency Stops
        emergencyStops: '紧急停止',
        stopXAxis: '停止X轴',
        stopYAxis: '停止Y轴',
        stopZAxis: '停止Z轴',
        stopXYZ: '停止XYZ',
        emergencyStop: '紧急停止 + 清除脉冲',

        // Monitor tab
        statusMonitoring: '状态监控',
        systemStatusIndicators: '系统状态指示器（40个布尔值）',
        statusValues: '状态值（10个整数）',
        logTitle: '日志',

        // Boolean status labels
        boolLabels: [
            '二维实验中', '恒力实验中', '平移x+',
            '平移x-', '平移y+', '平移y-',
            '平移z+', '平移z-', '位置移动x开始',
            '位置移动y开始', '位置移动z开始', '位置移动x完成', '位置移动y完成',
            '位置移动z完成', '已标定X', '已标定Y', '二维上电状态X',
            '二维上电状态Y', '恒力上电状态Z', '二维伺服状态X', '二维伺服状态Y',
            '恒力伺服状态Z', '二维硬限位X+', '二维硬限位X-', '二维硬限位Y+',
            '二维硬限位Y-', '精对准', '设定拉力', '二维绝对位置移动',
            '恒力绝对位置移动', '二维绝对位置移动结束', '恒力绝对位置移动结束', '急停反馈',
            '二维软限位X+', '二维软限位X-', '二维软限位Y+', '二维软限位Y-',
            '恒力软限位Z+', '恒力软限位Z-', '传感器故障'
        ],

        // Integer status labels
        intLabels: [
            '当前X位置', '当前Y位置', '当前Z位置',
            '当前速度', '力值', '张力值',
            '状态整数6', '状态整数7', '状态整数8', '状态整数9'
        ],

        // Settings window
        configurationSettings: '配置设置',
        theme: '主题',
        language: '语言',
        connectionSettings: '连接设置',
        protocol: '协议:',
        tcp: 'TCP',
        udp: 'UDP',
        tcpDescription: 'TCP (可靠、面向连接)',
        udpDescription: 'UDP (快速、无连接)',
        tcpSettings: 'TCP设置',
        tcpHost: 'TCP主机:',
        tcpServerPort: 'TCP服务器端口:',
        tcpClientPort: 'TCP客户端端口:',
        tcpClientPortHint: '0=自动分配（推荐）',
        tcpTimeWaitWarning: '⚠️ 特定端口在断开连接后可能需要等待30秒（TIME_WAIT状态）',
        udpSettings: 'UDP设置',
        udpListeningPort: 'UDP监听端口:',
        udpListeningPortHint: '接收数据的本地端口',
        udpTargetHost: 'UDP目标主机:',
        udpTargetHostHint: '发送数据的远程主机',
        udpTargetPort: 'UDP目标端口:',
        udpTargetPortHint: '发送数据的远程端口',
        host: '主机:',
        port: '端口:',
        connect: '连接',
        disconnect: '断开',
        sendDataDebug: '发送数据（调试）',

        // Control Parameters
        controlParameters: '控制参数',
        speedControl: '速度控制',
        speedMode: '速度模式:',
        speedModeTooltip: '0:低速 1:中速 2:高速 3:自定义XY 4:自定义力',
        speedModeLow: '低速（预设）',
        speedModeMed: '中速（预设）',
        speedModeHigh: '高速（预设）',
        speedModeCustom2D: '自定义2D速度',
        speedModeCustomForce: '自定义恒力速度',
        targetSpeed: '目标速度:',
        custom2DSpeed: '自定义2D速度:',
        customForceSpeed: '自定义恒力速度:',
        speedPresetNote: '（预设 - 目标速度被忽略）',
        positionControl: '位置控制',
        targetX: '目标X:',
        targetY: '目标Y:',
        targetZ: '目标Z:',
        operationSettings: '操作设置',
        operationMode: '操作模式:',
        pidParameter: 'PID设定',
        reserved: '保留',
        forceControl: '力控制',
        targetForce: '目标力:',
        tensionControl: '张力控制',
        targetTension: '目标张力:',
        customParameters: '自定义参数',
        customParam1: '自定义参数1:',
        customParam2: '自定义参数2:',
        customParam3: '自定义参数3:',
        customParam4: '自定义参数4:',
        customParam5: '自定义参数5:',
        communicationControl: '通信与控制',
        commFlag: '通信标志:',
        commFlagTooltip: '0:无连接, 1234:已连接',
        controlCommand: '控制命令:',

        // Unit hints
        unitRange04: '0-4',
        unitMmS: '毫米/秒',
        unitMm: '毫米',
        unitStatus: '状态',
        unitCmdId: '命令ID',

        // Motion Capture
        mocapTitle: '动作捕捉',
        mocapConnectionSettings: '连接设置',
        mocapMulticast: '组播地址:',
        mocapPort: '端口:',
        mocapConnect: '连接',
        mocapDisconnect: '断开',
        mocapStatus: '状态:',
        mocapDataControl: '数据控制',
        mocapEnableSending: '启用动捕数据发送',
        mocapRigidBody: '刚体:',
        mocapNoRigidBody: '-- 无刚体 --',
        mocapOffsets: '位置偏移 (毫米)',
        mocapOffsetX: 'X偏移:',
        mocapOffsetY: 'Y偏移:',
        mocapOffsetZ: 'Z偏移:',
        mocapLiveData: '实时数据',
        mocapPosition: '位置 (毫米)',
        mocapVelocity: '速度 (毫米/秒)',
        mocapSendValues: '发送值 (int-10 到 int-15)',
        mocapRawData: '原始数据 (调试)',
        mocapRawPosition: '原始位置:',
        mocapRawVelocity: '原始速度:',

        // Command names
        commands: {
            1: '开始实验',
            2: '停止实验',
            3: '驱动器电源开',
            4: '驱动器电源关',
            5: '伺服模块开',
            6: '伺服模块关',
            7: 'X+',
            8: 'X-',
            9: 'Y+',
            10: 'Y-',
            11: 'Z+',
            12: 'Z-',
            13: 'X位置移动',
            14: '停止X轴',
            15: 'Y位置移动',
            16: '停止Y轴',
            17: 'Z位置移动',
            18: '停止Z轴',
            19: '停止XYZ',
            20: 'XY位置移动',
            21: '精密对准',
            22: '张力设置',
            23: '紧急停止 + 清除脉冲',
            24: '张力复位',
            30: '清除故障'
        }
    }
};

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LOCALES;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.LOCALES = LOCALES;
}
