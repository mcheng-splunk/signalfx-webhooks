const crypto = require("crypto");
const axios = require("axios");
const tc = require("timezonecomplete");   
const signalfx = require("./common/post_metrics");
const key = require("./common/secret");

axios.defaults.headers.common['Circle-Token'] = process.env.API_KEY || 12345678;

const workflow_events = []

// Github secret authentication
// https://gist.gitlab.com/stigok/57d075c1cf2a609cb758898c0b202428

const gitlab_handleWebhook = async (req, res) => {
    console.log("WEBHOOK RECEIVED");
    console.log(req.headers);
  
    let payload = req.body;
    //console.log(payload);
    //console.log(JSON.stringify(payload) + "\n");
  
    // Check signature to verify authenticity of webhook payload
    // Sample signature: 'gitlab-signature': 'v1=281d91d308ef7a7e8bd7c7606353d5a2dd8d7c5f01143a98c1e8083e04f861ba',

    let event_type = req.headers["x-gitlab-event"];
    let signature = req.headers["x-gitlab-token"]
    //const key = "super-secret-1234" // Same string as used in webhook setup
    let testDigest = crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex')
    // console.log("key", key)
    // console.log("testDigest", testDigest)
    // console.log("signature", signature)   
    if (key !== signature) {
        console.log("Webhook signature not matching")
        // console.log(`Signature: ${signature}`)
        // console.log(`Test digest: ${testDigest}`)
        res.status(403).send("Invalid signature")
        return;
    }

    var payload_array = [];
    console.log("Webhook signature and test digest are matching.")
    
    /* 26 Jan 2020 - Dont need check_run payload as the details can be found in workflow_run payload
    if (event_type === 'check_run' && payload.action === "completed") {
        console.log("check_run payload" + JSON.stringify(payload) + "\n");
        console.log("check_run name: ", payload.check_run.name)
        console.log("check_run status" , payload.check_run.conclusion)
        console.log("check_run Url", payload.check_run.url)
        var workflow_start = new tc.DateTime(payload.check_run.started_at);
        var workflow_end = new tc.DateTime(payload.check_run.completed_at);   
        var workflow_duration = workflow_end.diff(workflow_start);  // unit-aware duration

        console.log("check_run workflow duration " + workflow_duration.seconds() + "sec"); // -2
        console.log("check_run repository", payload.repository.name)
        console.log("check run id", payload.check_run.id)
    } */

    // Jobs pipeline metrics
    if (event_type === 'Job Hook' && (payload.build_status !== "running" && payload.build_status !== "created")) {
        console.log("Job Hook run payload" + JSON.stringify(payload) + "\n");
        console.log("Job Hook run id", payload.build_id)
        console.log("Job Hook build status", payload.build_status)
        console.log("Job Hook build name", payload.build_name)
        console.log("Job Hook build repository ", payload.repository.name)
        console.log("Job Hook build duration ", payload.build_duration)

        var time=Math.floor(Date.now());

   
        var gauge_gitlab_total_count_jobs_payload = "{\"gauge\":[{\"metric\":\"gauge.gitlab.total.count.pipelines\",\"value\":" + payload.build_id + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name + "\",\"project.branch\":\"" + payload.ref + "\",\"workflow.name\":\"" + payload.build_name + "\",\"workflow.status\":\"" + payload.build_status + "\"}}]}";

        var counter_gitlab_total_time_jobs_payload = "{\"gauge\":[{\"metric\":\"cumulative.gitlab.total.time.pipelines\",\"value\":" + payload.build_duration+ ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name + "\",\"project.branch\":\"" + payload.ref + "\",\"workflow.name\":\"" + payload.build_name + "\"}}]}";

        var cumulative_gitlab_total_time_jobs_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.gitlab.total.time.pipelines\",\"value\":" + payload.build_duration+ ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name + "\",\"project.branch\":\"" + payload.ref + "\",\"workflow.name\":\"" + payload.build_name + "\"}}]}";
    
    
        console.log("gauge_gitlab_total_count_jobs_payload --->" + gauge_gitlab_total_count_jobs_payload +  "\n");
        console.log("counter_gitlab_total_time_jobs_payload --->" + counter_gitlab_total_time_jobs_payload +  "\n");
        console.log("cumulative_gitlab_total_time_jobs_payload --->" + cumulative_gitlab_total_time_jobs_payload +  "\n");

        payload_array.push(gauge_gitlab_total_count_jobs_payload);
        payload_array.push(counter_gitlab_total_time_jobs_payload);
        payload_array.push(cumulative_gitlab_total_time_jobs_payload);

    } 

    // Workflow pipeline metrics
    if (event_type === 'Pipeline Hook' && (payload.build_status !== "running" && payload.build_status !== "pending")) {
        console.log("Pipeline Hook payload" + JSON.stringify(payload) + "\n");
        console.log("Pipeline Hook id", payload.object_attributes.id)
        console.log("Pipeline Hook status " , payload.object_attributes.status)
        console.log("Pipeline Hook branch  ", payload.project.default_branch)
        console.log("Pipeline Hook build duration ", payload.object_attributes.duration)
    //     console.log("workflow job name " , payload.workflow_job.name)
        var time=Math.floor(Date.now());
 
        var cumulative_gitlab_total_time_pipelines_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.gitlab.total.count.jobs\",\"value\":" + payload.object_attributes.duration + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.project.default_branch + "\",\"job.status\":\"" + payload.object_attributes.status + "\"}}]}";

        var gauge_gitlab_total_count_pipelines_payload = "{\"gauge\":[{\"metric\":\"gauge.gitlab.total.count.pipelines\",\"value\":" +  payload.object_attributes.id+ ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.project.name + "\",\"project.branch\":\"" + payload.project.default_branch + "\",\"workflow.status\":\"" + payload.object_attributes.status + "\"}}]}";
    
        console.log("gauge_gitlab_total_count_pipelines_payload --->" + gauge_gitlab_total_count_pipelines_payload +  "\n");
        console.log("cumulative_gitlab_total_time_pipelines_payload --->" + cumulative_gitlab_total_time_pipelines_payload +  "\n");

        payload_array.push(gauge_gitlab_total_count_pipelines_payload);
        payload_array.push(cumulative_gitlab_total_time_pipelines_payload);
    
    } 
    // // Send metrics to O11y 
    signalfx.send_metrics(payload_array)

  };

const gitlab_getworkflows = async (req, res) => {
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
    gitlab_handleWebhook,
    gitlab_getworkflows,
    ping,
}