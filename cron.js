'use strict'
let util = require('./util')
const CronJob = require('cron').CronJob
const cote = require('cote')({statusLogsEnabled:false})
/**
 * /outcome
 * Every one hour once fetch the jobs and claim the available jobs.
 * Fetch all the available task for this avatar and distribute
 * the task to based on skill.
 */
exports.startService = function(){
    console.log('starting cronjob....')
    util.loadConfig()
    const job = new CronJob('0 */1 * * * *', function() {
        //fetch available jobs and claim
        util.availableJobs((err,res)=>{
            if(!err){
                console.log(res)
                let obj = JSON.parse(res)
                let jobs = obj.jobs
                for(let i=0; i < jobs.length; i++ ){
                    util.claimJob(jobs[i].id,(err,res)=>{
                        if(err) console.log(err)
                        else console.log(res)
                    })
                }
            }
        })
        //fetch available task and execute
        util.availableTasks((err, resp)=>{
            if(err) console.log(err)
            else {
                let data = JSON.parse(resp)
                let tasks = data.tasks
                for(let i=0; i < tasks.length; i++){
                    distributeTask(tasks[i])
                }
            }
            
        })

        function distributeTask(task){
            const worksvc = new cote.Requester({
                name: 'elife-worker',
                key: task.skill,
            })
            console.log(task.skill)
            worksvc.send({type: 'task',task:task},(err, result)=>{
                util.sumbitTaskFinish(task.id,result,(err,resp)=>{
                    console.log(resp)
                })
            })
        }
    })
    job.start()
}