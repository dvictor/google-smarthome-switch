/* Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Modified by Victor Dramba 2019
 */

/**
 * This is the main server code that processes requests and sends responses
 * back to users and to the HomeGraph.
 */

// Express imports
import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as morgan from 'morgan'
import {AddressInfo} from 'net'
// import * as http from 'http'
// Smart home imports
import {
  smarthome,
  SmartHomeV1ExecuteResponseCommands,
  SmartHomeV1SyncDevices,
} from 'actions-on-google'
// Local imports
import * as Auth from './auth-provider'
import * as Config from './config-provider'

const expressApp = express()
expressApp.use(cors())
expressApp.use(morgan('dev'))
expressApp.use(bodyParser.json())
expressApp.use(bodyParser.urlencoded({extended: true}))
expressApp.set('trust proxy', 1)

Auth.registerAuthEndpoints(expressApp)

let jwt
try {
  jwt = require('./smart-home-key.json')
} catch (e) {
  console.warn('Service account key is not found')
  console.warn('Report state and Request sync will be unavailable')
}

const app = smarthome({
  jwt,
  debug: true,
})

let swOn = false
function swState(state: boolean) {
  swOn = state
  // http.get('http://localhost:3001/' + (swOn ? 'on' : 'off'))
}

// Array could be of any type
// tslint:disable-next-line
async function asyncForEach(array: any[], callback: Function) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}


app.onSync(async (body, headers) => {
  const device:SmartHomeV1SyncDevices = {
    id: 'jgk',
    type: 'action.devices.types.SWITCH',
    traits: ['action.devices.traits.OnOff'],
    name: {
      defaultNames: ['Smart Switch'],
      name: 'Smart Switch',
      nicknames: ['smart switch'],
    },
    deviceInfo: {
      manufacturer: 'L',
      model: 'L',
      hwVersion: '1.0.0',
      swVersion: '2.0.0',
    },
    willReportState: true,
    // attributes: [],
    // otherDeviceIds: [],
    customData: undefined,
  }

  return {
    requestId: body.requestId,
    payload: {
      agentUserId: '1234',
      devices: [device],
    },
  }
})

interface DeviceStatesMap {
  // tslint:disable-next-line
  [key: string]: any
}
app.onQuery(async (body, headers) => {
  const deviceStates: DeviceStatesMap = {}
  const {devices} = body.inputs[0].payload
  await asyncForEach(devices, async (device: {id: string}) => {
    deviceStates[device.id] = {on: swOn}
  })
  return {
    requestId: body.requestId,
    payload: {
      devices: deviceStates,
    },
  }
})

app.onExecute(async (body, headers) => {
  const commands: SmartHomeV1ExecuteResponseCommands[] = []
  const successCommand: SmartHomeV1ExecuteResponseCommands = {
    ids: [],
    status: 'SUCCESS',
    states: {},
  }

  const {devices, execution} = body.inputs[0].payload.commands[0]
  await asyncForEach(devices, async (device: {id: string}) => {
    try {
      if (execution[0].command === 'action.devices.commands.OnOff') {
        swState(execution[0].params.on)
      }
      const states = {on: swOn}
      successCommand.ids.push(device.id)
      successCommand.states = states

      // Report state back to Homegraph
      await app.reportState({
        agentUserId: '1234',
        requestId: Math.random().toString(),
        payload: {
          devices: {
            states: {
              [device.id]: states,
            },
          },
        },
      })
      console.log('device state reported:', states)
    } catch (e) {
      if (e.message === 'pinNeeded') {
        commands.push({
          ids: [device.id],
          status: 'ERROR',
          errorCode: 'challengeNeeded',
          challengeNeeded: {
            type: 'pinNeeded',
          },
        })
        return
      } else if (e.message === 'challengeFailedPinNeeded') {
        commands.push({
          ids: [device.id],
          status: 'ERROR',
          errorCode: 'challengeNeeded',
          challengeNeeded: {
            type: 'challengeFailedPinNeeded',
          },
        })
        return
      } else if (e.message === 'ackNeeded') {
        commands.push({
          ids: [device.id],
          status: 'ERROR',
          errorCode: 'challengeNeeded',
          challengeNeeded: {
            type: 'ackNeeded',
          },
        })
        return
      }
      commands.push({
        ids: [device.id],
        status: 'ERROR',
        errorCode: e.message,
      })
    }
  })

  if (successCommand.ids.length) {
    commands.push(successCommand)
  }

  return {
    requestId: body.requestId,
    payload: {
      commands,
    },
  }
})

app.onDisconnect(async (body, headers) => {
})

expressApp.post('/smarthome', app)


expressApp.post('/smarthome/update', async (req, res) => {
  console.log('SSS update')
  console.log(req.body)
  const {userId, deviceId, name, nickname, states, localDeviceId, errorCode, tfa} = req.body
  try {
    console.log('Update:', userId, deviceId, name, nickname, states, localDeviceId, errorCode, tfa)
    if (localDeviceId || localDeviceId === null) {
      await app.requestSync(userId)
    }
    if (states !== undefined) {
      await app.reportState({
        agentUserId: userId,
        requestId: Math.random().toString(),
        payload: {
          devices: {
            states: {
              [deviceId]: states,
            },
          },
        },
      })
      console.log('device state reported:', states)
    }
    res.status(200).send('OK')
  } catch(e) {
    console.error(e)
    res.status(400).send(`Error updating device: ${e}`)
  }
})

expressApp.post('/smarthome/create', async (req, res) => {
  const {userId, data} = req.body
  console.log('Create:', data)
  try {
    await app.requestSync(userId)
  } catch(e) {
    console.error(e)
  } finally {
    res.status(200).send('OK')
  }
})

expressApp.post('/smarthome/delete', async (req, res) => {
  const {userId, deviceId} = req.body
  try {
    console.log('Delete:', deviceId)
    await app.requestSync(userId)
  } catch(e) {
    console.error(e)
  } finally {
    res.status(200).send('OK')
  }
})

const appPort = process.env.PORT || Config.expressPort

const expressServer = expressApp.listen(appPort, async () => {
  const server = expressServer.address() as AddressInfo
  const {address, port} = server

  console.log(`Smart home server listening at ${address}:${port}`)
})
