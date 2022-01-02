const express = require('express')
const router = express.Router()

const {
    circleci_handleWebhook,
    circleci_getworkflows,
    ping,
} = require('../controllers/circleci')

router.post("/ci-webhook", circleci_handleWebhook)
router.get("/ci-getworkflows", circleci_getworkflows)

router.post("/ping", ping)

module.exports = router