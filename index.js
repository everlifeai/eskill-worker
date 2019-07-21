'use strict'
const cote = require('cote')({ statusLogsEnabled: false })
const u = require('elife-utils')
const util = require('./util')
const cronJob = require('./cron')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice.
 */
function main () {
  startMicroservice()
  registerWithCommMgr()
  util.loadConfig()
  cronJob.startService()
}

/* microservice key (identity of the microservice) */
let msKey = 'everlife-work'

const commMgrClient = new cote.Requester({
  name: 'worker -> CommMgr',
  key: 'everlife-communication-svc'
})

function sendReply (msg, req) {
  req.type = 'reply'
  req.msg = String(msg)
  commMgrClient.send(req, (err) => {
    if (err) u.showErr(err)
  })
}
function startMicroservice () {
  /*      understand/
     * The microservice (partitioned by key to prevent
     * conflicting with other services).
     */
  const svc = new cote.Responder({
    name: 'Everlife worker skill',
    key: msKey
  })

  /*      outcome/
     * Respond to user messages asking us to code/decode things
     */
  svc.on('msg', (req, cb) => {
    if (!req.msg) return cb()
    if (req.msg.startsWith('/enroll')) {
      enroll(req, cb)
    } else if (req.msg.startsWith('/de_enroll')) {
      deenroll(req, cb)
    } else {
      cb()
    }
  })
}

function registerWithCommMgr () {
  commMgrClient.send({
    type: 'register-msg-handler',
    mskey: msKey,
    mstype: 'msg',
    mshelp: [ { cmd: '/secret', txt: 'encode/decode secret messages!' } ]
  }, (err) => {
    if (err) u.showErr(err)
  })
}
/**
 * /outcome
 * Fetch all the group status for enroll
 * and enroll the sepecific group
 * @param {*} req
 * @param {*} cb
 */
function enroll (req, cb) {
  if (req.msg.trim() === '/enroll') {
    util.getEnrollmentStatus((err, res) => {
      cb(null, true)
      if (err) {
        sendReply(err, req)
      } else {
        sendReply(res, req)
      }
    })
  } else if (req.msg.startsWith('/enroll')) {
    const rx = /^\/enroll  *(.*)/i
    let m = req.msg.match(rx)
    if (m && m.length == 2) {
      util.enrollGroup(m[1], (err, res) => {
        cb(null, true)
        if (err) sendReply(err, req)
        else sendReply(res, req)
      })
    } else {
      cb(null, true)
      sendReply('Enter valid group id', req)
    }
  }
}
/**
 *  /outcome
 * De-enroll the enrolled group
 * @param {*} req
 * @param {*} cb
 */

function deenroll (req, cb) {
  const rx = /^\/de_enroll  *(.*)/i
  let m = req.msg.match(rx)
  if (m && m.length == 2) {
    util.deEnrollGroup(m[1], (err, res) => {
      cb(null, true)
      sendReply(res, req)
    })
  } else {
    cb(null, true)
    sendReply('Enter valid group id', req)
  }
}

main()
