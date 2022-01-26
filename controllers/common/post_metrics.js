const axios = require("axios");

// module.exports = function send_metrics(params){
function send_metrics(params){
    // ******************************************************   
    // Send Json for Observabiltiy Cloud as export module
    // ******************************************************
    console.log("Array has ", params.length , "\n")
    for (i = 0; i < params.length; i++) {
        console.log("param " + i + " is " + params[i])
        axios
        ({  
            method: "post",
            url: `https://ingest.${process.env.SIGNALFX_REGION}.signalfx.com/v2/datapoint`,
            data: params[i],
            headers: {'X-SF-TOKEN': `${process.env.SIGNALFX_TOKEN}`,
                        'Content-Type': 'application/json' }

        })
        .then(res  => {
            console.log(`signalfx statusCode: ${res.status}`)
        // console.log(res)
        })
        .catch(error => {
            console.error(error)
        })
    }
}

module.exports = { send_metrics };