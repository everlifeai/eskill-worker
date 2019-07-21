'use strict'
let util = require('./util')
const CronJob = require('cron').CronJob
const cote = require('cote')({ statusLogsEnabled: false })
/**
 * /outcome
 * Every one hour once fetch the jobs and claim the available jobs.
 * Fetch all the available task for this avatar and distribute
 * the task to based on skill.
 */

let REGISTRY = {}
exports.startService = function () {
  console.log('starting cronjob....')
  util.loadConfig()
  const job = new CronJob('0 */1 * * * *', function () {
    // fetch available task and execute
    util.availableTasks((err, resp) => {
      if (err) console.log(err)
      else {
        let data = JSON.parse(resp)
        let tasks = data.tasks
        console.log(tasks)
        if (tasks) {
          for (let i = 0; i < tasks.length; i++) {
            distributeTask(tasks[i])
          }
        }
      }
    })

    function distributeTask (task) {
      if (!task.skill) return
      if (!REGISTRY[task.skill]) {
        REGISTRY[task.skill] = new cote.Requester({
          name: 'elife-worker',
          key: task.skill
        })
      }
      const worksvc = REGISTRY[task.skill]
      worksvc.send({ type: 'task', task: task }, (err, task, result) => {
        if (err) console.log(err)
        else {
          util.sumbitTask(task.id, result, (err, resp) => {
            if (err) console.log(err)
            else console.log(resp)
          })
        }
      })
    }
  })
  job.start()
}
