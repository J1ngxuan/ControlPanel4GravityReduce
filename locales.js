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

        // Tabs
        tabCommands: 'Control Commands',
        tabMonitor: 'Monitor',
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

        // Position & Special Functions
        positionSpecialFunctions: 'Position & Special Functions',
        xyPositionMove: 'XY Position Move',
        precisionAlign: 'Precision Align',
        tensionSetting: 'Tension Setting',

        // Emergency Stops
        emergencyStops: 'Emergency Stops',
        stopZAxis: 'Stop Z-axis',
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
        host: 'Host:',
        port: 'Port:',
        connect: 'Connect',
        disconnect: 'Disconnect',

        // Control Parameters
        controlParameters: 'Control Parameters',
        speedControl: 'Speed Control',
        speedMode: 'Speed Mode:',
        targetSpeed: 'Target Speed:',
        positionControl: 'Position Control',
        targetX: 'Target X:',
        targetY: 'Target Y:',
        targetZ: 'Target Z:',
        operationSettings: 'Operation Settings',
        operationMode: 'Operation Mode:',
        pidParameter: 'PID Parameter:',
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
            18: 'Stop Z-axis',
            19: 'STOP XYZ',
            20: 'XY Position Move',
            21: 'Precision Align',
            22: 'Tension Setting',
            23: 'Emergency Stop + Clear Pulse',
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

        // Tabs
        tabCommands: '控制命令',
        tabMonitor: '监控',
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

        // Position & Special Functions
        positionSpecialFunctions: '位置和特殊功能',
        xyPositionMove: 'XY位置移动',
        precisionAlign: '精密对准',
        tensionSetting: '张力设置',

        // Emergency Stops
        emergencyStops: '紧急停止',
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
            'X位置完成', 'Y位置完成', 'Z位置完成',
            'X已校准', 'Y已校准', 'Z状态',
            'X伺服激活', 'Y伺服激活', 'Z伺服激活',
            'X+硬限位', 'X-硬限位', 'Y+硬限位', 'Y-硬限位',
            'X+软限位', 'X-软限位', 'Y软状态', 'Z软状态',
            '力实验激活', '精密对准', '绝对位置移动', '紧急停止',
            '状态21', '状态22', '状态23', '状态24',
            '状态25', '状态26', '状态27', '状态28',
            '状态29', '状态30', '状态31', '状态32',
            '状态33', '状态34', '状态35', '状态36',
            '状态37', '状态38', '状态39', '状态40'
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
        host: '主机:',
        port: '端口:',
        connect: '连接',
        disconnect: '断开',

        // Control Parameters
        controlParameters: '控制参数',
        speedControl: '速度控制',
        speedMode: '速度模式:',
        targetSpeed: '目标速度:',
        positionControl: '位置控制',
        targetX: '目标X:',
        targetY: '目标Y:',
        targetZ: '目标Z:',
        operationSettings: '操作设置',
        operationMode: '操作模式:',
        pidParameter: 'PID参数:',
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
            18: '停止Z轴',
            19: '停止XYZ',
            20: 'XY位置移动',
            21: '精密对准',
            22: '张力设置',
            23: '紧急停止 + 清除脉冲',
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
