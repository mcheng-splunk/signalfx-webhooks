const crypto = require("crypto");
const axios = require("axios");
const tc = require("timezonecomplete");   
const signalfx = require("./common/post_metrics");

axios.defaults.headers.common['Circle-Token'] = process.env.API_KEY || 12345678;

const workflow_events = []

const circleci_handleWebhook = async (req, res, next) => {
    console.log("WEBHOOK RECEIVED")
    console.log(req.headers)

    let payload = req.body
    console.log(JSON.stringify(payload))

    
    // Check signature to verify authenticity of webhook payload
    // Sample signature: 'circleci-signature': 'v1=281d91d308ef7a7e8bd7c7606353d5a2dd8d7c5f01143a98c1e8083e04f861ba',
    let signature = req.headers["circleci-signature"].substring(3)
    const key = "super-secret-1234" // Same string as used in webhook setup
    let testDigest = crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex')

    if (testDigest !== signature) {
        console.log("Webhook signature not matching")
        console.log(`Signature: ${signature}`)
        console.log(`Test digest: ${testDigest}`)
        res.status(403).send("Invalid signature")
    }

    console.log("Webhook signature and test digest are matching.")
    
    // await pusher.trigger("workflow-updates", "workflow-completed", payload)
    workflow_events.unshift(payload)    
    // res.send()


    // 18 Dec 2021
    // Workflow JSON and job JSON has some slight different information. We need to check the event header type
    // Sample workflow JSON = 'circleci-event-type': 'workflow-completed'
    // Sample job JSON      = 'circleci-event-type': 'job-completed'
    if (req.headers["circleci-event-type"].includes("workflow")){
        var event_type = "pipeline";
        var workflow_start = new tc.DateTime(payload.workflow.created_at);
        var workflow_end = new tc.DateTime(payload.workflow.stopped_at);   
        var workflow_duration = workflow_end.diff(workflow_start);  // unit-aware duration

        console.log("workflow duration hours " + workflow_duration.seconds() + "\n"); // -2

    } else {
        var event_type = "jobs";


        var start = new tc.DateTime(payload.job.started_at);
        var end = new tc.DateTime(payload.job.stopped_at);   
        var job_duration = end.diff(start);  // unit-aware duration

        console.log("job duration hours " + job_duration.seconds() + "\n"); // -2

    }


    var time=Math.floor(Date.now());
    

    var payload_array = [];


    if (req.headers["circleci-event-type"].includes("workflow")){

        var gauge_circleci_total_count_pipelines_payload = "{\"gauge\":[{\"metric\":\"gauge.circleci.total.count.pipelines\",\"value\":" + payload.pipeline.number + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name + "\"}}]}";

        var cumulative_circleci_total_time_pipelines_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.circleci.total.time.pipelines\",\"value\":" + workflow_duration + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name + "\",\"workflow.url\":\"" + payload.workflow.url + "\"}}]}";
    
    
        console.log("cumulative_circleci_total_time_pipelines_payload --->" + gauge_circleci_total_count_pipelines_payload +  "\n");
        console.log("cumulative_circleci_total_time_pipelines_payload --->" + cumulative_circleci_total_time_pipelines_payload +  "\n");


        payload_array.push(gauge_circleci_total_count_pipelines_payload);
        payload_array.push(cumulative_circleci_total_time_pipelines_payload)

    } else {

        console.log("---> \n");

        var gauge_circleci_total_count_jobs_payload = "{\"gauge\":[{\"metric\":\"gauge.circleci.total.count.jobs\",\"value\":" + payload.job.number + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name + "\",\"workflow.url\":\"" + payload.workflow.url + "\",\"job.number\":\"" + payload.job.number + "\",\"job.name\":\"" + payload.job.name + "\",\"job.status\":\"" + payload.job.status + "\"}}]}";


        var counter_circleci_total_time_jobs_payload = "{\"gauge\":[{\"metric\":\"counter.circleci.total.time.jobs\",\"value\":" + job_duration  + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name  + "\",\"counter.circleci.total.time.jobs\":\"" + job_duration + "\",\"sf_hires\":\"" +  "1\",\"workflow.url\":\"" + payload.workflow.url + "\",\"job.name\":\"" + payload.job.name + "\",\"job.status\":\"" + payload.job.status + "\"}}]}";

        var cumulative_circleci_total_time_jobs_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.circleci.total.time.jobs\",\"value\":" + job_duration + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name + "\",\"workflow.url\":\"" + payload.workflow.url + "\",\"job.name\":\"" + payload.job.name + "\",\"job.status\":\"" + payload.job.status + "\"}}]}";


        console.log("counter_circleci_total_time_jobs_payload --->" + counter_circleci_total_time_jobs_payload +  "\n");
        console.log("gauge_circleci_total_count_jobs_payload --->" + gauge_circleci_total_count_jobs_payload +  "\n");
        console.log("cumulative_circleci_total_time_jobs_payload --->" + cumulative_circleci_total_time_jobs_payload +  "\n");

        payload_array.push(counter_circleci_total_time_jobs_payload);
        payload_array.push(gauge_circleci_total_count_jobs_payload);
        payload_array.push(cumulative_circleci_total_time_jobs_payload);
    }
    
    // Send metrics to O11y 
    signalfx.send_metrics(payload_array)
    

    // // ******************************************************
    // // Send Json for Observabiltiy Cloud 
    // // ******************************************************
    // console.log("Array has ", payload_array.length , "\n")
    // for (i = 0; i < payload_array.length; i++) {
    //     axios
    //     ({  
    //         method: "post",
    //         url: `https://ingest.${process.env.SIGNALFX_REGION}.signalfx.com/v2/datapoint`,
    //         data: payload_array[i],
    //         headers: {'X-SF-TOKEN': `${process.env.SIGNALFX_TOKEN}`,
    //                     'Content-Type': 'application/json' }

    //     })
    //     .then(res  => {
    //         console.log(`signalfx statusCode: ${res.status}`)
    //     // console.log(res)
    //     })
    //     .catch(error => {
    //         console.error(error)
    //     })
    // }
    // next() 
}

const circleci_getworkflows = async (req, res) => {
    let payload = req.body
    console.log(JSON.stringify(payload))
    console.log(workflow_events)
    res.send(workflow_events)
}


const ping = async (req, res, next) => {
    let payload = req.body
    console.log(JSON.stringify(payload))
    res.send("pong")
    next()
  
}

module.exports = {
    circleci_handleWebhook,
    circleci_getworkflows,
    ping,
}