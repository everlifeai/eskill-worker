'use strict'
const request = require('request')
const cote = require('cote')({ statusLogsEnabled: false })
require('dotenv').config()
const HttpStatus = require('http-status-codes')
const keyMapper = require('./keymaper')
const u = require('elife-utils')

const serviceGateway = process.env.EVERLIFE_SERVICE_GATEWAY ? process.env.EVERLIFE_SERVICE_GATEWAY : "http://149.202.214.34:3000"
let authChallenge
let stellarAccount

const ssbClient = new cote.Requester({
  name: 'elife-worker-util -> SSB',
  key: 'everlife-ssb-svc'
})

const stellarClient = new cote.Requester({
  name: 'elife-worker-util -> Stellar',
  key: 'everlife-stellar-svc'
})

/** /outcome
 *  Load the auth challange for everlife service gateway
 *  and load the stealler public key for payment
 */
function loadConfig () {
  ssbClient.send({ type: 'everlife-service-auth' }, (err, res) => {
    if (err) u.showErr(err)
    else {
      authChallenge = res
    }
  })

  stellarClient.send({ type: 'account-id' }, (err, acc_) => {
    if (err) u.showErr(err)
    else {
      stellarAccount = acc_
    }
  })
}

function getEnrollmentStatus (cb) {
  if (!serviceGateway) { cb('Please add everlife service gateway..') } else if (!authChallenge) { cb('Auth challenge is missing for everlife service gateway.') } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['uri'] = `${serviceGateway}/wf/enroll`
    options['method'] = 'GET'
    request(options, (err, response, body) => {
      if (err) { cb(err) } else { cb(null, getJobList(response.body)) }
    })
  }
}

function getJobList(data){
  console.log( JSON.parse(data))
  let groups = JSON.parse(data).groups;
  let jobDetails = '';
  if(!groups) return 'No jobs available at this moment.'
  else{
      for(let i = 0; i < groups.length; i++){
        jobDetails += groups[i].id + ' - ' + groups[i].name + '\n';
      }
  }
  return jobDetails;
}

function enrollGroup (groupId, cb) {
  if (!serviceGateway) { cb('Please add everlife service gateway..') } else if (!authChallenge) { cb('Auth challenge is missing for everlife service gateway.') } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['uri'] = `${serviceGateway}/wf/enroll/${groupId}`
    options['method'] = 'POST'
    options['json'] = { wallet: stellarAccount }
    request(options, (err, response, body) => {
      if (err) { cb(err) } else {
        if (response.statusCode === HttpStatus.CONFLICT) {
          cb(null, 'Already enrolled.')
        } else if (response.statusCode === HttpStatus.OK) {
          cb(null, 'Enrolled successfully.')
        } else {
          cb(null, 'Something went wrong.')
        }
      }
    })
  }
}

function deEnrollGroup (groupId, cb) {
  if (!serviceGateway) { cb('Please add everlife service gateway..') } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['uri'] = `${serviceGateway}/wf/enroll/${groupId}`
    options['method'] = 'DELETE'
    request(options, (err, response, body) => {
      if (err) cb(err)
      else cb(null, response.body)
    })
  }
}

function availableJobs (cb) {
  if (!serviceGateway) { cb('Please add everlife service gateway..') } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['uri'] = `${serviceGateway}/wf/jobs`
    options['method'] = 'GET'
    request(options, (err, response, body) => {
      if (err) cb(err)
      else cb(null, response.body)
    })
  }
}
function claimJob (jobId, cb) {
  if (!stellarAccount) {
    cb('Stellar address is missing.')
  } else if (!serviceGateway) {
    cb('Please add everlife service gateway..')
  } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['uri'] = `${serviceGateway}/wf/jobs/${jobId}`
    options['method'] = 'POST'
    options['json'] = {
      'action': 'complete',
      'assignee': (authChallenge.key).toString(),
      'variables': [
        { 'name': 'worker_payaddress', 'value': stellarAccount },
        { 'name': 'worker_id', 'value': keyMapper.toUrlSafeEd25519Key(authChallenge.key)
        }]
    }
    console.log(options)
    request(options, (err, response, body) => {
      if (err) cb(err)
      else cb(null, response.body)
    })
  }
}

function availableTasks (cb) {
  if (!serviceGateway) {
    cb('Please add everlife service gateway..')
  } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['uri'] = `${serviceGateway}/wf/task`
    options['method'] = 'GET'
    console.log(options)
    request(options, (err, response, body) => {
      if (err) cb(err)
      else cb(null, response.body)
    })
  }
}
function sumbitTask (taskId, result, cb) {
  console.log(taskId)
  console.log(JSON.stringify(result))
  if (!serviceGateway) { cb('Please add everlife service gateway..') } else {
    let options = {
      'auth': {
        'user': authChallenge.key,
        'password': authChallenge.signed,
        'sendImmediately': true
      }
    }
    options['json'] = {
      'action': 'complete',
      'variables': [
        { 'name': 'work_result', 'value': JSON.stringify(result) }
      ]
    }
    options['uri'] = `${serviceGateway}/wf/task/${taskId}`
    options['method'] = 'POST'
    request(options, (err, response, body) => {
      if (err) cb(err)
      else cb(null, response.body)
    })
  }
}

module.exports = {
  sumbitTask,
  availableTasks,
  availableJobs,
  claimJob,
  enrollGroup,
  deEnrollGroup,
  getEnrollmentStatus,
  loadConfig
}
