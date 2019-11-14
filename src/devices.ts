import {SmartHomeV1SyncDevices} from "actions-on-google";
// import * as http from 'http'
import * as fs from 'fs'

/*
https://developers.google.com/assistant/smarthome/traits/
 */


interface Device {
    id: string
    sync(): SmartHomeV1SyncDevices
    state(): any
    execute(action: string, params: any): void
}

class Oven implements Device {
    constructor(public id: string) {
    }

    private stateOn: boolean = false;
    private stateTemperature: number = 50;
    private stateTimerRemaining: number = 0;
    private statePaused: boolean = false;

    sync(): SmartHomeV1SyncDevices {
        return {
            id: this.id,
            type: 'action.devices.types.OVEN',
            traits: [
                'action.devices.traits.TemperatureControl',
                'action.devices.traits.StartStop',
                'action.devices.traits.Timer'
            ],
            name: {
                defaultNames: ['Oven'],
                name: 'Oven',
                nicknames: ['oven']
            },
            willReportState: true,
            attributes: {
                temperatureUnitForUX: 'C',
                temperatureRange: {
                    minThresholdCelsius: 65,
                    maxThresholdCelsius: 300
                },
                temperatureStepCelsius: 5,
                pausable: false,
                maxTimerLimitSec: 3600,
                commandOnlyTimer: false
            }
        }
    }

    state(): any {
        return {
            online: true,
            isRunning: this.stateOn,
            isPaused: this.statePaused,
            temperatureSetpointCelsius: this.stateTemperature,
            timerRemainingSec: this.stateTimerRemaining,
            // timerPaused: this.statePaused,
            // timerSec: this.stateTimerSeconds
        }
    }

    execute(action: string, params: any): void {
        switch (action) {
            case 'action.devices.commands.StartStop':
                this.stateOn = params.start;
                this.statePaused = false;
                this.stateTimerRemaining = 1000;
                break;
            case 'action.devices.commands.TimerStart':
                this.stateTimerRemaining = params.timerTimeSec;
                this.statePaused = false;
                break;
            case 'action.devices.commands.TimerAdjust':
                this.stateTimerRemaining = params.timerTimeSec;
                break;
            case 'action.devices.commands.TimerPause':
                this.statePaused = true;
                break;
            case 'action.devices.commands.TimerCancel':
                this.statePaused = false;
                this.stateTimerRemaining = 0;
        }
    }
}

class Light implements Device {
    constructor(public id: string) {
    }

    private _stateOn: boolean = false;
    private stateTimerRemaining: number = -1;
    private timerID: any = 0;

    private get stateOn(): boolean {
        return this._stateOn
    }
    private set stateOn(s: boolean) {
        this._stateOn = s;
        let path = `/sys/class/gpio/gpio0/value`;
        fs.writeFileSync(path, s ? '1': '0');
    }

    sync(): SmartHomeV1SyncDevices {
        return {
            id: this.id,
            name: {
                defaultNames: ['Lights'],
                name: 'Lights',
                nicknames:['lights']},
            type: 'action.devices.types.LIGHT',
            traits: [
                'action.devices.traits.OnOff',
                'action.devices.traits.Timer'
            ],
            attributes: {
                pausable: false,
                maxTimerLimitSec: 7200,
                commandOnlyTimer: false
            },
            willReportState: true,
        };
    }

    execute(action: string, params: any): void {
        switch (action) {
            case 'action.devices.commands.OnOff':
                this.stateOn = params.on;
                break;
            case 'action.devices.commands.TimerStart':
                this.stateTimerRemaining = params.timerTimeSec;
                clearTimeout(this.timerID);
                this.timerID = setTimeout(() => {
                    this.stateOn = false
                }, this.stateTimerRemaining * 1000);
                break;
            case 'action.devices.commands.TimerCancel':
                this.stateTimerRemaining = -1;
                clearTimeout(this.timerID);
        }
    }

    state(): any {
        return {
            online: true,
            on: this.stateOn,
            timerRemainingSec: this.stateTimerRemaining
        }
    }
}

class Switch implements Device {
    constructor(public id: string) {
    }

    private stateOn: boolean = false;

    sync(): SmartHomeV1SyncDevices {
        return {
            id: this.id,
            type: 'action.devices.types.SWITCH',
            traits: ['action.devices.traits.OnOff'],
            name: {
                defaultNames: ['Smart Switch'],
                name: 'Smart Switch',
                nicknames: ['smart switch'],
            },
            willReportState: true,
        };
    }

    state(): any {
        return {
            on: this.stateOn
        }
    }

    execute(action: string, params: any): void {
        console.log('EXECUTE', action, params);
        if (action === 'action.devices.commands.OnOff') {
            this.stateOn = params.on;
        }

        let map:any = {
            'sw1': '0',
            'sw2': '1',
        };
        let path = `/sys/class/gpio/gpio${map[this.id]}/value`;
        fs.writeFileSync(path, this.stateOn ? '1': '0');
    }
}


export const myDevices: Map<string, Device> = new Map<string, Device>();

(new Array<Device>(
    new Switch('sw1'),
    new Switch('sw2'),
    new Oven('ov1'),
    new Light('lh1')
)).forEach((d: Device) => {
    myDevices.set(d.id, d)
});

