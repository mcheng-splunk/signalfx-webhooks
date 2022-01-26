const crypto = require("crypto");
const axios = require("axios");
const tc = require("timezonecomplete");   
const signalfx = require("./common/post_metrics");

axios.defaults.headers.common['Circle-Token'] = process.env.API_KEY || 12345678;

const workflow_events = []

// Github secret authentication
// https://gist.github.com/stigok/57d075c1cf2a609cb758898c0b202428

const github_handleWebhook = async (req, res) => {
    console.log("WEBHOOK RECEIVED");
    console.log(req.headers);
  
    let payload = req.body;
    //console.log(payload);
    //console.log(JSON.stringify(payload) + "\n");
  
    // Check signature to verify authenticity of webhook payload
    // Sample signature: 'github-signature': 'v1=281d91d308ef7a7e8bd7c7606353d5a2dd8d7c5f01143a98c1e8083e04f861ba',

    let event_type = req.headers["x-github-event"];
    let signature = req.headers["x-hub-signature-256"].substring(7)
    const key = "super-secret-1234" // Same string as used in webhook setup
    let testDigest = crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex')

    if (testDigest !== signature) {
        console.log("Webhook signature not matching")
        console.log(`Signature: ${signature}`)
        console.log(`Test digest: ${testDigest}`)
        res.status(403).send("Invalid signature")
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

    if (event_type === 'workflow_run' && payload.action === "completed") {
        console.log("workflow run payload" + JSON.stringify(payload) + "\n");
        console.log("workflow run id", payload.workflow_run.id)
        console.log("workflow run number ", payload.workflow_run.run_number)
        console.log("workflow run conclusion", payload.workflow_run.conclusion)
        console.log("workflow run name", payload.workflow_run.name)
        console.log("wprkflow run repository ", payload.workflow_run.repository.name)
        console.log("workflow run branch", payload.workflow_run.head_branch)
        var workflow_start = new tc.DateTime(payload.workflow_run.run_started_at);
        var workflow_end = new tc.DateTime(payload.workflow_run.updated_at);   
        var workflow_duration = workflow_end.diff(workflow_start);  // unit-aware duration

        var time=Math.floor(Date.now());

        var gauge_github_total_count_pipelines_payload = "{\"gauge\":[{\"metric\":\"gauge.github.total.count.pipelines\",\"value\":" + payload.workflow_run.run_number + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.workflow_run.repository.name + "\",\"project.branch\":\"" + payload.workflow_run.head_branch + "\",\"workflow.name\":\"" + payload.workflow_run.name+ "\"}}]}";

        var cumulative_github_total_time_pipelines_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.github.total.time.pipelines\",\"value\":" + workflow_duration.seconds() + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.workflow_run.repository.name + "\",\"project.branch\":\"" + payload.workflow_run.head_branch + "\",\"workflow.name\":\"" + payload.workflow_run.name + "\",\"workflow.url\":\"" + payload.workflow_run.url + "\"}}]}";
    
    
        console.log("gauge_github_total_count_pipelines_payload --->" + gauge_github_total_count_pipelines_payload +  "\n");
        console.log("cumulative_github_total_time_pipelines_payload --->" + cumulative_github_total_time_pipelines_payload +  "\n");

        payload_array.push(gauge_github_total_count_pipelines_payload);
        payload_array.push(cumulative_github_total_time_pipelines_payload);
    } 

    if (event_type === 'workflow_job' && payload.action === "completed") {
        console.log("workflow job payload" + JSON.stringify(payload) + "\n");
        console.log("workflow job id", payload.workflow_job.id)
        console.log("workflow job run attempt ", payload.workflow_job.run_attempt)
        console.log("workflow job conclusion " , payload.workflow_job.conclusion)
        var workflow_start = new tc.DateTime(payload.workflow_job.started_at);
        var workflow_end = new tc.DateTime(payload.workflow_job.completed_at);   
        var workflow_duration = workflow_end.diff(workflow_start);  // unit-aware duration
        console.log("workflow job duration " + workflow_duration.seconds() + "sec"); // -2
        console.log("workflow job name " , payload.workflow_job.name)
        console.log("workflow job url ", payload.workflow_job.url)
        console.log("workflow job repository ", payload.repository.name)
        var time=Math.floor(Date.now());
        // var gauge_github_total_count_jobs_payload = "{\"gauge\":[{\"metric\":\"gauge.github.total.count.jobs\",\"value\":" + payload.workflow_job.run_attempt + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name + "\",\"workflow.url\":\"" + payload.workflow_job.url + "\",\"job.number\":\"" + payload.workflow_job.run_attempt + "\",\"job.name\":\"" + payload.workflow_job.name + "\",\"job.status\":\"" + payload.workflow_job.conclusion + "\"}}]}";


        // var counter_github_total_time_jobs_payload = "{\"gauge\":[{\"metric\":\"counter.github.total.time.jobs\",\"value\":" + job_duration  + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name  + "\",\"counter.github.total.time.jobs\":\"" + job_duration + "\",\"sf_hires\":\"" +  "1\",\"workflow.url\":\"" + payload.workflow_job.url + "\",\"job.name\":\"" + payload.workflow_job.name + "\",\"job.status\":\"" + payload.workflow_job.conclusion + "\"}}]}";

        // var cumulative_github_total_time_jobs_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.github.total.time.jobs\",\"value\":" + job_duration + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name + "\",\"project.branch\":\"" + payload.pipeline.vcs.branch + "\",\"workflow.name\":\"" + payload.workflow.name + "\",\"workflow.url\":\"" + payload.workflow_job.url + "\",\"job.name\":\"" + payload.workflow_job.name + "\",\"job.status\":\"" + payload.workflow_job.conclusion + "\"}}]}";

        var gauge_github_total_count_jobs_payload = "{\"gauge\":[{\"metric\":\"gauge.github.total.count.jobs\",\"value\":" + payload.workflow_job.run_attempt + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name  + "\",\"workflow.url\":\"" + payload.workflow_job.url + "\",\"job.number\":\"" + payload.workflow_job.run_attempt + "\",\"job.name\":\"" + payload.workflow_job.name + "\",\"job.status\":\"" + payload.workflow_job.conclusion + "\"}}]}";

        var counter_github_total_time_jobs_payload = "{\"gauge\":[{\"metric\":\"counter.github.total.time.jobs\",\"value\":" + workflow_duration.seconds()  + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name   + "\",\"counter.github.total.time.jobs\":\"" + workflow_duration.seconds() + "\",\"workflow.url\":\"" + payload.workflow_job.url + "\",\"job.name\":\"" + payload.workflow_job.name + "\",\"job.status\":\"" + payload.workflow_job.conclusion + "\"}}]}";

        var cumulative_github_total_time_jobs_payload = "{\"cumulative_counter\":[{\"metric\":\"cumulative.github.total.time.jobs\",\"value\":" + workflow_duration.seconds()  + ",\"timestamp\":" + time + ",\"dimensions\":{\"project.name\":\"" + payload.repository.name  + "\",\"workflow.url\":\"" + payload.workflow_job.url + "\",\"job.name\":\"" + payload.workflow_job.name + "\",\"job.status\":\"" + payload.workflow_job.conclusion + "\"}}]}";

        console.log("counter_github_total_time_jobs_payload --->" + counter_github_total_time_jobs_payload +  "\n");
        console.log("gauge_github_total_count_jobs_payload --->" + gauge_github_total_count_jobs_payload +  "\n");
        console.log("cumulative_github_total_time_jobs_payload --->" + cumulative_github_total_time_jobs_payload +  "\n");

        payload_array.push(counter_github_total_time_jobs_payload);
        payload_array.push(gauge_github_total_count_jobs_payload);
        payload_array.push(cumulative_github_total_time_jobs_payload);
    } 
    // Send metrics to O11y 
    signalfx.send_metrics(payload_array)
    


    //console.log("WEBHOOK RECEIVED HEADER CHECK " + github);
    //   process.exit();
    // if (github !== null && typeof github !== "undefined") {
    //   let signature = req.headers["github-signature"].substring(3);
    //   const key = "super-secret-1234"; // Same string as used in webhook setup
    //   let testDigest = crypto
    //     .createHmac("sha256", key)
    //     .update(JSON.stringify(payload))
    //     .digest("hex");
  
    //   if (testDigest !== signature) {
    //     console.log("Webhook signature not matching");
    //     console.log(`Signature: ${signature}`);
    //     console.log(`Test digest: ${testDigest}`);
    //     res.status(403).send("Invalid signature");
    //   }
  
    //   console.log("Webhook signature and test digest are matching.");
    // }
    //await pusher.trigger("workflow-updates", "workflow-completed", payload);
    // workflow_events.unshift(payload);
    // res.send();
  };

const github_getworkflows = async (req, res) => {
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
    github_handleWebhook,
    github_getworkflows,
    ping,
}