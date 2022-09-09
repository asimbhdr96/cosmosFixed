const { init: initShuttleDb } = require('./dbs/shuttle')
const createSpaceTravelEmitter = require('./private/space-travel-emitter')
const log = require('./logger')
const shuttleUtil = require('./util/shuttle')
const cadet = require('./cadet')

let shuttleArray = [];
const listen = async () => {
  const shuttleDb = await initShuttleDb()
  const spaceTravelEmitter = createSpaceTravelEmitter()
  let totalCrewCount = 0
  spaceTravelEmitter.on('space-request', async evt => {
    log('space-request', evt)
    console.log('sadfsdf',evt)
    ++totalCrewCount
    await onSpaceTravelRequested({ shuttleDb, ...evt })
  })
  spaceTravelEmitter.on('end', async evt => {
    shuttleUtil.validateShuttles({
      shuttleMap: await shuttleDb.read(),
      crewCount: totalCrewCount
    })
    log(
      [
        'no more space requests, exiting.',
        `db can be viewed: ${shuttleDb.getDbFilename()}`
      ].join(' ')
    )
  })
}

const onSpaceTravelRequested = async ({ shuttleDb, cosmonautId }) => {

  const shuttles = await shuttleDb.read()

  for(let elem in shuttles){
    typeof shuttles[elem] === 'string' ? shuttleArray.push(JSON.parse(shuttles[elem])) : shuttleArray.push(shuttles[elem])
  }

  // const availableShuttle =   [...Object.values(shuttles)].map((elem) => typeof elem === 'string' ? JSON.parse(elem) : elem)
  //   .find(({ date, remainingCapacity }) => date >= 0 && remainingCapacity > 0)

  const availableShuttle =   shuttleArray
    .find(({ date, remainingCapacity }) => date >= 0 && remainingCapacity > 0)

  if (!availableShuttle) {
    throw new Error(
      `unable to schedule cosmonautId ${cosmonautId}, no shuttles available`
    )
  }
  log(
    `found shuttle for cosmonautId ${cosmonautId}, shuttle ${
      availableShuttle.name
    }`
  )

  --availableShuttle.remainingCapacity
  availableShuttle.crew.push(cosmonautId)
  await shuttleDb.write(availableShuttle.name, JSON.stringify(availableShuttle))

  await cadet.logWelcomeLetter({ cosmonautId, shuttle: availableShuttle })
}

module.exports = {
  listen
}
